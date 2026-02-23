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
  function build() {
    const loggedUser$ = new BehaviorSubject<any>({id: 'user-1'});
    const baseModule = {
      id: 10,
      name: 'Main Module',
      manufacturerId: 7,
      manufacturer: {name: 'Maker'},
      panels: [{id: 1}, {id: 3}, {id: 2}]
    };
    
    const backend = {
      GET: {
        currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of([{id: 50}])),
        moduleWithId: jasmine.createSpy('moduleWithId').and.callFake((id: number) => of({
          data: {...baseModule, id}
        }))
      },
      get: {
        racksWithModule: jasmine.createSpy('racksWithModule').and.returnValue(of({data: [{rack: {id: 1}}]})),
        patchesWithModule: jasmine.createSpy('patchesWithModule').and.returnValue(of([{id: 21}])),
        modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(of([
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
        module: jasmine.createSpy('module').and.returnValue(of({}))
      },
      update: {
        module: jasmine.createSpy('module').and.callFake((module: any) => of(module))
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
});