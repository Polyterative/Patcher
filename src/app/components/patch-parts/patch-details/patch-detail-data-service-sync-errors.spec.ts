import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { PatchDetailDataService } from '../patch-detail-data.service';
import { SelectionPanelBridgeService } from '../selection-panel-bridge.service';
import { PatchEditorSortStrategy, LinkedRackPreviewState } from '../patch-editor/patch-editor.types';
import { DbModule, RackedModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { CVConnectionEntity } from 'src/app/models/cv';
import { SupabaseService, CurrentUserModulesOrderConfig } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import {
  cvWithModuleFixture,
  dbModuleFixture,
  patchFixture
} from '../patch-graph/patch-graph-test-fixtures';


describe('PatchDetailDataService - Sync and Error Paths', () => {
  let createdServices: PatchDetailDataService[];
  let createdBridges: SelectionPanelBridgeService[];

  type UserSession = { id: string } | null;
  type PatchDetailResponse = { data: Patch | null };
  type RackDetailResponse = { data: Rack | null };
  type MutationResponse = Record<string, never>;

  interface PatchDetailBackendDouble {
    cacheResetter$: Subject<string[]>;
    auth: {
      getUserSession$: jasmine.Spy<() => Observable<UserSession>>;
    };
    get: {
      patchWithId: jasmine.Spy<(id: number) => Observable<PatchDetailResponse>>;
      currentUserRacks: jasmine.Spy<() => Observable<Rack[]>>;
      rackedModules: jasmine.Spy<(rackId: number) => Observable<RackedModule[]>>;
    };
    GET: {
      currentUserModules: jasmine.Spy<(
        includePrivate: boolean,
        includeWishlist: boolean,
        order?: CurrentUserModulesOrderConfig
      ) => Observable<DbModule[]>>;
      patchConnections: jasmine.Spy<(patchId: number) => Observable<PatchConnection[]>>;
      patchModuleInstances: jasmine.Spy<(patchId: number) => Observable<PatchModuleInstance[]>>;
      rackWithId: jasmine.Spy<(rackId: number) => Observable<RackDetailResponse>>;
      publicRackWithId: jasmine.Spy<(rackId: number) => Observable<RackDetailResponse>>;
    };
    update: {
      patch: jasmine.Spy<(patch: Patch) => Observable<MutationResponse>>;
      patchSilent: jasmine.Spy<(patch: Patch) => Observable<MutationResponse>>;
      patchConnectionsSilent: jasmine.Spy<(connections: PatchConnection[]) => Observable<MutationResponse>>;
      patchConnectionNoteSilent: jasmine.Spy<(connection: PatchConnection) => Observable<MutationResponse>>;
      patchTags: jasmine.Spy<(patchId: number, tags: string[]) => Observable<string[]>>;
    };
    delete: {
      userPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patchConnectionsForPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patchModuleInstancesForPatch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
      patch: jasmine.Spy<(patchId: number) => Observable<MutationResponse>>;
    };
    add: {
      patchModuleInstance: jasmine.Spy<() => Observable<PatchModuleInstance>>;
      patchModuleInstances: jasmine.Spy<() => Observable<PatchModuleInstance[]>>;
    };
  }

  function mutationResponse(): MutationResponse {
    return {};
  }

  function patch(partial: Partial<Patch> = {}): Patch {
    return patchFixture(10, {
      name: 'Patch A',
      description: '',
      public: true,
      author: {id: 'u1', username: 'user'},
      ...partial
    });
  }

  function rack(partial: Partial<Rack> = {}): Rack {
    return {
      id: 42,
      name: 'Public Rack',
      description: '',
      hp: 104,
      rows: 3,
      public: true,
      author: {id: 'u1', username: 'user'},
      locked: false,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      ...partial
    };
  }

  function cv(id: number, kind: 'in' | 'out', moduleId: number, instanceId?: number): CVConnectionEntity {
    return {
      kind,
      cv: {
        ...cvWithModuleFixture(id, moduleId, `M${ moduleId }`, `${ kind }-${ id }`),
        instance_id: instanceId
      }
    };
  }

  function connection(partial: Partial<PatchConnection> = {}): PatchConnection {
    return {
      patch: patch({id: 44}),
      a: cvWithModuleFixture(1, 11, 'A', 'A'),
      b: cvWithModuleFixture(2, 22, 'B', 'B'),
      ...partial
    };
  }

  function rackedModuleFixture(): RackedModule {
    return {
      module: dbModuleFixture(7, 'Maths'),
      rackingData: {
        id: 7001,
        rackid: 42,
        moduleid: 7,
        row: 1,
        column: 4
      }
    };
  }

  function supabaseServiceDouble(backend: PatchDetailBackendDouble): SupabaseService {
    const serviceDouble: SupabaseService = Object.create(SupabaseService.prototype);
    return Object.assign(serviceDouble, backend);
  }

  function build() {
    const bridge = new SelectionPanelBridgeService();
    const backend: PatchDetailBackendDouble = {
      cacheResetter$: new Subject<string[]>(),
      auth: {
        getUserSession$: jasmine.createSpy<() => Observable<UserSession>>('getUserSession$')
          .and.returnValue(of({id: 'u1'}))
      },
      get: {
        patchWithId: jasmine.createSpy<(id: number) => Observable<PatchDetailResponse>>('get.patchWithId')
          .and.returnValue(of({data: patch({id: 44, name: 'Loaded'})})),
        currentUserRacks: jasmine.createSpy<() => Observable<Rack[]>>('get.currentUserRacks')
          .and.returnValue(of([])),
        rackedModules: jasmine.createSpy<(rackId: number) => Observable<RackedModule[]>>('get.rackedModules')
          .and.returnValue(of([]))
      },
      GET: {
        currentUserModules: jasmine.createSpy<(
          includePrivate: boolean,
          includeWishlist: boolean,
          order?: CurrentUserModulesOrderConfig
        ) => Observable<DbModule[]>>('GET.currentUserModules')
          .and.returnValue(of([])),
        patchConnections: jasmine.createSpy<(patchId: number) => Observable<PatchConnection[]>>('GET.patchConnections')
          .and.returnValue(of([])),
        patchModuleInstances: jasmine.createSpy<(patchId: number) => Observable<PatchModuleInstance[]>>('GET.patchModuleInstances')
          .and.returnValue(of([])),
        rackWithId: jasmine.createSpy<(rackId: number) => Observable<RackDetailResponse>>('GET.rackWithId')
          .and.returnValue(of({data: rack()})),
        publicRackWithId: jasmine.createSpy<(rackId: number) => Observable<RackDetailResponse>>('GET.publicRackWithId')
          .and.returnValue(of({data: rack()}))
      },
      update: {
        patch: jasmine.createSpy<(patch: Patch) => Observable<MutationResponse>>('update.patch')
          .and.returnValue(of(mutationResponse())),
        patchSilent: jasmine.createSpy<(patch: Patch) => Observable<MutationResponse>>('update.patchSilent')
          .and.returnValue(of(mutationResponse())),
        patchConnectionsSilent: jasmine.createSpy<(connections: PatchConnection[]) => Observable<MutationResponse>>('update.patchConnectionsSilent')
          .and.returnValue(of(mutationResponse())),
        patchConnectionNoteSilent: jasmine.createSpy<(connection: PatchConnection) => Observable<MutationResponse>>('update.patchConnectionNoteSilent')
          .and.returnValue(of(mutationResponse())),
        patchTags: jasmine.createSpy<(patchId: number, tags: string[]) => Observable<string[]>>('update.patchTags')
          .and.returnValue(of([]))
      },
      delete: {
        userPatch: jasmine.createSpy<(patchId: number) => Observable<MutationResponse>>('delete.userPatch')
          .and.returnValue(of(mutationResponse())),
        patchConnectionsForPatch: jasmine.createSpy<(patchId: number) => Observable<MutationResponse>>('delete.patchConnectionsForPatch')
          .and.returnValue(of(mutationResponse())),
        patchModuleInstancesForPatch: jasmine.createSpy<(patchId: number) => Observable<MutationResponse>>('delete.patchModuleInstancesForPatch')
          .and.returnValue(of(mutationResponse())),
        patch: jasmine.createSpy<(patchId: number) => Observable<MutationResponse>>('delete.patch')
          .and.returnValue(of(mutationResponse()))
      },
      add: {
        patchModuleInstance: jasmine.createSpy<() => Observable<PatchModuleInstance>>('add.patchModuleInstance')
          .and.returnValue(of({id: 1, patch_id: 10, module_id: 9, instance_label: null})),
        patchModuleInstances: jasmine.createSpy<() => Observable<PatchModuleInstance[]>>('add.patchModuleInstances')
          .and.returnValue(of([]))
      }
    };
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({
      afterClosed: () => of({answer: true})
    } as MatDialogRef<unknown, { answer: boolean }>);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const userService = jasmine.createSpyObj<UserManagementService>('UserManagementService', ['ngOnDestroy']);
    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture', 'identify', 'reset']);
    const service = new PatchDetailDataService(
      router,
      snackBar,
      dialog,
      userService,
      supabaseServiceDouble(backend),
      bridge,
      analytics
    );
    createdBridges.push(bridge);
    createdServices.push(service);
    return {service, backend, bridge, router, snackBar};
  }

  beforeEach(() => {
    createdServices = [];
    createdBridges = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
    createdBridges.forEach((bridge) => bridge.ngOnDestroy());
  });
  
  it('removes patch from collection and refreshes current patch', () => {
    const {service, backend, snackBar} = build();
    service.singlePatchData$.next(patch({name: 'Library Patch'}));
    const refreshSpy = spyOn(service.updateSinglePatchData$, 'next').and.callThrough();
    
    service.updateSinglePatchData$.next(44);
    service.removePatchFromCollection$.next(777);
    
    expect(backend.delete.userPatch).toHaveBeenCalledWith(777);
    expect(snackBar.open).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledWith(44);
  });
  
  it('toggles editor panel state through requestPatchEditingToggle$', () => {
    const {service} = build();
    expect(service.patchEditingPanelOpenState$.value).toBeFalse();
    service.requestPatchEditingToggle$.next();
    expect(service.patchEditingPanelOpenState$.value).toBeTrue();
    service.requestPatchEditingToggle$.next();
    expect(service.patchEditingPanelOpenState$.value).toBeFalse();
  });
  
  it('toggles privacy state, persists patch, and emits contextual success messages', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singlePatchData$.next(patch({name: 'Privacy Patch', public: true}));
    
    service.requestPatchPrivacyStatusChange$.next();
    expect(service.isCurrentPatchPrivate$.value).toBeTrue();
    
    service.requestPatchPrivacyStatusChange$.next();
    expect(service.isCurrentPatchPrivate$.value).toBeFalse();
    expect(backend.update.patch).toHaveBeenCalled();
    expect(SharedConstants.successCustom).toHaveBeenCalledTimes(2);
  });
  
  it('refreshes patch when editing panel transitions open -> closed', () => {
    const {service} = build();
    service.singlePatchData$.next(patch({id: 901}));
    const refreshSpy = spyOn(service.updateSinglePatchData$, 'next').and.callThrough();
    
    service.patchEditingPanelOpenState$.next(true);
    service.patchEditingPanelOpenState$.next(false);
    
    expect(refreshSpy).toHaveBeenCalledWith(901);
  });
  
  it('updates form-backed patch fields and handles auto-save failure', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    backend.update.patchSilent.and.returnValue(throwError(() => new Error('save failed')));
    service.singlePatchData$.next(patch({name: 'Old', description: 'Old desc'}));
    
    service.formData.name.control.setValue('New Name');
    service.formData.description.control.setValue('New Desc');
    tick(900);
    
    expect(service.singlePatchData$.value?.name).toBe('New Name');
    expect(service.singlePatchData$.value?.description).toBe('New Desc');
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));

  it('loads owned racks for owner-visible patches and derives linked-rack state', () => {
    const {service, backend} = build();
    backend.get.currentUserRacks.and.returnValue(of([
      rack({id: 42, name: 'Studio Rack'})
    ]));

    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 42}));

    expect(backend.get.currentUserRacks).toHaveBeenCalled();
    expect(service.linkedRackState$.value.kind).toBe('linked');
    expect(service.linkedRackState$.value.statusTone).toBe('positive');
    expect(service.linkedRackState$.value.rackName).toBe('Studio Rack');
  });

  it('loads editor collection modules through the data service and excludes wishlist modules', () => {
    const {service, backend} = build();
    const order = {key: 'collectionUpdated', direction: 'desc'} as const;
    const strategy: PatchEditorSortStrategy = {
      id: 'addedLatest',
      label: 'Recently added',
      backendOrder: order,
      localComparator: () => 0
    };
    backend.GET.currentUserModules.and.returnValue(of([
      {...dbModuleFixture(1, 'Owned'), possessionKind: 'HAS'},
      {...dbModuleFixture(2, 'Wishlist'), possessionKind: 'WANTS'},
      {...dbModuleFixture(3, 'Selling'), possessionKind: 'SELLS'}
    ]));
    let result: DbModule[] = [];

    service.loadEditorCollectionModules$(strategy).subscribe(modules => result = modules);

    expect(backend.GET.currentUserModules).toHaveBeenCalledWith(true, false, order);
    expect(result.map(module => module.id)).toEqual([1, 3]);
  });

  it('loads linked-rack previews through authenticated rack reads and racked modules', () => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: rack({id: 42, name: 'Studio Rack'})}));
    backend.get.rackedModules.and.returnValue(of([
      rackedModuleFixture()
    ]));
    let result: LinkedRackPreviewState | undefined;

    service.loadLinkedRackPreview$(42).subscribe(state => result = state);

    expect(backend.GET.rackWithId).toHaveBeenCalledWith(42);
    expect(backend.GET.publicRackWithId).not.toHaveBeenCalled();
    expect(backend.get.rackedModules).toHaveBeenCalledWith(42);
    expect(result?.kind).toBe('ready');
    expect(result?.moduleCount).toBe(1);
    expect(result?.rows[0].modules[0].trackingId).toBe(7001);
  });

  it('uses public rack reads for anonymous linked-rack previews and reports unavailable failures', () => {
    const {service, backend} = build();
    backend.auth.getUserSession$.and.returnValue(of(null));
    backend.GET.publicRackWithId.and.returnValue(of({data: null}));
    let result: LinkedRackPreviewState | undefined;

    service.loadLinkedRackPreview$(77).subscribe(state => result = state);

    expect(backend.GET.publicRackWithId).toHaveBeenCalledWith(77);
    expect(backend.GET.rackWithId).not.toHaveBeenCalled();
    expect(backend.get.rackedModules).not.toHaveBeenCalledWith(77);
    expect(result?.kind).toBe('unavailable');
  });

  it('derives linked-rack select options from owned racks and syncs the selected rack', () => {
    const {service, backend} = build();
    backend.get.currentUserRacks.and.returnValue(of([
      rack({id: 42, name: 'Studio Rack'}),
      rack({id: 77, name: ''})
    ]));

    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 77}));

    expect(service.linkedRackOptions$.value).toEqual([
      {id: '42', name: 'Studio Rack'},
      {id: '77', name: 'Rack #77'}
    ]);
    expect(`${ service.formData.linkedRack.control.value?.id ?? '' }`).toBe('77');
  });

  it('loads the linked rack through public reads for non-owner patch detail views', () => {
    const {service, backend} = build();
    backend.auth.getUserSession$.and.returnValue(of({id: 'viewer-1'}));
    service.setPublicDetailMode(true);
    service.singlePatchData$.next(patch({
      id: 44,
      author: {id: 'owner-1', username: 'owner'},
      linked_rack_id: 42
    }));

    expect(backend.GET.publicRackWithId).toHaveBeenCalledWith(42);
    expect(service.linkedRackState$.value.kind).toBe('linked');
    expect(service.linkedRackState$.value.rackName).toBe('Public Rack');
  });

  it('marks linked-rack state unavailable with owner recovery copy when the owner cannot load the rack', () => {
    const {service} = build();

    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 404}));

    expect(service.linkedRackState$.value).toEqual(jasmine.objectContaining({
      kind: 'unavailable',
      statusTone: 'warning',
      statusLabel: 'Rack unavailable',
      rackId: 404
    }));
    expect(service.linkedRackState$.value.description).toContain('Choose another rack or clear the link');
  });

  it('marks linked-rack state unavailable with viewer copy when a public patch references an unavailable rack', () => {
    const {service, backend} = build();
    backend.auth.getUserSession$.and.returnValue(of({id: 'viewer-1'}));
    backend.GET.publicRackWithId.and.returnValue(of({data: null}));
    service.setPublicDetailMode(true);

    service.singlePatchData$.next(patch({
      id: 44,
      author: {id: 'owner-1', username: 'owner'},
      linked_rack_id: 404
    }));

    expect(backend.GET.publicRackWithId).toHaveBeenCalledWith(404);
    expect(service.linkedRackState$.value.kind).toBe('unavailable');
    expect(service.linkedRackState$.value.description).toContain('not publicly available');
  });

  it('persists linked-rack changes without touching editor connections', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 10}));
    service.editorConnections$.next([connection({patch: patch({id: 44})})]);

    service.requestLinkedRackChange$.next(42);

    expect(backend.update.patchSilent).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 44,
      linked_rack_id: 42
    }));
    expect(service.singlePatchData$.value?.linked_rack_id).toBe(42);
    expect(service.editorConnections$.value?.length).toBe(1);
  });

  it('does not persist linked-rack changes while switching is blocked by an in-progress selection', () => {
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 10}));
    service.patchEditingPanelOpenState$.next(true);
    service.selectedForConnection$.next({
      a: cv(1, 'out', 11, 101),
      b: null
    });

    service.requestLinkedRackChange$.next(42);

    expect(backend.update.patchSilent).not.toHaveBeenCalledWith(jasmine.objectContaining({
      id: 44,
      linked_rack_id: 42
    }));
    expect(service.singlePatchData$.value?.linked_rack_id).toBe(10);

    service.resetSelectedForConnection$.next();
    service.requestLinkedRackChange$.next(42);

    expect(backend.update.patchSilent).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 44,
      linked_rack_id: 42
    }));
  });

  it('does not clear linked rack while switching is blocked by an in-progress selection', () => {
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 10}));
    service.patchEditingPanelOpenState$.next(true);
    service.selectedForConnection$.next({
      a: cv(1, 'out', 11, 101),
      b: null
    });

    service.clearLinkedRack();

    expect(backend.update.patchSilent).not.toHaveBeenCalledWith(jasmine.objectContaining({
      id: 44,
      linked_rack_id: null
    }));
    expect(service.singlePatchData$.value?.linked_rack_id).toBe(10);
  });

  it('does not retry linked-rack persistence while rollout blocking is active', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    backend.update.patchSilent.and.returnValue(throwError(() => ({
      code: 'PGRST204',
      message: "Column 'linked_rack_id' of relation 'patches' does not exist"
    })));
    service.singlePatchData$.next(patch({id: 44}));

    service.requestLinkedRackChange$.next(42);
    service.requestLinkedRackChange$.next(77);

    expect(backend.update.patchSilent).toHaveBeenCalledTimes(1);
    expect(service.singlePatchData$.value?.linked_rack_id ?? null).toBeNull();
  });

  it('updates linked-rack state after a linked-rack change so dependent previews can reload', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend} = build();
    backend.get.currentUserRacks.and.returnValue(of([
      rack({id: 42, name: 'Studio Rack'})
    ]));
    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 10}));

    service.requestLinkedRackChange$.next(42);

    expect(service.singlePatchData$.value?.linked_rack_id).toBe(42);
    expect(service.linkedRackState$.value.kind).toBe('linked');
    expect(service.linkedRackState$.value.rackId).toBe(42);
  });

  it('clears the linked rack through the dedicated helper', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 10}));

    service.clearLinkedRack();

    expect(backend.update.patchSilent).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 44,
      linked_rack_id: null
    }));
    expect(service.singlePatchData$.value?.linked_rack_id).toBeNull();
  });

  it('blocks linked-rack persistence when the schema is not live yet', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    backend.get.currentUserRacks.and.returnValue(of([
      rack({id: 42, name: 'Studio Rack'})
    ]));
    backend.update.patchSilent.and.returnValue(throwError(() => ({
      code: 'PGRST204',
      message: "Column 'linked_rack_id' of relation 'patches' does not exist"
    })));
    service.singlePatchData$.next(patch({id: 44}));

    service.requestLinkedRackChange$.next(42);

    expect(service.linkedRackPersistenceBlocked$.value).toBeTrue();
    expect(service.linkedRackPersistenceHint$.value).toContain('not available yet');
    expect(service.formData.linkedRack.control.disabled).toBeTrue();
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      jasmine.anything(),
      'Linked rack saving is not available yet in this environment.'
    );
  });

  it('disables linked-rack switching while a connection is pending selection', () => {
    const {service} = build();
    service.patchEditingPanelOpenState$.next(true);

    service.selectedForConnection$.next({
      a: cv(1, 'out', 11, 101),
      b: null
    });

    expect(service.linkedRackSelectionBlocked$.value).toBeTrue();
    expect(service.linkedRackSelectionHint$.value).toBe('Finish or cancel the pending connection before switching the linked rack.');
    expect(service.formData.linkedRack.control.disabled).toBeTrue();

    service.resetSelectedForConnection$.next();

    expect(service.linkedRackSelectionBlocked$.value).toBeFalse();
    expect(service.linkedRackSelectionHint$.value).toBeNull();
    expect(service.formData.linkedRack.control.disabled).toBeFalse();
  });

  it('keeps linked-rack switching disabled while connection changes are still saving', () => {
    const {service, backend} = build();
    const saveSubject = new Subject<MutationResponse>();
    backend.update.patchConnectionsSilent.and.returnValue(saveSubject.asObservable());
    service.patchEditingPanelOpenState$.next(true);
    service.singlePatchData$.next(patch({id: 44}));
    service.editorConnections$.next([connection({patch: patch({id: 44})})]);

    service.requestConnectionDbSync$.next();

    expect(service.linkedRackSelectionBlocked$.value).toBeTrue();
    expect(service.linkedRackSelectionHint$.value).toBe('Wait for pending connection changes to finish saving before switching the linked rack.');
    expect(service.formData.linkedRack.control.disabled).toBeTrue();

    saveSubject.next(mutationResponse());
    saveSubject.complete();

    expect(service.linkedRackSelectionBlocked$.value).toBeFalse();
    expect(service.linkedRackSelectionHint$.value).toBeNull();
    expect(service.formData.linkedRack.control.disabled).toBeFalse();
  });
  
  it('adds a new editor connection, blocks duplicate, and records bridge event', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, bridge} = build();
    service.singlePatchData$.next(patch({id: 55}));
    service.editorConnections$.next([]);
    service.selectedForConnection$.next({
      a: cv(1, 'out', 11, 101),
      b: cv(2, 'in', 22, 202)
    });
    const recordSpy = spyOn(bridge.record$, 'next').and.callThrough();
    
    service.confirmSelectedConnection$.next();
    service.confirmSelectedConnection$.next();
    
    expect(service.editorConnections$.value?.length).toBe(1);
    expect(recordSpy).toHaveBeenCalled();
    expect(SharedConstants.successCustom).toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
  
  it('removes editor connection and syncs empty list by deleting patch connections', () => {
    const {service, backend} = build();
    const removableConnection = connection({
      patch: patch({id: 88}),
      a: cvWithModuleFixture(1, 11, 'A', 'A'),
      b: cvWithModuleFixture(2, 22, 'B', 'B'),
      instance_id_a: 1,
      instance_id_b: 2
    });
    service.singlePatchData$.next(patch({id: 88}));
    service.editorConnections$.next([removableConnection]);
    
    service.removeConnectionFromEditor$.next(removableConnection);
    
    expect(service.editorConnections$.value).toEqual([]);
    expect(backend.delete.patchConnectionsForPatch).toHaveBeenCalledWith(88);
  });
  
  it('handles requestConnectionDbSync$ null guards and both sync error branches', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    const savedConnection = connection({
      patch: patch({id: 90}),
      a: cvWithModuleFixture(1, 11, 'A', 'A'),
      b: cvWithModuleFixture(2, 22, 'B', 'B')
    });
    
    service.singlePatchData$.next(undefined);
    service.editorConnections$.next(null);
    service.requestConnectionDbSync$.next();
    expect(backend.update.patchConnectionsSilent).not.toHaveBeenCalled();
    expect(backend.delete.patchConnectionsForPatch).not.toHaveBeenCalled();
    
    service.singlePatchData$.next(patch({id: 90}));
    service.editorConnections$.next([]);
    backend.delete.patchConnectionsForPatch.and.returnValue(throwError(() => new Error('delete failed')));
    service.requestConnectionDbSync$.next();
    
    service.editorConnections$.next([savedConnection]);
    backend.update.patchConnectionsSilent.and.returnValue(throwError(() => new Error('update failed')));
    service.requestConnectionDbSync$.next();
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(2);
  });
  
  it('handles note auto-save error and delete patch flow', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend, router} = build();
    const conn = connection({
      patch: patch({id: 30}),
      a: cvWithModuleFixture(1, 11, 'A', 'A'),
      b: cvWithModuleFixture(2, 22, 'B', 'B')
    });
    backend.update.patchConnectionNoteSilent.and.returnValue(throwError(() => new Error('note failed')));
    
    service.requestNoteSync$.next(conn);
    service.deletePatch$.next(30);
    
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(backend.delete.patchConnectionsForPatch).toHaveBeenCalledWith(30);
    expect(backend.delete.patchModuleInstancesForPatch).toHaveBeenCalledWith(30);
    expect(backend.delete.patch).toHaveBeenCalledWith(30);
    expect(router.navigate).toHaveBeenCalledWith(['/user/area']);
  });
  
  it('forwards bridge confirm$ events into confirmSelectedConnection$', () => {
    const {service, bridge} = build();
    const confirmSpy = spyOn(service.confirmSelectedConnection$, 'next').and.callThrough();
    
    bridge.confirm$.next();
    
    expect(confirmSpy).toHaveBeenCalled();
  });

  // Regression test: empty-state stale-source bug fix (see TODO.md "No connections" warning).
  // The template must read editorConnections$ (live), not patchConnections$ (backend snapshot).
  // patchConnections$ stays at its backend value while the editor is open; adding a connection
  // updates only editorConnections$, so a template driven by patchConnections$ would never clear
  // the empty state until the editor is closed and the patch reloaded.
  it('updates editorConnections$ while patchConnections$ remains at the loaded backend value after a connection is confirmed', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service} = build();

    // Simulate: backend returned empty connection list on patch load
    service.singlePatchData$.next(patch({id: 77}));
    service.patchConnections$.next([]);
    // editorConnections$ mirrors the backend value
    expect(service.editorConnections$.value?.length).toBe(0);

    service.patchEditingPanelOpenState$.next(true);
    service.selectedForConnection$.next({
      a: cv(10, 'out', 100),
      b: cv(20, 'in', 200)
    });
    service.confirmSelectedConnection$.next();

    // editorConnections$ is now live — reflects the newly added connection
    expect(service.editorConnections$.value?.length).toBe(1);

    // patchConnections$ has NOT been updated (no backend refresh while editor is open)
    // A template using patchConnections$ would still show the empty state — that was the bug
    expect(service.patchConnections$.value?.length).toBe(0);
  });
});
