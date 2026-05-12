import {
  MAX_INSTANCES_PER_MODULE,
  PatchDetailDataService
} from '../patch-detail-data.service';
import { SelectionPanelBridgeService } from '../selection-panel-bridge.service';
import {
  of,
  Subject,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';


describe('PatchDetailDataService - Instance Edge Branches', () => {
  function patch(partial: any = {}) {
    return {
      id: 100,
      name: 'Patch',
      description: '',
      public: true,
      author: {id: 'u1', username: 'user'},
      ...partial
    } as any;
  }
  
  function inst(id: number, moduleId: number, label: string | null = null) {
    return {
      id,
      patch_id: 100,
      module_id: moduleId,
      instance_label: label,
      module: {id: moduleId, name: `M${ moduleId }`, manufacturer: {name: 'Maker'}}
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
        patchWithId: jasmine.createSpy('get.patchWithId').and.returnValue(of({data: patch()})),
        currentUserRacks: jasmine.createSpy('get.currentUserRacks').and.returnValue(of([]))
      },
      GET: {
        patchConnections: jasmine.createSpy('GET.patchConnections').and.returnValue(of([])),
        patchModuleInstances: jasmine.createSpy('GET.patchModuleInstances').and.returnValue(of([]))
      },
      update: {
        patch: jasmine.createSpy('update.patch').and.returnValue(of({data: [patch()]})),
        patchSilent: jasmine.createSpy('update.patchSilent').and.returnValue(of({})),
        patchConnectionsSilent: jasmine.createSpy('update.patchConnectionsSilent').and.returnValue(of({})),
        patchConnectionNoteSilent: jasmine.createSpy('update.patchConnectionNoteSilent').and.returnValue(of({})),
        patchModuleInstanceLabel: jasmine.createSpy('update.patchModuleInstanceLabel').and.callFake((id: number, label: string | null) => of(inst(id, 1, label)))
      },
      delete: {
        userPatch: jasmine.createSpy('delete.userPatch').and.returnValue(of({})),
        patchConnectionsForPatch: jasmine.createSpy('delete.patchConnectionsForPatch').and.returnValue(of({})),
        patchModuleInstancesForPatch: jasmine.createSpy('delete.patchModuleInstancesForPatch').and.returnValue(of({})),
        patch: jasmine.createSpy('delete.patch').and.returnValue(of({})),
        patchModuleInstance: jasmine.createSpy('delete.patchModuleInstance').and.returnValue(of({}))
      },
      add: {
        patchModuleInstance: jasmine.createSpy('add.patchModuleInstance').and.returnValue(of(inst(501, 9, null))),
        patchModuleInstances: jasmine.createSpy('add.patchModuleInstances').and.returnValue(of([inst(601, 9, '(1)'), inst(602, 9, '(2)')]))
      }
    };
    const service = new PatchDetailDataService(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('MatSnackBar', ['open']),
      {
        open: jasmine.createSpy('dialog.open').and.returnValue({
          afterClosed: () => of({answer: true})
        })
      } as any,
      {loggedUser$: of({id: 'u1'})} as any,
      backend as any,
      bridge
    );
    return {service, backend};
  }
  
  it('enforces instance copy limit before insert', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 100}));
    service.patchModuleInstances$.next(
      Array.from({length: MAX_INSTANCES_PER_MODULE}, (_, idx) => inst(1000 + idx, 50, `(${ idx + 1 })`))
    );
    
    service.addModuleInstance$.next({id: 50, name: 'Huge'} as any);
    
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(backend.add.patchModuleInstances).not.toHaveBeenCalled();
    expect(backend.add.patchModuleInstance).not.toHaveBeenCalled();
  });
  
  it('handles addModuleInstance$ failures for 0, 1, and 2+ existing copies', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singlePatchData$.next(patch({id: 100}));
    
    backend.add.patchModuleInstances.and.returnValue(throwError(() => new Error('batch fail')));
    service.patchModuleInstances$.next([]);
    service.addModuleInstance$.next({id: 9, name: 'A'} as any);
    
    backend.add.patchModuleInstance.and.returnValue(throwError(() => new Error('single fail')));
    service.patchModuleInstances$.next([inst(10, 9, null)]);
    service.addModuleInstance$.next({id: 9, name: 'A'} as any);
    
    service.patchModuleInstances$.next([inst(11, 9, '(1)'), inst(12, 9, '(2)')]);
    service.addModuleInstance$.next({id: 9, name: 'A'} as any);
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(3);
  });
  
  it('handles removeModuleInstance$ delete failures', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
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
      a: {
        kind: 'out',
        cv: {
          id: 1,
          name: 'A',
          module: {id: 33, name: 'M33'},
          instance_id: 444
        }
      } as any,
      b: {
        kind: 'in',
        cv: {
          id: 2,
          name: 'B',
          module: {id: 33, name: 'M33'},
          instance_id: 444
        }
      } as any
    } as any);
    
    service.removeModuleInstance$.next(doomed);
    
    expect(resetSelectionSpy).toHaveBeenCalled();
  });
  
  it('ensureModuleInstance$ covers no-patch, existing, created, and creation-error branches', () => {
    const {service, backend} = build();
    let emitted: number | undefined;
    service.ensureModuleInstance$({id: 1} as any).subscribe(v => emitted = v);
    expect(emitted).toBeUndefined();
    
    service.singlePatchData$.next(patch({id: 100}));
    service.patchModuleInstances$.next([inst(900, 1, null)]);
    service.ensureModuleInstance$({id: 1} as any).subscribe(v => emitted = v);
    expect(emitted).toBe(900);
    
    service.patchModuleInstances$.next([]);
    backend.add.patchModuleInstance.and.returnValue(of(inst(901, 1, null)));
    service.ensureModuleInstance$({id: 1} as any).subscribe(v => emitted = v);
    expect(emitted).toBe(901);
    expect(service.patchModuleInstances$.value.find(x => x.id === 901)).toBeTruthy();
    
    backend.add.patchModuleInstance.and.returnValue(throwError(() => new Error('create fail')));
    emitted = undefined;
    service.ensureModuleInstance$({id: 2} as any).subscribe(v => emitted = v);
    expect(emitted).toBeUndefined();
  });
  
  it('covers relabelExistingInstance$ catch branch and no-op branch', () => {
    const {service, backend} = build();
    service.patchModuleInstances$.next([inst(1, 77, '(1)')]);
    
    let result: any = 'unset';
    (service as any).relabelExistingInstance$([inst(1, 77, '(1)')], 77, '(1)').subscribe((v: any) => result = v);
    expect(result).toBeNull();
    
    backend.update.patchModuleInstanceLabel.and.returnValue(throwError(() => new Error('relabel fail')));
    result = 'unset';
    (service as any).relabelExistingInstance$([inst(1, 77, null)], 77, '(1)').subscribe((v: any) => result = v);
    expect(result).toBeNull();
  });
  
  it('covers renumberModuleInstances$ single-label clear error and multi-update error fallback', () => {
    const {service, backend} = build();
    service.patchModuleInstances$.next([inst(5, 88, '(1)')]);
    backend.update.patchModuleInstanceLabel.and.returnValue(throwError(() => new Error('clear fail')));
    
    let done1: any = 'unset';
    (service as any).renumberModuleInstances$(88).subscribe((v: any) => done1 = v);
    expect(done1).toBeNull();
    
    backend.update.patchModuleInstanceLabel.and.returnValue(throwError(() => new Error('renumber fail')));
    service.patchModuleInstances$.next([inst(10, 99, '(9)'), inst(11, 99, null), inst(12, 99, '(3)')]);
    
    let done2: any = 'unset';
    (service as any).renumberModuleInstances$(99).subscribe((v: any) => done2 = v);
    expect(done2).toBeNull();
    expect(service.patchModuleInstances$.value.map(x => x.instance_label)).toEqual(['(1)', '(2)', '(3)']);
  });
});
