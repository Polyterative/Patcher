import {
  BehaviorSubject,
  of,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { RackDetailDataService } from './rack-detail-data.service';


describe('RackDetailDataService reactive flows', () => {
  function moduleInRack(id: number, row: number | null, column: number | null, hp = 8, standardId = 0) {
    return {
      module: {
        id: 1000 + id,
        name: `M${ id }`,
        hp,
        standard: {id: standardId}
      },
      rackingData: {
        id,
        rackid: 1,
        row,
        column
      }
    } as any;
  }
  
  function rack(partial: any = {}) {
    return {
      id: 1,
      name: 'Rack',
      rows: 2,
      hp: 84,
      public: true,
      locked: false,
      image: undefined,
      author: {id: 'u1', username: 'user'},
      ...partial
    } as any;
  }
  
  function build() {
    const loggedUser$ = new BehaviorSubject<any>({id: 'u1'});
    const backend = {
      update: {
        rack: jasmine.createSpy('update.rack').and.returnValue(of({data: [{id: 1}]})),
        rackedModules: jasmine.createSpy('update.rackedModules').and.returnValue(of({}))
      },
      delete: {
        rackedModule: jasmine.createSpy('delete.rackedModule').and.returnValue(of({})),
        modulesOfRack: jasmine.createSpy('delete.modulesOfRack').and.returnValue(of({})),
        commentsForRack: jasmine.createSpy('delete.commentsForRack').and.returnValue(of({})),
        userRack: jasmine.createSpy('delete.userRack').and.returnValue(of({}))
      },
      add: {
        rackModule: jasmine.createSpy('add.rackModule').and.returnValue(of({})),
        rack: jasmine.createSpy('add.rack').and.returnValue(of({data: [{id: 99}]}))
      },
      get: {
        rackedModules: jasmine.createSpy('get.rackedModules').and.returnValue(of([]))
      },
      GET: {
        rackWithId: jasmine.createSpy('GET.rackWithId').and.returnValue(of({data: rack()}))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('storage.uploadRackImage').and.returnValue(of('new-image.jpg')),
        deleteRackImage: jasmine.createSpy('storage.deleteRackImage').and.returnValue(of({}))
      }
    };
    const dialog = {
      open: jasmine.createSpy('dialog.open').and.returnValue({
        afterClosed: () => of({answer: true, result: 'Renamed Rack'})
      })
    };
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    
    const service = new RackDetailDataService(
      snackBar,
      {loggedUser$} as any,
      backend as any,
      dialog as any,
      router
    );
    
    return {service, backend, dialog, snackBar, router, loggedUser$};
  }
  
  it('updates row count on add/remove row requests', () => {
    const {service, backend} = build();
    service.singleRackData$.next(rack({id: 7, rows: 2}));
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    
    service.requestAddNewRow$.next();
    service.requestRemoveRow$.next();
    
    expect(backend.update.rack).toHaveBeenCalledTimes(2);
    expect(refreshSpy).toHaveBeenCalledWith(7);
  });
  
  it('toggles privacy and editable state and persists to backend', () => {
    const {service, backend} = build();
    service.singleRackData$.next(rack({public: true, locked: false}));
    
    service.requestRackPrivacyStatusChange$.next();
    expect(service.isCurrentRackPrivate$.value).toBeTrue();
    
    service.requestRackEditableStatusChange$.next();
    expect(service.isCurrentRackEditable$.value).toBeFalse();
    expect(backend.update.rack).toHaveBeenCalled();
  });
  
  it('rejects replace-with-blank when module HP exceeds standard limits', () => {
    const {service, snackBar} = build();
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0, 21, 0)]]);
    service.singleRackData$.next(rack());
    
    service.requestRackedModuleReplaceWithBlank$.next(moduleInRack(1, 0, 0, 21, 0));
    service.requestRackedModuleReplaceWithBlank$.next(moduleInRack(2, 0, 0, 27, 1));
    
    expect(snackBar.open).toHaveBeenCalled();
  });
  
  it('replaces a module with a blank and refreshes rack', () => {
    const {service, backend} = build();
    const currentRack = rack({id: 10});
    service.singleRackData$.next(currentRack);
    service.rowedRackedModules$.next([[moduleInRack(1, 0, 0, 8, 0)]]);
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    
    service.requestRackedModuleReplaceWithBlank$.next(moduleInRack(1, 0, 0, 8, 0));
    
    expect(backend.delete.rackedModule).toHaveBeenCalled();
    expect(backend.add.rackModule).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledWith(10);
  });
  
  it('clears row modules and handles invalid rows', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    const currentRack = rack({rows: 2});
    service.singleRackData$.next(currentRack);
    service.rowedRackedModules$.next([
      [moduleInRack(1, 0, 0), moduleInRack(2, 0, 1)],
      []
    ]);
    
    service.requestRackedModuleRowClearing$.next(moduleInRack(1, 0, 0));
    service.requestRackedModuleRowClearing$.next(moduleInRack(3, 1, 0));
    
    expect(backend.delete.rackedModule).toHaveBeenCalledTimes(2);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
  
  it('loads rack data on updateSingleRackData$ and recalculates ownership/status', () => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: rack({id: 22, public: false, locked: true, author: {id: 'u1'}})}));
    
    service.updateSingleRackData$.next(22);
    
    expect(service.singleRackData$.value?.id).toBe(22);
    expect(service.isCurrentRackPrivate$.value).toBeTrue();
    expect(service.isCurrentRackEditable$.value).toBeFalse();
    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeTrue();
  });
  
  it('handles rack order changes for disallowed and allowed moves', () => {
    const {service, snackBar} = build();
    const currentRack = rack({rows: 1});
    service.singleRackData$.next(currentRack);
    const syncSpy = spyOn(service.requestRackedModulesDbSync$, 'next').and.callThrough();
    
    const unracked = moduleInRack(1, null, null);
    service.rowedRackedModules$.next([[], [unracked]]);
    service.rackOrderChange$.next({
      event: {previousIndex: 0, currentIndex: 0} as any,
      newRow: 2,
      module: unracked
    });
    expect(snackBar.open).toHaveBeenCalled();
    
    const a = moduleInRack(2, 0, 0);
    const b = moduleInRack(3, 0, 1);
    service.rowedRackedModules$.next([[a, b], []]);
    service.rackOrderChange$.next({
      event: {previousIndex: 0, currentIndex: 1} as any,
      newRow: 0,
      module: a
    });
    expect(syncSpy).toHaveBeenCalled();
  });
  
  it('removes, duplicates, and syncs rack modules with error handling', () => {
    spyOn(SharedConstants, 'errorHandlerOperation').and.callFake(() => (source$) => source$);
    const {service, backend} = build();
    service.singleRackData$.next(rack());
    const rows = [[moduleInRack(1, 0, 0), moduleInRack(2, 0, 1)]];
    service.rowedRackedModules$.next(rows as any);
    const syncSpy = spyOn(service.requestRackedModulesDbSync$, 'next').and.callThrough();
    
    service.requestRackedModuleRemoval$.next(rows[0][0]);
    expect(backend.delete.rackedModule).toHaveBeenCalled();
    
    service.requestRackedModuleDuplication$.next(rows[0][0]);
    expect(syncSpy).toHaveBeenCalled();
    
    backend.update.rackedModules.and.returnValue(throwError(() => new Error('sync fail')));
    service.requestRackedModulesDbSync$.next();
    expect(SharedConstants.errorHandlerOperation).toHaveBeenCalled();
  });
  
  it('deletes a rack after confirmation and navigates away', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend, router} = build();
    service.deleteRack$.next({id: 4, name: 'To Delete', image: 'img.jpg'} as any);
    
    expect(backend.delete.modulesOfRack).toHaveBeenCalledWith(4);
    expect(backend.delete.commentsForRack).toHaveBeenCalledWith(4);
    expect(backend.storage.deleteRackImage).toHaveBeenCalledWith('img.jpg');
    expect(backend.delete.userRack).toHaveBeenCalledWith(4);
    expect(router.navigate).toHaveBeenCalledWith(['/user/area']);
  });
  
  it('adds module to rack and emits refresh', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singleRackData$.next(rack({id: 50, name: 'Demo'}));
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    
    service.addModuleToRack$.next({id: 777, name: 'New Module'} as any);
    
    expect(backend.add.rackModule).toHaveBeenCalledWith(777, 50);
    expect(refreshSpy).toHaveBeenCalledWith(50);
  });
});