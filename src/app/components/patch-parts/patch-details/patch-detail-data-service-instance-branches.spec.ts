import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  MAX_INSTANCES_PER_MODULE,
  PatchDetailDataService
} from '../patch-detail-data.service';
import { SelectionPanelBridgeService } from '../selection-panel-bridge.service';
import {
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { PatchConnection, PatchModuleInstance } from 'src/app/models/connection';
import { Patch } from 'src/app/models/patch';
import { CVConnectionEntity } from 'src/app/models/cv';
import {
  SimpleUserModel,
  SupabaseService
} from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { PatchDetailDataDependencies } from '../patch-detail-data.context.types';
import {
  relabelExistingInstance$,
  renumberModuleInstances$
} from '../patch-detail-module-instance-operations.bindings';
import {
  cvWithModuleFixture,
  minimalModuleFixture,
  patchFixture
} from '../patch-graph/patch-graph-test-fixtures';


describe('PatchDetailDataService - Instance Edge Branches', () => {
  let createdServices: PatchDetailDataService[];
  let createdBridges: SelectionPanelBridgeService[];

  type PatchDetailResponse = { data: Patch | null; error: null };
  type MutationResponse = { data: null; error: null };
  type UserSession = SimpleUserModel | null;
  type UserProfile = SimpleUserModel & { username: string };
  type PatchModuleInstanceInsert = Pick<PatchModuleInstance, 'patch_id' | 'module_id' | 'instance_label'>;
  type JoinedPatchModuleInstance = PatchModuleInstance & {
    module: {
      id: number;
      name: string;
      manufacturer: {
        name: string;
      };
    };
  };

  interface PatchDetailSupabaseServiceMock {
    cacheResetter$: Subject<string[]>;
    auth: {
      getUserSession$: jasmine.Spy<() => Observable<UserSession>>;
    };
    get: {
      patchWithId: jasmine.Spy<(id: number) => Observable<PatchDetailResponse>>;
      currentUserRacks: jasmine.Spy<() => Observable<unknown[]>>;
    };
    GET: {
      patchConnections: jasmine.Spy<(patchId: number) => Observable<PatchConnection[]>>;
      patchModuleInstances: jasmine.Spy<(patchId: number) => Observable<PatchModuleInstance[]>>;
    };
    update: {
      patch: jasmine.Spy<(patch: Patch) => Observable<{ data: Patch[]; error: null }>>;
      patchSilent: jasmine.Spy<(patch: Patch) => Observable<MutationResponse>>;
      patchConnectionsSilent: jasmine.Spy<(connections: PatchConnection[]) => Observable<MutationResponse>>;
      patchConnectionNoteSilent: jasmine.Spy<(connection: PatchConnection) => Observable<MutationResponse>>;
      patchModuleInstanceLabel: jasmine.Spy<(id: number, label: string | null) => Observable<PatchModuleInstance>>;
    };
    delete: {
      userPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patchConnectionsForPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patchModuleInstancesForPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patchModuleInstance: jasmine.Spy<(instanceId: number) => Observable<MutationResponse>>;
    };
    add: {
      patchModuleInstance: jasmine.Spy<(
        patchId: number,
        moduleId: number,
        label: string | null
      ) => Observable<PatchModuleInstance>>;
      patchModuleInstances: jasmine.Spy<(rows: PatchModuleInstanceInsert[]) => Observable<PatchModuleInstance[]>>;
    };
  }

  interface UserManagementServiceMock {
    loggedUser$: Observable<UserProfile>;
  }

  interface PatchDetailDialogMock {
    open: jasmine.Spy<() => { afterClosed: () => Observable<{ answer: boolean }> }>;
  }

  interface PatchDetailAnalyticsMock {
    capture: jasmine.Spy<(event: string, props?: Record<string, unknown>) => void>;
    identify: jasmine.Spy<(user: SimpleUserModel | null | undefined) => void>;
    reset: jasmine.Spy<() => void>;
  }

  function mutationResponse(): MutationResponse {
    return {data: null, error: null};
  }

  function patch(partial: Partial<Patch> = {}): Patch {
    return patchFixture(100, {
      name: 'Patch',
      description: '',
      public: true,
      author: {id: 'u1', username: 'user'},
      ...partial
    });
  }
  
  function inst(id: number, moduleId: number, label: string | null = null): JoinedPatchModuleInstance {
    return {
      id,
      patch_id: 100,
      module_id: moduleId,
      instance_label: label,
      module: {id: moduleId, name: `M${ moduleId }`, manufacturer: {name: 'Maker'}}
    };
  }

  function cvEntity(id: number, kind: 'in' | 'out', moduleId: number, instanceId: number): CVConnectionEntity {
    return {
      kind,
      cv: {
        ...cvWithModuleFixture(id, moduleId, `M${ moduleId }`, kind === 'out' ? 'A' : 'B'),
        instance_id: instanceId
      }
    };
  }
  
  function build() {
    const bridge = new SelectionPanelBridgeService();
    const backend: PatchDetailSupabaseServiceMock = {
      cacheResetter$: new Subject<string[]>(),
      auth: {
        getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(of({
          id: 'u1',
          email: 'user@example.com',
          created_at: '',
          updated_at: ''
        }))
      },
      get: {
        patchWithId: jasmine.createSpy('get.patchWithId').and.returnValue(of({data: patch()})),
        currentUserRacks: jasmine.createSpy('get.currentUserRacks').and.returnValue(of([]))
      },
      GET: {
        patchConnections: jasmine.createSpy('GET.patchConnections').and.returnValue(of([])),
        patchModuleInstances: jasmine.createSpy('GET.patchModuleInstances').and.returnValue(of([]))
      },
      update: {
        patch: jasmine.createSpy('update.patch').and.returnValue(of({data: [patch()]})),
        patchSilent: jasmine.createSpy('update.patchSilent').and.returnValue(of(mutationResponse())),
        patchConnectionsSilent: jasmine.createSpy('update.patchConnectionsSilent').and.returnValue(of(mutationResponse())),
        patchConnectionNoteSilent: jasmine.createSpy('update.patchConnectionNoteSilent').and.returnValue(of(mutationResponse())),
        patchModuleInstanceLabel: jasmine.createSpy('update.patchModuleInstanceLabel').and.callFake((id: number, label: string | null) => of(inst(id, 1, label)))
      },
      delete: {
        userPatch: jasmine.createSpy('delete.userPatch').and.returnValue(of(mutationResponse())),
        patchConnectionsForPatch: jasmine.createSpy('delete.patchConnectionsForPatch').and.returnValue(of(mutationResponse())),
        patchModuleInstancesForPatch: jasmine.createSpy('delete.patchModuleInstancesForPatch').and.returnValue(of(mutationResponse())),
        patch: jasmine.createSpy('delete.patch').and.returnValue(of(mutationResponse())),
        patchModuleInstance: jasmine.createSpy('delete.patchModuleInstance').and.returnValue(of(mutationResponse()))
      },
      add: {
        patchModuleInstance: jasmine.createSpy('add.patchModuleInstance').and.returnValue(of(inst(501, 9, null))),
        patchModuleInstances: jasmine.createSpy('add.patchModuleInstances').and.returnValue(of([inst(601, 9, '(1)'), inst(602, 9, '(2)')]))
      }
    };
    const userService: UserManagementServiceMock = {
      loggedUser$: of({
        id: 'u1',
        username: 'user',
        email: 'user@example.com',
        created_at: '',
        updated_at: ''
      })
    };
    const dialog: PatchDetailDialogMock = {
      open: jasmine.createSpy('dialog.open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
    const analytics: PatchDetailAnalyticsMock = {
      capture: jasmine.createSpy('analytics.capture'),
      identify: jasmine.createSpy('analytics.identify'),
      reset: jasmine.createSpy('analytics.reset')
    };
    TestBed.configureTestingModule({
      providers: [
        PatchDetailDataService,
        {provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate'])},
        {provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open'])},
        {provide: MatDialog, useValue: dialog},
        {provide: UserManagementService, useValue: userService},
        {provide: SupabaseService, useValue: backend},
        {provide: SelectionPanelBridgeService, useValue: bridge},
        {provide: AnalyticsService, useValue: analytics}
      ]
    });
    const service = TestBed.inject(PatchDetailDataService);
    const deps: PatchDetailDataDependencies = {
      router: TestBed.inject(Router),
      snackBar: TestBed.inject(MatSnackBar),
      dialog: TestBed.inject(MatDialog),
      userService: TestBed.inject(UserManagementService),
      backend: TestBed.inject(SupabaseService),
      bridge,
      analytics: TestBed.inject(AnalyticsService)
    };
    createdBridges.push(bridge);
    createdServices.push(service);
    return {service, backend, deps};
  }

  beforeEach(() => {
    createdServices = [];
    createdBridges = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
    createdBridges.forEach((bridge) => bridge.ngOnDestroy());
    TestBed.resetTestingModule();
  });
  
  it('enforces instance copy limit before insert', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 100}));
    service.patchModuleInstances$.next(
      Array.from({length: MAX_INSTANCES_PER_MODULE}, (_, idx) => inst(1000 + idx, 50, `(${ idx + 1 })`))
    );
    
    service.addModuleInstance$.next(minimalModuleFixture(50, 'Huge'));
    
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(backend.add.patchModuleInstances).not.toHaveBeenCalled();
    expect(backend.add.patchModuleInstance).not.toHaveBeenCalled();
  });
  
  it('handles addModuleInstance$ failures for 0, 1, and 2+ existing copies', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const consoleErrorSpy = spyOn(console, 'error');
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 100}));
    
    backend.add.patchModuleInstances.and.returnValue(throwError(() => new Error('batch fail')));
    service.patchModuleInstances$.next([]);
    service.addModuleInstance$.next(minimalModuleFixture(9, 'A'));
    
    backend.add.patchModuleInstance.and.returnValue(throwError(() => new Error('single fail')));
    service.patchModuleInstances$.next([inst(10, 9, null)]);
    service.addModuleInstance$.next(minimalModuleFixture(9, 'A'));
    
    service.patchModuleInstances$.next([inst(11, 9, '(1)'), inst(12, 9, '(2)')]);
    service.addModuleInstance$.next(minimalModuleFixture(9, 'A'));
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(3);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
  });
  
  it('handles removeModuleInstance$ delete failures', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    const {service, backend} = build();
    const doomed = inst(300, 33, '(1)');
    backend.delete.patchModuleInstance.and.returnValue(throwError(() => new Error('delete fail')));
    service.patchModuleInstances$.next([doomed]);
    
    service.removeModuleInstance$.next(doomed);
    
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(service.patchModuleInstances$.value.length).toBe(1);
  });
  
  it('resets both selected connection sides when removed instance is selected on both', () => {
    const {service} = build();
    const doomed = inst(444, 33, '(1)');
    const resetSelectionSpy = spyOn(service.resetSelectedForConnection$, 'next').and.callThrough();
    
    service.patchModuleInstances$.next([doomed]);
    service.selectedForConnection$.next({
      a: cvEntity(1, 'out', 33, 444),
      b: cvEntity(2, 'in', 33, 444)
    });
    
    service.removeModuleInstance$.next(doomed);
    
    expect(resetSelectionSpy).toHaveBeenCalled();
  });
  
  it('ensureModuleInstance$ covers no-patch, existing, created, and creation-error branches', () => {
    spyOn(console, 'error');
    const {service, backend} = build();
    let emitted: number | undefined;
    service.ensureModuleInstance$(minimalModuleFixture(1)).subscribe(v => emitted = v);
    expect(emitted).toBeUndefined();
    
    service.singlePatchData$.next(patch({id: 100}));
    service.patchModuleInstances$.next([inst(900, 1, null)]);
    service.ensureModuleInstance$(minimalModuleFixture(1)).subscribe(v => emitted = v);
    expect(emitted).toBe(900);
    
    service.patchModuleInstances$.next([]);
    backend.add.patchModuleInstance.and.returnValue(of(inst(901, 1, null)));
    service.ensureModuleInstance$(minimalModuleFixture(1)).subscribe(v => emitted = v);
    expect(emitted).toBe(901);
    expect(service.patchModuleInstances$.value.find(x => x.id === 901)).toBeTruthy();
    
    backend.add.patchModuleInstance.and.returnValue(throwError(() => new Error('create fail')));
    emitted = undefined;
    service.ensureModuleInstance$(minimalModuleFixture(2)).subscribe(v => emitted = v);
    expect(emitted).toBeUndefined();
  });
  
  it('covers relabelExistingInstance$ catch branch and no-op branch', () => {
    spyOn(console, 'error');
    const {service, backend, deps} = build();
    service.patchModuleInstances$.next([inst(1, 77, '(1)')]);
    
    let result: PatchModuleInstance | null | 'unset' = 'unset';
    relabelExistingInstance$(service, deps, [inst(1, 77, '(1)')], 77, '(1)').subscribe(v => result = v);
    expect(result).toBeNull();
    
    backend.update.patchModuleInstanceLabel.and.returnValue(throwError(() => new Error('relabel fail')));
    result = 'unset';
    relabelExistingInstance$(service, deps, [inst(1, 77, null)], 77, '(1)').subscribe(v => result = v);
    expect(result).toBeNull();
  });
  
  it('covers renumberModuleInstances$ single-label clear error and multi-update error fallback', () => {
    const consoleErrorSpy = spyOn(console, 'error');
    const {service, backend, deps} = build();
    service.patchModuleInstances$.next([inst(5, 88, '(1)')]);
    backend.update.patchModuleInstanceLabel.and.returnValue(throwError(() => new Error('clear fail')));
    
    let done1: null | 'unset' = 'unset';
    renumberModuleInstances$(service, deps, 88).subscribe(v => done1 = v);
    expect(done1).toBeNull();
    
    backend.update.patchModuleInstanceLabel.and.returnValue(throwError(() => new Error('renumber fail')));
    service.patchModuleInstances$.next([inst(10, 99, '(9)'), inst(11, 99, null), inst(12, 99, '(3)')]);
    
    let done2: null | 'unset' = 'unset';
    renumberModuleInstances$(service, deps, 99).subscribe(v => done2 = v);
    expect(done2).toBeNull();
    expect(service.patchModuleInstances$.value.map(x => x.instance_label)).toEqual(['(1)', '(2)', '(3)']);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
  });
});
