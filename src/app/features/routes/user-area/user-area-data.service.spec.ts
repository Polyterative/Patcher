import { of } from 'rxjs';
import { UserAreaDataService } from './user-area-data.service';
import { PatchCreatorComponent } from 'src/app/components/patch-parts/patch-creator/patch-creator.component';
import { RackCreatorComponent } from 'src/app/components/rack-parts/rack-creator/rack-creator.component';


describe('UserAreaDataService', () => {
  function build() {
    const backend = {
      GET: {
        currentUserComments: jasmine.createSpy('currentUserComments').and.returnValue(of([{id: 1}])),
        currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of([
          {id: 2, name: 'B module', manualURL: 'https://b'},
          {id: 1, name: 'A module', manualURL: 'https://a'},
          {id: 3, name: 'No Manual', manualURL: ''}
        ]))
      },
      get: {
        currentUserPatches: jasmine.createSpy('currentUserPatches').and.returnValue(of([{id: 10}])),
        currentUserRacks: jasmine.createSpy('currentUserRacks').and.returnValue(of([{id: 20}]))
      }
    };
    
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of(true)
      })
    };
    
    const service = new UserAreaDataService(dialog as any, backend as any);
    return {service, backend, dialog};
  }
  
  it('loads comments/modules/patches/racks on update requests', () => {
    const {service, backend} = build();
    
    service.updateCommentsData$.next();
    service.updateModulesData$.next();
    service.updatePatchesData$.next();
    service.updateRackData$.next(undefined);
    
    expect(backend.GET.currentUserComments).toHaveBeenCalledWith(0, 10);
    expect(backend.GET.currentUserModules).toHaveBeenCalledWith();
    expect(backend.get.currentUserPatches).toHaveBeenCalled();
    expect(backend.get.currentUserRacks).toHaveBeenCalled();
    
    expect(service.commentsData$.value as any).toEqual([{id: 1}]);
    expect(service.modulesData$.value?.length).toBe(3);
    expect((service.patchesData$.value as any)?.[0]?.id).toBe(10);
    expect((service.rackData$.value as any)?.[0]?.id).toBe(20);
  });
  
  it('loads and sorts only modules with manuals', () => {
    const {service, backend} = build();
    
    service.updateManualsData$.next();
    
    expect(backend.GET.currentUserModules).toHaveBeenCalledWith(false, true);
    expect(service.manualsData$.value?.map(x => x.name)).toEqual(['A module', 'B module']);
  });
  
  it('opens patch creator and triggers patch refresh', () => {
    const {service, dialog} = build();
    const patchUpdateSpy = spyOn(service.updatePatchesData$, 'next').and.callThrough();
    
    service.addPatch$.next();
    
    expect(dialog.open).toHaveBeenCalledWith(PatchCreatorComponent, {
      data: {},
      width: '24rem'
    });
    expect(patchUpdateSpy).toHaveBeenCalled();
  });
  
  it('opens rack creator with current modules and triggers rack refresh', () => {
    const {service, dialog} = build();
    const rackUpdateSpy = spyOn(service.updateRackData$, 'next').and.callThrough();
    service.modulesData$.next([{id: 99, name: 'Local', hp: 8} as any]);
    
    service.addRack$.next();
    
    expect(dialog.open).toHaveBeenCalledWith(RackCreatorComponent, {
      data: {userModules: [{id: 99, name: 'Local', hp: 8}]},
      width: '24rem',
      disableClose: false
    });
    expect(rackUpdateSpy).toHaveBeenCalledWith(undefined);
  });
});