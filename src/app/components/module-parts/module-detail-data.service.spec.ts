import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  BehaviorSubject,
  of,
  ReplaySubject
} from 'rxjs';
import { RackModuleAdderDialogComponent } from '../rack-parts/rack-module-adder/rack-module-adder-dialog.component';
import { ModuleDetailDataService } from './module-detail-data.service';


describe('ModuleDetailDataService', () => {
  function build(options: {modulesBySameManufacturer?: any[]} = {}) {
    const loggedUser$ = new BehaviorSubject<any>({id: 'user-1'});
    const adminRole$ = new ReplaySubject<boolean>(1);
    adminRole$.next(false);
    const baseModule = {
      id: 10,
      name: 'Main Module',
      manufacturerId: 7,
      manufacturer: {name: 'Maker'},
      panels: [{id: 1}, {id: 3}, {id: 2}]
    };
    
    const backend = {
      auth: {
        hasAdminRole$: jasmine.createSpy('hasAdminRole$').and.returnValue(adminRole$.asObservable())
      },
      GET: {
        currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of([{id: 50, possessionKind: 'HAS'}])),
        moduleWithId: jasmine.createSpy('moduleWithId').and.callFake((id: number) => of({
          data: {...baseModule, id}
        })),
        moduleCollectionsForModule: jasmine.createSpy('moduleCollectionsForModule').and.returnValue(of([
          {id: 81, name: 'Ambient starters', public: true, public_id: 'ambient', author: {username: 'Curator'}, module_count: 3}
        ]))
      },
      get: {
        racksWithModule: jasmine.createSpy('racksWithModule').and.returnValue(of({data: [{rack: {id: 1}}]})),
        patchesWithModule: jasmine.createSpy('patchesWithModule').and.returnValue(of([{id: 21}])),
        moduleUsageSummary: jasmine.createSpy('moduleUsageSummary').and.returnValue(of({
          public_rack_count: 1,
          hidden_rack_bucket: 'some',
          public_patch_count: 1,
          hidden_patch_bucket: '5_plus'
        })),
        modulePossessionCounts: jasmine.createSpy('modulePossessionCounts').and.returnValue(of({
          hasCount: 5,
          wantsCount: 2,
          sellsCount: 1
        })),
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
        moduleStoreUrl: jasmine.createSpy('moduleStoreUrl').and.returnValue(of(null)),
        userModulePossession: jasmine.createSpy('userModulePossession').and.returnValue(of(null))
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
      router,
      {capture: () => {}, identify: () => {}, reset: () => {}} as any
    );
    
    return {
      service,
      backend,
      snackBar,
      appState,
      router,
      loggedUser$,
      baseModule,
      adminRole$
    };
  }
  
  it('loads module details and related data streams on update', fakeAsync(() => {
    const {service, backend} = build();
    
    service.updateSingleModuleData$.next(10);
    tick(260);
    
    expect(backend.GET.moduleWithId).toHaveBeenCalledWith(10);
    expect(backend.get.racksWithModule).toHaveBeenCalledWith(10);
    expect(backend.get.patchesWithModule).toHaveBeenCalledWith(10);
    expect(backend.GET.moduleCollectionsForModule).toHaveBeenCalledWith(10);
    expect(backend.get.moduleUsageSummary).toHaveBeenCalledWith(10);
    expect(service.singleModuleData$.value?.id).toBe(10);
    expect(service.racksWithThisModule$.value).toEqual([{id: 1} as any]);
    expect(service.patchesWithThisModule$.value).toEqual([{id: 21} as any]);
    expect(service.collectionsWithThisModule$.value?.[0].name).toBe('Ambient starters');
    expect(service.moduleUsageSummary$.value).toEqual({
      public_rack_count: 1,
      hidden_rack_bucket: 'some',
      public_patch_count: 1,
      hidden_patch_bucket: '5_plus'
    });
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

  it('sets and clears module possession then refreshes current module', () => {
    const {service, backend} = build();
    const nextSpy = spyOn(service.updateSingleModuleData$, 'next').and.callThrough();

    service.updateSingleModuleData$.next(10);
    service.setModulePossession$.next('WANTS');
    service.setModulePossession$.next(null);

    expect(backend.update.userModulePossession).toHaveBeenCalledWith(10, 'WANTS');
    expect(backend.delete.userModule).toHaveBeenCalledWith(10);
    expect(nextSpy).toHaveBeenCalledWith(10);
  });

  it('derives currentModulePossession$ from current user modules and viewed module', () => {
    const {service} = build();
    let latest: string | null | undefined;

    service.currentModulePossession$.subscribe(value => latest = value);
    service.singleModuleData$.next({id: 50} as any);

    expect(latest).toBe('HAS');

    service.userModulesList$.next([{id: 50, possessionKind: 'SELLS'} as any]);
    expect(latest).toBe('SELLS');

    service.userModulesList$.next([{id: 1, possessionKind: 'HAS'} as any]);
    expect(latest).toBeNull();
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

  it('non-admin non-dev user cannot invoke destructive dev helpers', () => {
    const {service, backend, appState, baseModule} = build();

    appState.isDev = false;
    backend.auth.hasAdminRole$.and.returnValue(of(false));
    service.singleModuleData$.next(baseModule as any);

    service.deleteLastPanel$.next(baseModule as any);
    service.deleteModuleAndOrphanManufacturer$.next(baseModule as any);

    expect(backend.delete.modulePanel).not.toHaveBeenCalled();
    expect(backend.get.modulesBySameManufacturer).not.toHaveBeenCalled();
    expect(backend.delete.module).not.toHaveBeenCalled();
    expect(backend.delete.manufacturer).not.toHaveBeenCalled();
  });

  it('updates isAdmin$ when auth session role changes', () => {
    const {service, adminRole$} = build();
    const emitted: boolean[] = [];
    const subscription = service.isAdmin$.subscribe(value => emitted.push(value));

    adminRole$.next(true);
    adminRole$.next(false);

    expect(emitted.slice(-3)).toEqual([false, true, false]);
    subscription.unsubscribe();
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
    const writeText = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
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

  it('setStoreUrl$ silently swallows backend errors without affecting other streams', fakeAsync(() => {
    const {service, backend} = build();
    const {throwError} = require('rxjs');
    backend.update.moduleStoreUrl.and.returnValue(throwError(() => new Error('network error')));
    service.singleModuleData$.next({id: 10} as any);

    expect(() => {
      service.setStoreUrl$.next({id: 10, url: 'https://store.example.com'});
      tick();
    }).not.toThrow();
  }));

  it('closes editor panel when a new user session is emitted while module data is set', () => {
    const {service, loggedUser$, baseModule} = build();
    service.moduleEditingPanelOpenState$.next(true);
    service.singleModuleData$.next(baseModule as any);

    loggedUser$.next({id: 'user-2'} as any);

    expect(service.moduleEditingPanelOpenState$.value).toBeFalse();
  });

  it('starts with expected default state for all subjects', () => {
    const {service} = build();

    expect(service.singleModuleData$.value).toBeNull();
    expect(service.racksWithThisModule$.value).toBeUndefined();
    expect(service.patchesWithThisModule$.value).toBeUndefined();
    expect(service.moduleUsageSummary$.value).toBeUndefined();
    expect(service.moduleEditingPanelOpenState$.value).toBeFalse();
    expect(service.moduleEditorHasPendingChanges$.value).toBeFalse();
    expect(service.isAdmin$.value).toBeFalse();
    // userModulesList$ fires immediately via loggedUser$ BehaviorSubject in constructor
    expect(service.userModulesList$.value).toEqual([{id: 50, possessionKind: 'HAS'} as any]);
  });

  it('clears singleModuleData$ and related streams to undefined when updateSingleModuleData$ fires', fakeAsync(() => {
    const {service, backend} = build();

    const rackEmissions: any[] = [];
    const patchEmissions: any[] = [];
    const summaryEmissions: any[] = [];
    service.racksWithThisModule$.subscribe(v => rackEmissions.push(v));
    service.patchesWithThisModule$.subscribe(v => patchEmissions.push(v));
    service.moduleUsageSummary$.subscribe(v => summaryEmissions.push(v));

    service.updateSingleModuleData$.next(10);
    // The tap() reset emits undefined before the backend response replaces it.
    expect(rackEmissions).toContain(undefined);
    expect(patchEmissions).toContain(undefined);
    expect(summaryEmissions).toContain(undefined);

    tick(260); // clear delays
    expect(service.singleModuleData$.value?.id).toBe(10);
  }));

  it('clears moduleEditorHasPendingChanges$ when updateSingleModuleData$ fires', fakeAsync(() => {
    const {service} = build();
    service.moduleEditorHasPendingChanges$.next(true);

    service.updateSingleModuleData$.next(10);
    tick(260);

    expect(service.moduleEditorHasPendingChanges$.value).toBeFalse();
  }));

  it('loads userModulesList$ when updateSingleModuleData$ fires and user is logged in', fakeAsync(() => {
    const {service, backend} = build();

    service.updateSingleModuleData$.next(10);
    tick(260);

    expect(backend.GET.currentUserModules).toHaveBeenCalledWith(false);
    expect(service.userModulesList$.value).toEqual([{id: 50, possessionKind: 'HAS'} as any]);
  }));

  it('sets userModulesList$ to empty array when user is not logged in', fakeAsync(() => {
    const {service, backend, loggedUser$} = build();
    loggedUser$.next(null);

    const callsBefore = backend.GET.currentUserModules.calls.count();
    service.updateSingleModuleData$.next(10);
    tick(260);

    // With null user, the subscription uses of([]) — no extra call to currentUserModules
    expect(backend.GET.currentUserModules.calls.count()).toBe(callsBefore);
    expect(service.userModulesList$.value).toEqual([]);
  }));
});
