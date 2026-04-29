import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  BehaviorSubject,
  of
} from 'rxjs';
import { RackModuleAdderDialogComponent } from '../rack-parts/rack-module-adder/rack-module-adder-dialog.component';
import { ModuleDetailDataService } from './module-detail-data.service';


describe('ModuleDetailDataService', () => {
  function build(options: {modulesBySameManufacturer?: any[]} = {}) {
    const loggedUser$ = new BehaviorSubject<any>({id: 'user-1'});
    const baseModule = {
      id: 10,
      name: 'Main Module',
      manufacturerId: 7,
      manufacturer: {name: 'Maker'},
      panels: [{id: 1}, {id: 3}, {id: 2}]
    };
    
    const backend = {
      auth: {
        hasAdminRole$: jasmine.createSpy('hasAdminRole$').and.returnValue(of(false))
      },
      GET: {
        currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of([{id: 50}])),
        moduleWithId: jasmine.createSpy('moduleWithId').and.callFake((id: number) => of({
          data: {...baseModule, id}
        }))
      },
      get: {
        racksWithModule: jasmine.createSpy('racksWithModule').and.returnValue(of({data: [{rack: {id: 1}}]})),
        patchesWithModule: jasmine.createSpy('patchesWithModule').and.returnValue(of([{id: 21}])),
        modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(of(options.modulesBySameManufacturer ?? [
          {id: 10, manufacturerId: 7, manufacturer: {name: 'Maker'}},
          {id: 11, manufacturerId: 7, manufacturer: {name: 'Maker'}}
        ]))
      },
      add: {
        userModule: jasmine.createSpy('userModule').and.returnValue(of({}))
      },
      delete: {
        userModule: jasmine.createSpy('userModule').and.returnValue(of({})),
        modulePanel: jasmine.createSpy('modulePanel').and.returnValue(of({})),
        module: jasmine.createSpy('module').and.returnValue(of({})),
        manufacturer: jasmine.createSpy('manufacturer').and.returnValue(of({}))
      },
      update: {
        module: jasmine.createSpy('module').and.callFake((module: any) => of(module)),
        moduleStoreUrl: jasmine.createSpy('moduleStoreUrl').and.returnValue(of(null))
      }
    };
    
    const snackBar = {
      open: jasmine.createSpy('open')
    };
    const dialog = {} as any;
    const appState = {isDev: true};
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const userService = {loggedUser$};
    
    const service = new ModuleDetailDataService(
      dialog,
      snackBar as any,
      userService as any,
      backend as any,
      appState as any,
      router
    );
    
    return {
      service,
      backend,
      snackBar,
      appState,
      router,
      loggedUser$,
      baseModule
    };
  }
  
  it('loads module details and related data streams on update', fakeAsync(() => {
    const {service, backend} = build();
    
    service.updateSingleModuleData$.next(10);
    tick(260);
    
    expect(backend.GET.moduleWithId).toHaveBeenCalledWith(10);
    expect(backend.get.racksWithModule).toHaveBeenCalledWith(10);
    expect(backend.get.patchesWithModule).toHaveBeenCalledWith(10);
    expect(backend.get.modulesBySameManufacturer).toHaveBeenCalledWith(7);
    
    expect(service.singleModuleData$.value?.id).toBe(10);
    expect(service.racksWithThisModule$.value).toEqual([{id: 1} as any]);
    expect(service.patchesWithThisModule$.value).toEqual([{id: 21} as any]);
    expect(service.modulesBySameManufacturer$.value?.map(x => x.id)).toEqual([11]);
  }));
  
  it('adds and removes module from collection then refreshes current module', () => {
    const {service, backend} = build();
    const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();
    
    service.updateSingleModuleData$.next(10);
    service.addModuleToCollection$.next(10);
    service.removeModuleFromCollection$.next(10);
    
    expect(backend.add.userModule).toHaveBeenCalledWith(10);
    expect(backend.delete.userModule).toHaveBeenCalledWith(10);
    expect(nextSpy).toHaveBeenCalledWith(10);
  });
  
  it('opens module-to-rack dialog and refreshes module data', () => {
    const {service, baseModule} = build();
    const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();
    spyOn(RackModuleAdderDialogComponent, 'open').and.returnValue({
      afterClosed: () => of(true)
    } as any);
    
    service.updateSingleModuleData$.next(10);
    service.requestAddModuleToRack$.next(baseModule as any);
    
    expect(RackModuleAdderDialogComponent.open).toHaveBeenCalled();
    expect(nextSpy).toHaveBeenCalledWith(10);
  });
  
  it('gates deletion and update actions by dev mode', () => {
    const {service, backend, appState, router, baseModule} = build();

    appState.isDev = false;
    service.deleteModule$.next(10);
    service.changeModule$.next({name: 'No change'});
    expect(backend.delete.module).not.toHaveBeenCalled();
    expect(backend.update.module).not.toHaveBeenCalled();

    appState.isDev = true;
    service.singleModuleData$.next(baseModule as any);
    service.deleteModule$.next(10);
    service.changeModule$.next({name: 'Renamed'});

    expect(backend.delete.module).toHaveBeenCalledWith(10);
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'browser']);
    expect(backend.update.module).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 10,
      name: 'Renamed'
    }));
  });

  it('admin role allows delete and update when not in dev mode', () => {
    const {service, backend, appState, router, baseModule} = build();

    appState.isDev = false;
    backend.auth.hasAdminRole$.and.returnValue(of(true));

    service.singleModuleData$.next(baseModule as any);
    service.deleteModule$.next(10);
    service.changeModule$.next({name: 'Admin rename'});

    expect(backend.delete.module).toHaveBeenCalledWith(10);
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'browser']);
    expect(backend.update.module).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 10,
      name: 'Admin rename'
    }));
  });

  it('deletes module and orphan manufacturer together for admin/dev flow', () => {
    const {service, backend, baseModule, router} = build({
      modulesBySameManufacturer: [
        {id: 10, manufacturerId: 7, manufacturer: {name: 'Maker'}}
      ]
    });

    service.deleteModuleAndOrphanManufacturer$.next(baseModule as any);

    expect(backend.get.modulesBySameManufacturer).toHaveBeenCalledWith(7, 0, 20, 'id,manufacturerId');
    expect(backend.delete.module).toHaveBeenCalledWith(10);
    expect(backend.delete.manufacturer).toHaveBeenCalledWith(7);
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'browser']);
  });

  it('keeps manufacturer when other modules still use it', () => {
    const {service, backend, baseModule, router} = build({
      modulesBySameManufacturer: [
        {id: 10, manufacturerId: 7, manufacturer: {name: 'Maker'}},
        {id: 11, manufacturerId: 7, manufacturer: {name: 'Maker'}}
      ]
    });

    service.deleteModuleAndOrphanManufacturer$.next(baseModule as any);

    expect(backend.delete.module).toHaveBeenCalledWith(10);
    expect(backend.delete.manufacturer).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/modules', 'browser']);
  });

  it('non-admin non-dev user cannot delete or update', () => {
    const {service, backend, appState} = build();

    appState.isDev = false;
    backend.auth.hasAdminRole$.and.returnValue(of(false));

    service.deleteModule$.next(10);
    service.changeModule$.next({name: 'Blocked'});

    expect(backend.delete.module).not.toHaveBeenCalled();
    expect(backend.update.module).not.toHaveBeenCalled();
  });
  
  it('toggles editor state and clears pending changes when closing', () => {
    const {service} = build();
    service.moduleEditingPanelOpenState$.next(true);
    service.moduleEditorHasPendingChanges$.next(true);
    
    service.requestModuleEditingToggle$.next();
    expect(service.moduleEditingPanelOpenState$.value).toBeFalse();
    expect(service.moduleEditorHasPendingChanges$.value).toBeFalse();
    
    service.requestModuleEditingToggle$.next();
    expect(service.moduleEditingPanelOpenState$.value).toBeTrue();
  });
  
  it('copies module + manufacturer text to clipboard', () => {
    const {service, baseModule} = build();
    const writeText = jasmine.createSpy('writeText');
    Object.defineProperty(navigator, 'clipboard', {
      value: {writeText},
      configurable: true
    });
    service.singleModuleData$.next(baseModule as any);
    
    service.copyModuleNameAndManufacturer$.next();
    
    expect(writeText).toHaveBeenCalledWith('Main Module by Maker');
  });
  
  it('deletes the panel with highest id when requested in dev mode', () => {
    const {service, backend, baseModule} = build();
    const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();
    service.singleModuleData$.next(baseModule as any);
    
    service.deleteLastPanel$.next(baseModule as any);
    
    expect(backend.delete.modulePanel).toHaveBeenCalledWith({id: 3});
    expect(nextSpy).toHaveBeenCalledWith(10);
  });

  describe('setStoreUrl$', () => {
    it('should call update.moduleStoreUrl with the given id and url', fakeAsync(() => {
      const {service, backend} = build();
      service.singleModuleData$.next({id: 10} as any);

      service.setStoreUrl$.next({id: 10, url: 'https://store.example.com/module'});
      tick();

      expect(backend.update.moduleStoreUrl).toHaveBeenCalledWith(10, 'https://store.example.com/module');
    }));

    it('should call update.moduleStoreUrl with null when clearing', fakeAsync(() => {
      const {service, backend} = build();
      service.singleModuleData$.next({id: 10} as any);

      service.setStoreUrl$.next({id: 10, url: null});
      tick();

      expect(backend.update.moduleStoreUrl).toHaveBeenCalledWith(10, null);
    }));

    it('should trigger a data refresh after store url is set', fakeAsync(() => {
      const {service} = build();
      service.singleModuleData$.next({id: 10} as any);
      const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();

      service.setStoreUrl$.next({id: 10, url: 'https://example.com'});
      tick();

      expect(nextSpy).toHaveBeenCalledWith(10);
    }));
  });
});
