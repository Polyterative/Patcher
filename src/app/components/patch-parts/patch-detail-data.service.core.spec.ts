import {
  BehaviorSubject,
  Observable,
  of,
  Subject
} from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import {
  PatchConnection,
  PatchModuleInstance
} from '../../models/connection';
import { CVConnectionEntity } from '../../models/cv';
import { DbModule } from '../../models/module';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';
import {
  cvWithModuleFixture,
  patchFixture
} from './patch-graph/patch-graph-test-fixtures';
import { CVConnectionState } from './patch-detail-data.models';
import { SelectionPanelBridgeService } from './selection-panel-bridge.service';
import { PatchDetailDataService } from './patch-detail-data.service';
import { DETAIL_ANALYTICS_SURFACES } from '../detail-analytics-surface';


describe('PatchDetailDataService core flows', () => {
  let createdServices: PatchDetailDataService[];
  let createdBridges: SelectionPanelBridgeService[];

  type UserSession = { id: string } | null;
  type PatchDetailResponse = { data: Patch | null };
  type MutationResponse = Record<string, never>;

  interface PatchDetailBackendDouble {
    cacheResetter$: Subject<string[]>;
    auth: {
      getUserSession$: jasmine.Spy<() => Observable<UserSession>>;
    };
    GET: {
      currentUserModules: jasmine.Spy<() => Observable<DbModule[]>>;
      patchConnections: jasmine.Spy<(patchId: number) => Observable<PatchConnection[]>>;
      patchModuleInstances: jasmine.Spy<(patchId: number) => Observable<PatchModuleInstance[]>>;
      publicPatchWithId: jasmine.Spy<(patchId: number) => Observable<PatchDetailResponse>>;
      patchByPublicId: jasmine.Spy<(publicId: string) => Observable<PatchDetailResponse>>;
      publicRackWithId: jasmine.Spy<(rackId: number) => Observable<{ data: Rack | null }>>;
      rackWithId: jasmine.Spy<(rackId: number) => Observable<{ data: Rack | null }>>;
    };
    get: {
      patchWithId: jasmine.Spy<(id: number) => Observable<PatchDetailResponse>>;
      currentUserRacks: jasmine.Spy<() => Observable<Rack[]>>;
      rackedModules: jasmine.Spy<(rackId: number) => Observable<unknown[]>>;
    };
    add: {
      patchModuleInstance: jasmine.Spy<() => Observable<PatchModuleInstance>>;
      patchModuleInstances: jasmine.Spy<() => Observable<PatchModuleInstance[]>>;
    };
    update: {
      patch: jasmine.Spy<(patch: Patch) => Observable<MutationResponse>>;
      patchSilent: jasmine.Spy<(patch: Patch) => Observable<MutationResponse>>;
      patchConnectionsSilent: jasmine.Spy<(connections: PatchConnection[]) => Observable<MutationResponse>>;
      patchConnectionNoteSilent: jasmine.Spy<(connection: PatchConnection) => Observable<MutationResponse>>;
      patchModuleInstanceLabel: jasmine.Spy<() => Observable<PatchModuleInstance>>;
      patchTags: jasmine.Spy<(patchId: number, tags: string[]) => Observable<string[]>>;
    };
    delete: {
      patchConnectionsForPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patchModuleInstancesForPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      userPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patchModuleInstance: jasmine.Spy<(instanceId: number) => Observable<MutationResponse>>;
    };
  }

  interface BuildOptions {
    userSession?: UserSession;
    patchOverride?: Patch | null;
  }

  function mutationResponse(): MutationResponse {
    return {};
  }

  function patch(partial: Partial<Patch> = {}): Patch {
    return patchFixture(1, {
      name: 'Test Patch',
      description: 'A test patch',
      author: {id: 'u1', username: 'patcher'},
      linked_rack_id: null,
      ...partial
    });
  }

  function connection(aId: number, bId: number, instanceA?: number, instanceB?: number): PatchConnection {
    return {
      a: {
        ...cvWithModuleFixture(aId, 10 + aId, `Mod${ aId }`, `CV${ aId }`),
        instance_id: instanceA
      },
      b: {
        ...cvWithModuleFixture(bId, 20 + bId, `Mod${ bId }`, `CV${ bId }`),
        instance_id: instanceB
      },
      patch: patch(),
      instance_id_a: instanceA,
      instance_id_b: instanceB
    };
  }

  function selectedEntity(
    id: number,
    moduleId: number,
    name: string,
    moduleName: string,
    kind: CVConnectionEntity['kind']
  ): CVConnectionEntity {
    return {
      cv: {
        ...cvWithModuleFixture(id, moduleId, moduleName, name),
        instance_id: undefined
      },
      kind
    };
  }

  function selectionState(): CVConnectionState {
    return {
      a: selectedEntity(1, 10, 'Out', 'ModA', 'out'),
      b: selectedEntity(2, 20, 'In', 'ModB', 'in')
    };
  }

  function supabaseServiceDouble(backend: PatchDetailBackendDouble): SupabaseService {
    const serviceDouble: SupabaseService = Object.create(SupabaseService.prototype);
    return Object.assign(serviceDouble, backend);
  }

  function build(options: BuildOptions = {}) {
    const userSession = options.userSession !== undefined ? options.userSession : {id: 'u1'};
    const userSession$ = new BehaviorSubject<UserSession>(userSession);

    const backend: PatchDetailBackendDouble = {
      cacheResetter$: new Subject<string[]>(),
      auth: {
        getUserSession$: jasmine.createSpy<() => Observable<UserSession>>('getUserSession$')
          .and.returnValue(userSession$.asObservable())
      },
      GET: {
        currentUserModules: jasmine.createSpy<() => Observable<DbModule[]>>('currentUserModules')
          .and.returnValue(of([])),
        patchConnections: jasmine.createSpy<(patchId: number) => Observable<PatchConnection[]>>('patchConnections')
          .and.returnValue(of([])),
        patchModuleInstances: jasmine.createSpy<(patchId: number) => Observable<PatchModuleInstance[]>>('patchModuleInstances')
          .and.returnValue(of([])),
        publicPatchWithId: jasmine.createSpy<(patchId: number) => Observable<PatchDetailResponse>>('publicPatchWithId')
          .and.returnValue(of({data: null})),
        patchByPublicId: jasmine.createSpy<(publicId: string) => Observable<PatchDetailResponse>>('patchByPublicId')
          .and.returnValue(of({data: patch({id: 88})})),
        publicRackWithId: jasmine.createSpy<(rackId: number) => Observable<{ data: Rack | null }>>('publicRackWithId')
          .and.returnValue(of({data: null})),
        rackWithId: jasmine.createSpy<(rackId: number) => Observable<{ data: Rack | null }>>('rackWithId')
          .and.returnValue(of({data: null}))
      },
      get: {
        patchWithId: jasmine.createSpy<(id: number) => Observable<PatchDetailResponse>>('patchWithId').and.callFake((id: number) =>
          of({data: 'patchOverride' in options ? options.patchOverride : patch({id})})
        ),
        currentUserRacks: jasmine.createSpy<() => Observable<Rack[]>>('currentUserRacks')
          .and.returnValue(of([])),
        rackedModules: jasmine.createSpy<(rackId: number) => Observable<unknown[]>>('rackedModules')
          .and.returnValue(of([]))
      },
      add: {
        patchModuleInstance: jasmine.createSpy<() => Observable<PatchModuleInstance>>('patchModuleInstance')
          .and.returnValue(of({id: 1, patch_id: 1, module_id: 1, instance_label: null})),
        patchModuleInstances: jasmine.createSpy<() => Observable<PatchModuleInstance[]>>('patchModuleInstances')
          .and.returnValue(of([]))
      },
      update: {
        patch: jasmine.createSpy<(patch: Patch) => Observable<MutationResponse>>('patch')
          .and.returnValue(of(mutationResponse())),
        patchSilent: jasmine.createSpy<(patch: Patch) => Observable<MutationResponse>>('patchSilent')
          .and.returnValue(of(mutationResponse())),
        patchConnectionsSilent: jasmine.createSpy<(connections: PatchConnection[]) => Observable<MutationResponse>>('patchConnectionsSilent')
          .and.returnValue(of(mutationResponse())),
        patchConnectionNoteSilent: jasmine.createSpy<(connection: PatchConnection) => Observable<MutationResponse>>('patchConnectionNoteSilent')
          .and.returnValue(of(mutationResponse())),
        patchModuleInstanceLabel: jasmine.createSpy<() => Observable<PatchModuleInstance>>('patchModuleInstanceLabel')
          .and.returnValue(of({id: 1, patch_id: 1, module_id: 1, instance_label: null})),
        patchTags: jasmine.createSpy<(patchId: number, tags: string[]) => Observable<string[]>>('patchTags')
          .and.returnValue(of([]))
      },
      delete: {
        patchConnectionsForPatch: jasmine.createSpy<(patchId: number) => Observable<MutationResponse>>('patchConnectionsForPatch')
          .and.returnValue(of(mutationResponse())),
        patchModuleInstancesForPatch: jasmine.createSpy<(patchId: number) => Observable<MutationResponse>>('patchModuleInstancesForPatch')
          .and.returnValue(of(mutationResponse())),
        patch: jasmine.createSpy<(patchId: number) => Observable<MutationResponse>>('patch')
          .and.returnValue(of(mutationResponse())),
        userPatch: jasmine.createSpy<(patchId: number) => Observable<MutationResponse>>('userPatch')
          .and.returnValue(of(mutationResponse())),
        patchModuleInstance: jasmine.createSpy<(instanceId: number) => Observable<MutationResponse>>('patchModuleInstance')
          .and.returnValue(of(mutationResponse()))
      }
    };
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({
      afterClosed: () => of({answer: true})
    } as MatDialogRef<unknown, { answer: boolean }>);
    const bridge = new SelectionPanelBridgeService();

    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture', 'identify', 'reset']);
    const userService = jasmine.createSpyObj<UserManagementService>('UserManagementService', ['ngOnDestroy']);
    const service = new PatchDetailDataService(
      router, snackBar, dialog, userService, supabaseServiceDouble(backend), bridge, analytics
    );
    createdServices.push(service);
    createdBridges.push(bridge);

    return {service, backend, router, snackBar, dialog, bridge, userSession$, analytics};
  }

  beforeEach(() => {
    createdServices = [];
    createdBridges = [];
  });

  afterEach(() => {
    createdServices.forEach(s => s.ngOnDestroy());
    createdBridges.forEach(b => b.ngOnDestroy());
  });

  // --- Patch load ---

  it('updateSinglePatchData$ loads patch and calls patchWithId', () => {
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 99, name: 'Old'}));

    service.updateSinglePatchData$.next(1);

    expect(backend.get.patchWithId).toHaveBeenCalledWith(1);
    expect(service.singlePatchData$.value?.id).toBe(1);
    expect(backend.GET.patchConnections).toHaveBeenCalledWith(1);
  });

  it('captures patch.viewed once for a direct public detail load', () => {
    const {service, backend, analytics} = build();
    backend.GET.patchByPublicId.and.returnValue(of({data: patch({id: 44, name: 'Token Patch'})}));

    service.updateSinglePatchByPublicId$.next('aBcD1234_-Xy');

    expect(analytics.capture.calls.allArgs().filter(([eventName]) => eventName === 'patch.viewed')).toEqual([
      ['patch.viewed', {patch_id: 44}]
    ]);
  });

  it('does not capture patch.viewed for a home preview load', () => {
    const {service, analytics} = build();

    service.setDetailAnalyticsSurface(DETAIL_ANALYTICS_SURFACES.homePreview);
    service.updateSinglePatchData$.next(1);

    expect(service.singlePatchData$.value?.id).toBe(1);
    expect(analytics.capture.calls.allArgs().some(([eventName]) => eventName === 'patch.viewed')).toBeFalse();
  });

  it('sets patchDetailUnavailableMessage$ when patch data returns null', () => {
    const {service} = build({patchOverride: null});

    service.updateSinglePatchData$.next(404);

    expect(service.patchDetailUnavailableMessage$.value).not.toBeNull();
  });



  it('updateSinglePatchByPublicId$ loads patch through the token RPC', () => {
    const {service, backend} = build();
    backend.GET.patchByPublicId.and.returnValue(of({data: patch({id: 44, name: 'Token Patch'})}));

    service.updateSinglePatchByPublicId$.next('aBcD1234_-Xy');

    expect(backend.GET.patchByPublicId).toHaveBeenCalledWith('aBcD1234_-Xy');
    expect(service.singlePatchData$.value?.id).toBe(44);
    expect(service.patchDetailUnavailableMessage$.value).toBeNull();
  });

  it('updateSinglePatchByPublicId$ sets unavailable state when no patch is returned', () => {
    const {service, backend} = build();
    backend.GET.patchByPublicId.and.returnValue(of({data: null}));

    service.updateSinglePatchByPublicId$.next('zYxW9876_-Ab');

    expect(backend.GET.patchByPublicId).toHaveBeenCalledWith('zYxW9876_-Ab');
    expect(service.singlePatchData$.value).toBeUndefined();
    expect(service.patchDetailUnavailableMessage$.value).toBeTruthy();
  });

  // --- Privacy ---

  it('isCurrentPatchPrivate$ reflects the public flag of loaded patch', () => {
    const {service} = build();

    service.singlePatchData$.next(patch({public: false}));
    expect(service.isCurrentPatchPrivate$.value).toBeTrue();

    service.singlePatchData$.next(patch({public: true}));
    expect(service.isCurrentPatchPrivate$.value).toBeFalse();
  });

  it('requestPatchPrivacyStatusChange$ toggles public/private and calls backend', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend} = build();
    service.singlePatchData$.next(patch({public: true}));

    service.requestPatchPrivacyStatusChange$.next();

    expect(backend.update.patch).toHaveBeenCalled();
    expect(service.isCurrentPatchPrivate$.value).toBeTrue();
  });

  // --- Editor panel toggle ---

  it('requestPatchEditingToggle$ flips patchEditingPanelOpenState$', () => {
    const {service} = build();
    expect(service.patchEditingPanelOpenState$.value).toBeFalse();

    service.requestPatchEditingToggle$.next();
    expect(service.patchEditingPanelOpenState$.value).toBeTrue();

    service.requestPatchEditingToggle$.next();
    expect(service.patchEditingPanelOpenState$.value).toBeFalse();
  });

  it('does not log a connection selection reset from the initial closed editor panel state', () => {
    const {analytics} = build();

    const resetCalls = analytics.capture.calls.allArgs()
      .filter(([eventName]) => eventName === 'patch.connection_selection_reset');

    expect(resetCalls).toEqual([]);
  });

  it('closing an opened editing panel logs one connection selection reset', () => {
    const {service, analytics} = build();
    service.singlePatchData$.next(patch({id: 5}));

    service.patchEditingPanelOpenState$.next(true);
    service.patchEditingPanelOpenState$.next(false);

    const resetCalls = analytics.capture.calls.allArgs()
      .filter(([eventName]) => eventName === 'patch.connection_selection_reset');
    expect(resetCalls).toEqual([
      ['patch.connection_selection_reset', {patch_id: 5}]
    ]);
  });

  it('closing the editing panel (true→false) triggers patch data refresh', () => {
    const {service} = build();
    const nextSpy = spyOn(service.updateSinglePatchData$, 'next').and.callThrough();
    service.singlePatchData$.next(patch({id: 5}));

    service.patchEditingPanelOpenState$.next(true);
    service.patchEditingPanelOpenState$.next(false);

    expect(nextSpy).toHaveBeenCalledWith(5);
  });

  // --- Connection sync ---

  it('patchConnections$ syncs to editorConnections$ when received from backend', () => {
    const {service} = build();
    const connections = [connection(1, 2)];

    service.patchConnections$.next(connections);

    expect(service.editorConnections$.value).toEqual(connections);
  });

  // --- confirmSelectedConnection$ ---

  it('confirmSelectedConnection$ adds a new connection to editorConnections$', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service} = build();
    service.singlePatchData$.next(patch({id: 1}));
    service.editorConnections$.next([]);

    service.selectedForConnection$.next(selectionState());
    service.confirmSelectedConnection$.next();

    expect(service.editorConnections$.value?.length).toBe(1);
  });

  it('confirmSelectedConnection$ rejects duplicate connections', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service} = build();
    service.singlePatchData$.next(patch({id: 1}));
    const existingConn = connection(1, 2, undefined, undefined);
    service.editorConnections$.next([existingConn]);

    service.selectedForConnection$.next(selectionState());
    service.confirmSelectedConnection$.next();

    expect(service.editorConnections$.value?.length).toBe(1);
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  // --- removeConnectionFromEditor$ ---

  it('removeConnectionFromEditor$ removes the matching connection and triggers sync', () => {
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 1}));
    const conn = connection(1, 2);
    service.editorConnections$.next([conn, connection(3, 4)]);

    service.removeConnectionFromEditor$.next(conn);

    expect(service.editorConnections$.value?.length).toBe(1);
    expect(service.editorConnections$.value?.[0].a.id).toBe(3);
    expect(backend.update.patchConnectionsSilent).toHaveBeenCalled();
  });

  // --- patchConnections$ → editorConnections$ on load ---

  it('patchConnections$ loaded from backend on updateSinglePatchData$', () => {
    const {service, backend} = build();
    const loaded = [connection(5, 6)];
    backend.GET.patchConnections.and.returnValue(of(loaded));

    service.updateSinglePatchData$.next(1);

    expect(backend.GET.patchConnections).toHaveBeenCalledWith(1);
    expect(service.patchConnections$.value?.[0].a.id).toBe(5);
  });
});
