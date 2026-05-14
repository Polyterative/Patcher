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
          {id: 2, name: 'Belgrad', manufacturer: {name: 'Xaoc Devices'}, description: 'Dual peak filter', manualURL: 'https://b'},
          {id: 1, name: 'Dixie II+', manufacturer: {name: 'Intellijel'}, description: 'Precision analog VCO', manualURL: 'https://a'},
          {id: 3, name: 'No Manual', manualURL: ''}
        ])),
        currentUserContributorStats: jasmine.createSpy('currentUserContributorStats').and.returnValue(of({
          modulesSubmitted: 4,
          approvedModules: 3,
          pendingModules: 1,
          commentsPosted: 6,
          moduleFlagsSubmitted: 2
        })),
      }
      ,
      get: {
        currentUserPatches: jasmine.createSpy('currentUserPatches').and.returnValue(of([
          {id: 10, name: 'Belgrad Drone Study', description: 'Ambient feedback patch', tags: ['ambient', 'filter']},
        ])),
        currentUserRacks: jasmine.createSpy('currentUserRacks').and.returnValue(of([
          {id: 20, name: 'Studio Performance Case', description: 'Main Xaoc and Intellijel rack'},
        ])),
      },
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
    expect(backend.get.currentUserPatches).toHaveBeenCalledWith();
    expect(backend.get.currentUserRacks).toHaveBeenCalledWith();
    
    expect(service.commentsData$.value as any).toEqual([{id: 1}]);
    expect(service.modulesData$.value?.length).toBe(3);
    expect((service.patchesData$.value as any)?.[0]?.id).toBe(10);
    expect((service.rackData$.value as any)?.[0]?.id).toBe(20);
  });

  it('loads contributor stats on update requests', () => {
    const {service, backend} = build();

    service.updateContributorStats$.next();

    expect(backend.GET.currentUserContributorStats).toHaveBeenCalledWith();
    expect(service.contributorStats$.value).toEqual({
      modulesSubmitted: 4,
      approvedModules: 3,
      pendingModules: 1,
      commentsPosted: 6,
      moduleFlagsSubmitted: 2
    });
  });

  it('re-requests paged comments when the comments paginator changes', () => {
    const {service, backend} = build();

    service.commentsPageEvent$.next({
      pageIndex: 2,
      pageSize: 20,
      length: 100
    } as any);

    expect(service.commentsPagination.skip$.value).toBe(40);
    expect(service.commentsPagination.take$.value).toBe(20);
    expect(backend.GET.currentUserComments).toHaveBeenCalledWith(40, 59);
  });
  
  it('loads and sorts only modules with manuals', () => {
    const {service, backend} = build();
    
    service.updateManualsData$.next();
    
    expect(backend.GET.currentUserModules).toHaveBeenCalledWith(false, true);
    expect(service.manualsData$.value?.map(x => x.name)).toEqual(['Belgrad', 'Dixie II+']);
  });

  it('filters manuals with the global search query', () => {
    const {service} = build();
    const searchQuery$ = new Subject<string>();
    service.connectDiscovery(searchQuery$.asObservable());

    service.manualsData$.next([
      {
        id: 1,
        name: 'Belgrad',
        manufacturer: {name: 'Xaoc Devices'},
        description: 'Dual peak filter',
        manualURL: 'https://b'
      },
      {
        id: 2,
        name: 'Dixie II+',
        manufacturer: {name: 'Intellijel'},
        description: 'Precision analog VCO',
        manualURL: 'https://a'
      }
    ] as any);

    searchQuery$.next('intellijel');

    service.filteredManualsData$.subscribe((manuals) => {
      expect(manuals?.map((manual) => manual.name)).toEqual(['Dixie II+']);
    });
  });

  it('filters comments with the global search query', () => {
    const {service} = build();
    const searchQuery$ = new Subject<string>();
    service.connectDiscovery(searchQuery$.asObservable());

    service.commentsData$.next([
      {
        id: 1,
        content: 'Belgrad sounds huge',
        entityId: 10,
        entityType: 1,
        profile: {username: 'filterfan'},
        created: '2024-01-01',
        updated: '2024-01-01'
      },
      {
        id: 2,
        content: 'Love this oscillator',
        entityId: 11,
        entityType: 1,
        profile: {username: 'intellijel-user'},
        created: '2024-01-01',
        updated: '2024-01-01'
      }
    ] as any);

    searchQuery$.next('intellijel');

    service.filteredCommentsData$.subscribe((comments) => {
      expect(comments?.map((comment) => comment.id)).toEqual([2]);
    });
  });

  it('collects unique patch tags in sorted order', () => {
    const {service} = build();

    service.patchesData$.next([
      {id: 1, name: 'A', description: '', tags: ['drone', 'ambient']} as any,
      {id: 2, name: 'B', description: '', tags: ['ambient', 'filter']} as any,
      {id: 3, name: 'C', description: '', tags: undefined} as any
    ]);

    service.allPatchTags$.subscribe((tags) => {
      expect(tags).toEqual(['ambient', 'drone', 'filter']);
    });
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

  it('pages modules, racks, and patches locally without triggering extra backend calls', () => {
    const {service, backend} = build();

    service.modulesData$.next([
      {id: 1, name: 'One', manufacturer: {name: 'A'}, description: ''},
      {id: 2, name: 'Two', manufacturer: {name: 'A'}, description: ''},
      {id: 3, name: 'Three', manufacturer: {name: 'A'}, description: ''}
    ] as any);
    service.rackData$.next([
      {id: 1, name: 'Rack One', description: ''},
      {id: 2, name: 'Rack Two', description: ''},
      {id: 3, name: 'Rack Three', description: ''}
    ] as any);
    service.patchesData$.next([
      {id: 1, name: 'Patch One', description: '', tags: []},
      {id: 2, name: 'Patch Two', description: '', tags: []},
      {id: 3, name: 'Patch Three', description: '', tags: []}
    ] as any);

    service.modulesPageEvent$.next({pageIndex: 1, pageSize: 1, length: 3} as any);
    service.racksPageEvent$.next({pageIndex: 1, pageSize: 1, length: 3} as any);
    service.patchesPageEvent$.next({pageIndex: 1, pageSize: 1, length: 3} as any);

    expect(service.modulesPagination.skip$.value).toBe(1);
    expect(service.racksPagination.skip$.value).toBe(1);
    expect(service.patchesPagination.skip$.value).toBe(1);
    expect(backend.GET.currentUserModules).not.toHaveBeenCalled();
    expect(backend.get.currentUserRacks).not.toHaveBeenCalled();
    expect(backend.get.currentUserPatches).not.toHaveBeenCalled();

    service.pagedModulesData$.subscribe((modules) => {
      expect(modules?.map((module) => module.id)).toEqual([2]);
    });
    service.pagedRacksData$.subscribe((racks) => {
      expect(racks?.map((rack) => rack.id)).toEqual([2]);
    });
    service.pagedPatchesData$.subscribe((patches) => {
      expect(patches?.map((patch) => patch.id)).toEqual([2]);
    });
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

  it('filters modules, racks, and patches before paginating when search is active', () => {
    const {service} = build();
    const searchQuery$ = new Subject<string>();
    service.connectDiscovery(searchQuery$.asObservable());

    service.modulesPagination.skip$.next(10);
    service.racksPagination.skip$.next(10);
    service.patchesPagination.skip$.next(10);

    service.modulesData$.next([
      ...Array.from({length: 10}, (_, index) => ({
        id: index + 1,
        name: `Utility ${ index + 1 }`,
        manufacturer: {name: 'Generic'},
        description: 'Support module'
      })),
      {
        id: 99,
        name: 'Belgrad',
        manufacturer: {name: 'Xaoc Devices'},
        description: 'Dual peak filter'
      }
    ] as any);

    service.rackData$.next([
      ...Array.from({length: 10}, (_, index) => ({
        id: index + 1,
        name: `Rack ${ index + 1 }`,
        description: 'Travel case'
      })),
      {
        id: 199,
        name: 'Belgrade Performance Case',
        description: 'Dedicated filter showcase'
      }
    ] as any);

    service.patchesData$.next([
      ...Array.from({length: 10}, (_, index) => ({
        id: index + 1,
        name: `Patch ${ index + 1 }`,
        description: 'Utility patch',
        tags: ['utility']
      })),
      {
        id: 299,
        name: 'Belgrad Resonance Study',
        description: 'Ambient drone patch',
        tags: ['ambient', 'filter']
      }
    ] as any);

    searchQuery$.next('belgrade');

    expect(service.modulesPagination.skip$.value).toBe(0);
    expect(service.racksPagination.skip$.value).toBe(0);
    expect(service.patchesPagination.skip$.value).toBe(0);

    service.filteredModulesData$.subscribe((modules) => {
      expect(modules?.map((module) => module.name)).toEqual(['Belgrad']);
    });

    service.pagedRacksData$.subscribe((racks) => {
      expect(racks?.map((rack) => rack.name)).toEqual(['Belgrade Performance Case']);
    });

    service.pagedPatchesData$.subscribe((patches) => {
      expect(patches?.map((patch) => patch.name)).toEqual(['Belgrad Resonance Study']);
    });
  });

  it('combines patch tag filtering with global search before counting and paging', () => {
    const {service} = build();
    const searchQuery$ = new Subject<string>();
    service.connectDiscovery(searchQuery$.asObservable());

    service.patchesPagination.skip$.next(10);
    service.patchesData$.next([
      ...Array.from({length: 10}, (_, index) => ({
        id: index + 1,
        name: `Patch ${ index + 1 }`,
        description: 'Sequencer workout',
        tags: ['sequence']
      })),
      {
        id: 400,
        name: 'Belgrad Drone Study',
        description: 'Long-form ambient filter patch',
        tags: ['ambient', 'filter']
      },
      {
        id: 401,
        name: 'Belgrad Techno Hit',
        description: 'Percussive filter ping',
        tags: ['techno', 'filter']
      }
    ] as any);

    service.activeTagFilter$.next('ambient');
    searchQuery$.next('belgrade');

    expect(service.patchesPagination.skip$.value).toBe(0);

    service.filteredPatchesCount$.subscribe((count) => {
      expect(count).toBe(1);
    });

    service.pagedPatchesData$.subscribe((patches) => {
      expect(patches?.map((patch) => patch.id)).toEqual([400]);
    });
  });

  it('clears and rebinds discovery search state across user-area navigation', () => {
    const {service} = build();
    const firstSearchQuery$ = new Subject<string>();
    const secondSearchQuery$ = new Subject<string>();
    let latestQuery = '';

    service.searchQuery$.subscribe((query) => latestQuery = query);
    service.connectDiscovery(firstSearchQuery$.asObservable());

    firstSearchQuery$.next('belgrad');
    service.activeTagFilter$.next('ambient');

    expect(latestQuery).toBe('belgrad');
    expect(service.activeTagFilter$.value).toBe('ambient');

    service.resetUiState();

    expect(latestQuery).toBe('');
    expect(service.activeTagFilter$.value).toBeNull();

    firstSearchQuery$.next('stale');

    expect(latestQuery).toBe('');

    service.connectDiscovery(secondSearchQuery$.asObservable());
    secondSearchQuery$.next('dixie');

    expect(latestQuery).toBe('dixie');
  });

  it('trims search input and ignores empty discovery actions', () => {
    const {service, discoveryTipService} = build();
    const searchQuery$ = new Subject<string>();
    let latestQuery = 'initial';

    service.searchQuery$.subscribe((query) => latestQuery = query);
    service.connectDiscovery(searchQuery$.asObservable());

    searchQuery$.next('   belgrad  ');
    expect(latestQuery).toBe('belgrad');
    expect(discoveryTipService.recordAction).toHaveBeenCalledWith('user-area.search-used');

    (discoveryTipService.recordAction as jasmine.Spy).calls.reset();
    searchQuery$.next('   ');

    expect(latestQuery).toBe('');
    expect(discoveryTipService.recordAction).not.toHaveBeenCalled();
  });

  it('stops reacting to discovery input after destroy', () => {
    const {service} = build();
    const searchQuery$ = new Subject<string>();
    let latestQuery = '';

    service.searchQuery$.subscribe((query) => latestQuery = query);
    service.connectDiscovery(searchQuery$.asObservable());

    searchQuery$.next('before destroy');
    expect(latestQuery).toBe('before destroy');

    service.ngOnDestroy();
    searchQuery$.next('after destroy');

    expect(latestQuery).toBe('before destroy');
  });

  it('updates patchesCount$ when patches data loads', () => {
    const {service} = build();

    service.updatePatchesData$.next();

    expect(service.patchesCount$.value).toBe(1);
  });

  it('updates racksCount$ when rack data loads', () => {
    const {service} = build();

    service.updateRackData$.next(undefined);

    expect(service.racksCount$.value).toBe(1);
  });

  it('returns empty array from allPatchTags$ when patchesData$ is undefined', (done) => {
    const {service} = build();
    service.patchesData$.next(undefined);

    service.allPatchTags$.subscribe(tags => {
      expect(tags).toEqual([]);
      done();
    });
  });

  it('updates commentsCount$ when comments data loads', () => {
    const {service} = build();

    service.updateCommentsData$.next();

    expect(service.commentsCount$.value).toBe(1);
  });
});
