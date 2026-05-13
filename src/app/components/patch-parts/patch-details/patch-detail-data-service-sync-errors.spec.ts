import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  of,
  Subject,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { PatchDetailDataService } from '../patch-detail-data.service';
import { SelectionPanelBridgeService } from '../selection-panel-bridge.service';


describe('PatchDetailDataService - Sync and Error Paths', () => {
  let createdServices: PatchDetailDataService[];
  let createdBridges: SelectionPanelBridgeService[];

  function patch(partial: any = {}) {
    return {
      id: 10,
      name: 'Patch A',
      description: '',
      public: true,
      author: {id: 'u1', username: 'user'},
      ...partial
    } as any;
  }
  
  function cv(id: number, kind: 'in' | 'out', moduleId: number, instanceId?: number) {
    return {
      kind,
      cv: {
        id,
        name: `${ kind }-${ id }`,
        module: {id: moduleId, name: `M${ moduleId }`},
        instance_id: instanceId
      }
    } as any;
  }
  
  function build() {
    const bridge = new SelectionPanelBridgeService();
    const backend = {
      cacheResetter$: new Subject<any>(),
      auth: {
        getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(of({id: 'u1'}))
      },
      get: {
        patchWithId: jasmine.createSpy('get.patchWithId').and.returnValue(of({data: patch({id: 44, name: 'Loaded'})})),
        currentUserRacks: jasmine.createSpy('get.currentUserRacks').and.returnValue(of([]))
      },
      GET: {
        patchConnections: jasmine.createSpy('GET.patchConnections').and.returnValue(of([])),
        patchModuleInstances: jasmine.createSpy('GET.patchModuleInstances').and.returnValue(of([])),
        rackWithId: jasmine.createSpy('GET.rackWithId').and.returnValue(of({data: {id: 42, name: 'Public Rack'}})),
        publicRackWithId: jasmine.createSpy('GET.publicRackWithId').and.returnValue(of({data: {id: 42, name: 'Public Rack'}}))
      },
      update: {
        patch: jasmine.createSpy('update.patch').and.returnValue(of({data: [patch()]})),
        patchSilent: jasmine.createSpy('update.patchSilent').and.returnValue(of({})),
        patchConnectionsSilent: jasmine.createSpy('update.patchConnectionsSilent').and.returnValue(of({})),
        patchConnectionNoteSilent: jasmine.createSpy('update.patchConnectionNoteSilent').and.returnValue(of({}))
      },
      delete: {
        userPatch: jasmine.createSpy('delete.userPatch').and.returnValue(of({})),
        patchConnectionsForPatch: jasmine.createSpy('delete.patchConnectionsForPatch').and.returnValue(of({})),
        patchModuleInstancesForPatch: jasmine.createSpy('delete.patchModuleInstancesForPatch').and.returnValue(of({})),
        patch: jasmine.createSpy('delete.patch').and.returnValue(of({}))
      },
      add: {
        patchModuleInstance: jasmine.createSpy('add.patchModuleInstance').and.returnValue(of({id: 1, module_id: 9})),
        patchModuleInstances: jasmine.createSpy('add.patchModuleInstances').and.returnValue(of([]))
      }
    };
    const dialog = {
      open: jasmine.createSpy('dialog.open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const service = new PatchDetailDataService(
      router,
      snackBar,
      dialog as any,
      {loggedUser$: of({id: 'u1'})} as any,
      backend as any,
      bridge
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
      {id: 42, name: 'Studio Rack'} as any
    ]));

    service.singlePatchData$.next(patch({id: 44, linked_rack_id: 42}));

    expect(backend.get.currentUserRacks).toHaveBeenCalled();
    expect(service.linkedRackState$.value.kind).toBe('linked');
    expect(service.linkedRackState$.value.statusTone).toBe('positive');
    expect(service.linkedRackState$.value.rackName).toBe('Studio Rack');
  });

  it('derives linked-rack select options from owned racks and syncs the selected rack', () => {
    const {service, backend} = build();
    backend.get.currentUserRacks.and.returnValue(of([
      {id: 42, name: 'Studio Rack'} as any,
      {id: 77, name: ''} as any
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
    service.editorConnections$.next([{a: {id: 1}, b: {id: 2}, patch: patch({id: 44})} as any]);

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
      {id: 42, name: 'Studio Rack'} as any
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
      {id: 42, name: 'Studio Rack'} as any
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
    const saveSubject = new Subject<void>();
    backend.update.patchConnectionsSilent.and.returnValue(saveSubject.asObservable());
    service.patchEditingPanelOpenState$.next(true);
    service.singlePatchData$.next(patch({id: 44}));
    service.editorConnections$.next([{a: {id: 1}, b: {id: 2}, patch: patch({id: 44})} as any]);

    service.requestConnectionDbSync$.next();

    expect(service.linkedRackSelectionBlocked$.value).toBeTrue();
    expect(service.linkedRackSelectionHint$.value).toBe('Wait for pending connection changes to finish saving before switching the linked rack.');
    expect(service.formData.linkedRack.control.disabled).toBeTrue();

    saveSubject.next();
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
    const connection = {
      patch: patch({id: 88}),
      a: {id: 1, module: {name: 'A'}},
      b: {id: 2, module: {name: 'B'}},
      instance_id_a: 1,
      instance_id_b: 2
    } as any;
    service.singlePatchData$.next(patch({id: 88}));
    service.editorConnections$.next([connection]);
    
    service.removeConnectionFromEditor$.next(connection);
    
    expect(service.editorConnections$.value).toEqual([]);
    expect(backend.delete.patchConnectionsForPatch).toHaveBeenCalledWith(88);
  });
  
  it('handles requestConnectionDbSync$ null guards and both sync error branches', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    const connection = {
      patch: patch({id: 90}),
      a: {id: 1, module: {name: 'A'}},
      b: {id: 2, module: {name: 'B'}}
    } as any;
    
    service.singlePatchData$.next(undefined);
    service.editorConnections$.next(null);
    service.requestConnectionDbSync$.next();
    expect(backend.update.patchConnectionsSilent).not.toHaveBeenCalled();
    expect(backend.delete.patchConnectionsForPatch).not.toHaveBeenCalled();
    
    service.singlePatchData$.next(patch({id: 90}));
    service.editorConnections$.next([]);
    backend.delete.patchConnectionsForPatch.and.returnValue(throwError(() => new Error('delete failed')));
    service.requestConnectionDbSync$.next();
    
    service.editorConnections$.next([connection]);
    backend.update.patchConnectionsSilent.and.returnValue(throwError(() => new Error('update failed')));
    service.requestConnectionDbSync$.next();
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(2);
  });
  
  it('handles note auto-save error and delete patch flow', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend, router} = build();
    const conn = {patch: patch({id: 30}), a: {id: 1}, b: {id: 2}} as any;
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
});
