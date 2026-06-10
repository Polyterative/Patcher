import {
  BehaviorSubject,
  of,
  Subject
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SelectionPanelBridgeService } from './selection-panel-bridge.service';
import { PatchDetailDataService } from './patch-detail-data.service';


describe('PatchDetailDataService core flows', () => {
  let createdServices: PatchDetailDataService[];
  let createdBridges: SelectionPanelBridgeService[];

  function patch(partial: any = {}) {
    return {
      id: 1,
      name: 'Test Patch',
      description: 'A test patch',
      public: true,
      tags: [],
      author: {id: 'u1'},
      linked_rack_id: null,
      ...partial
    } as any;
  }

  function connection(aId: number, bId: number, instanceA?: number, instanceB?: number) {
    return {
      a: {id: aId, name: `CV${ aId }`, module: {id: 10 + aId, name: `Mod${ aId }`}},
      b: {id: bId, name: `CV${ bId }`, module: {id: 20 + bId, name: `Mod${ bId }`}},
      patch: patch(),
      instance_id_a: instanceA,
      instance_id_b: instanceB
    } as any;
  }

  function build(options: {userSession?: any; patchOverride?: any} = {}) {
    const userSession = options.userSession !== undefined ? options.userSession : {id: 'u1'};
    const userSession$ = new BehaviorSubject<any>(userSession);

    const backend = {
      cacheResetter$: new Subject<string[]>(),
      auth: {
        getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(userSession$.asObservable())
      },
      GET: {
        patchConnections: jasmine.createSpy('patchConnections').and.returnValue(of([])),
        patchModuleInstances: jasmine.createSpy('patchModuleInstances').and.returnValue(of([])),
        publicPatchWithId: jasmine.createSpy('publicPatchWithId').and.returnValue(of({data: null})),
        patchByPublicId: jasmine.createSpy('patchByPublicId').and.returnValue(of({data: patch({id: 88})}))
      },
      get: {
        patchWithId: jasmine.createSpy('patchWithId').and.callFake((id: number) =>
          of({data: 'patchOverride' in options ? options.patchOverride : patch({id})})
        ),
        currentUserRacks: jasmine.createSpy('currentUserRacks').and.returnValue(of([]))
      },
      update: {
        patch: jasmine.createSpy('patch').and.returnValue(of({})),
        patchSilent: jasmine.createSpy('patchSilent').and.returnValue(of({})),
        patchConnectionsSilent: jasmine.createSpy('patchConnectionsSilent').and.returnValue(of({})),
        patchConnectionNoteSilent: jasmine.createSpy('patchConnectionNoteSilent').and.returnValue(of({}))
      },
      delete: {
        patchConnectionsForPatch: jasmine.createSpy('patchConnectionsForPatch').and.returnValue(of({})),
        patchModuleInstancesForPatch: jasmine.createSpy('patchModuleInstancesForPatch').and.returnValue(of({})),
        patch: jasmine.createSpy('patch').and.returnValue(of({})),
        userPatch: jasmine.createSpy('userPatch').and.returnValue(of({})),
        patchModuleInstance: jasmine.createSpy('patchModuleInstance').and.returnValue(of({}))
      }
    };
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
    const bridge = new SelectionPanelBridgeService();

    const service = new PatchDetailDataService(
      router, snackBar, dialog as any, {} as any, backend as any, bridge, {capture: () => {}, identify: () => {}, reset: () => {}} as any
    );
    createdServices.push(service);
    createdBridges.push(bridge);

    return {service, backend, router, snackBar, dialog, bridge, userSession$};
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

    service.selectedForConnection$.next({
      a: {cv: {id: 1, name: 'Out', module: {id: 10, name: 'ModA'}, instance_id: undefined}, kind: 'out'} as any,
      b: {cv: {id: 2, name: 'In', module: {id: 20, name: 'ModB'}, instance_id: undefined}, kind: 'in'} as any
    });
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

    service.selectedForConnection$.next({
      a: {cv: {id: 1, name: 'Out', module: {id: 10, name: 'ModA'}, instance_id: undefined}, kind: 'out'} as any,
      b: {cv: {id: 2, name: 'In', module: {id: 20, name: 'ModB'}, instance_id: undefined}, kind: 'in'} as any
    });
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
