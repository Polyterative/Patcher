import {
  of,
  Subject
} from 'rxjs';
import { UserAreaDataService } from './user-area-data.service';
import { PatchCreatorComponent } from 'src/app/components/patch-parts/patch-creator/patch-creator.component';
import { RackCreatorComponent } from 'src/app/components/rack-parts/rack-creator/rack-creator.component';


describe('UserAreaDataService', () => {
  function build() {
    const backend = {
      GET: {
        currentUserComments: jasmine.createSpy('currentUserComments').and.returnValue(of({data: [{id: 1}], count: 1})),
        currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of([
          {id: 2, name: 'B module', manualURL: 'https://b'},
          {id: 1, name: 'A module', manualURL: 'https://a'},
          {id: 3, name: 'No Manual', manualURL: ''}
        ])),
        userPatchesPaginated: jasmine.createSpy('userPatchesPaginated').and.returnValue(of({data: [{id: 10}], count: 1})),
        userRacksPaginated: jasmine.createSpy('userRacksPaginated').and.returnValue(of({data: [{id: 20}], count: 1})),
      }
    };
    
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of(true)
      })
    };

    const discoveryTipService = {
      updateUserAreaSnapshot: jasmine.createSpy('updateUserAreaSnapshot'),
      recordAction: jasmine.createSpy('recordAction')
    };
    
    const service = new UserAreaDataService(dialog as any, backend as any, discoveryTipService as any);
    return {service, backend, dialog, discoveryTipService};
  }
  
  it('loads comments/modules/patches/racks on update requests', () => {
    const {service, backend} = build();
    
    service.updateCommentsData$.next();
    service.updateModulesData$.next();
    service.updatePatchesData$.next();
    service.updateRackData$.next(undefined);
    
    expect(backend.GET.currentUserComments).toHaveBeenCalledWith(0, 9);
    expect(backend.GET.currentUserModules).toHaveBeenCalledWith();
    expect(backend.GET.userPatchesPaginated).toHaveBeenCalledWith(0, 9);
    expect(backend.GET.userRacksPaginated).toHaveBeenCalledWith(0, 9);
    
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
    const {service, dialog, discoveryTipService} = build();
    const patchUpdateSpy = spyOn(service.updatePatchesData$, 'next').and.callThrough();
    
    service.addPatch$.next();
    
    expect(dialog.open).toHaveBeenCalledWith(PatchCreatorComponent, {
      data: {},
      width: '24rem'
    });
    expect(discoveryTipService.recordAction).toHaveBeenCalledWith('user-area.patches.create-clicked');
    expect(patchUpdateSpy).toHaveBeenCalled();
  });
  
  it('opens rack creator with current modules and triggers rack refresh', () => {
    const {service, dialog, discoveryTipService} = build();
    const rackUpdateSpy = spyOn(service.updateRackData$, 'next').and.callThrough();
    service.modulesData$.next([{id: 99, name: 'Local', hp: 8} as any]);
    
    service.addRack$.next();
    
    expect(dialog.open).toHaveBeenCalledWith(RackCreatorComponent, {
      data: {userModules: [{id: 99, name: 'Local', hp: 8}]},
      width: '24rem',
      disableClose: false
    });
    expect(discoveryTipService.recordAction).toHaveBeenCalledWith('user-area.racks.create-clicked');
    expect(rackUpdateSpy).toHaveBeenCalledWith(undefined);
  });

  it('records discovery actions from service-owned helper subjects', () => {
    const {service, discoveryTipService} = build();
    const searchQuery$ = new Subject<string>();
    service.connectDiscovery(searchQuery$.asObservable());

    service.addModulesToCollection$.next();
    searchQuery$.next('maths');

    expect(discoveryTipService.recordAction).toHaveBeenCalledWith('user-area.modules.add-clicked');
    expect(discoveryTipService.recordAction).toHaveBeenCalledWith('user-area.search-used');
  });

  it('forwards discovery snapshots through the data service', () => {
    const {service, discoveryTipService} = build();
    const searchQuery$ = new Subject<string>();
    service.connectDiscovery(searchQuery$.asObservable());

    service.modulesData$.next([{id: 1}] as any);
    service.rackData$.next([{id: 2}] as any);
    service.patchesData$.next([{id: 3}] as any);
    service.manualsData$.next([{id: 4}] as any);
    service.commentsData$.next([{id: 5}] as any);
    searchQuery$.next('maths');

    expect(discoveryTipService.updateUserAreaSnapshot).toHaveBeenCalledWith({
      modulesLoaded: true,
      racksLoaded: true,
      patchesLoaded: true,
      manualsLoaded: true,
      commentsLoaded: true,
      modulesCount: 1,
      racksCount: 1,
      patchesCount: 1,
      manualsCount: 1,
      commentsCount: 1,
      totalCount: 3,
      hasSearchQuery: true
    });
  });
});
