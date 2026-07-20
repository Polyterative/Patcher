import {
  of,
  Subject,
  throwError
} from 'rxjs';
import { UserAreaDataService } from './user-area-data.service';
import { PatchCreatorComponent } from 'src/app/components/patch-parts/patch-creator/patch-creator.component';
import {
  RackCreatorComponent,
  RACK_CREATOR_IMPORT_DIALOG_WIDTH,
  RACK_CREATOR_MANUAL_DIALOG_WIDTH
} from 'src/app/components/rack-parts/rack-creator/rack-creator.component';
import { CachedEntity } from 'src/app/features/backend/supabase.cache';
import { DbComment } from 'src/app/models/comment';
import { MinimalModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';


describe('UserAreaDataService', () => {
  const timestamp = '2026-07-18T00:00:00.000Z';
  const testAuthor = {id: 'test-user', username: 'tester'};

  function moduleFixture(overrides: Pick<MinimalModule, 'id' | 'name'> & Partial<MinimalModule>): MinimalModule {
    return {
      id: overrides.id,
      name: overrides.name,
      description: '',
      hp: 0,
      public: true,
      manufacturer: {id: 1, name: 'Test Manufacturer'},
      manufacturerId: 1,
      standard: {id: 0, name: 'Eurorack'},
      tags: [],
      panels: [],
      created: timestamp,
      updated: timestamp,
      ...overrides
    };
  }

  function patchFixture(overrides: Pick<Patch, 'id' | 'name'> & Partial<Patch>): Patch {
    return {
      id: overrides.id,
      name: overrides.name,
      public: true,
      author: testAuthor,
      created: timestamp,
      updated: timestamp,
      ...overrides
    };
  }

  function rackFixture(overrides: Pick<Rack, 'id' | 'name'> & Partial<Rack>): Rack {
    return {
      id: overrides.id,
      name: overrides.name,
      hp: 0,
      rows: 1,
      public: true,
      author: testAuthor,
      locked: false,
      created: timestamp,
      updated: timestamp,
      ...overrides
    };
  }

  function commentFixture(overrides: Pick<DbComment, 'id'> & Partial<DbComment>): DbComment {
    return {
      id: overrides.id,
      content: '',
      entityId: 0,
      entityType: 1,
      profile: testAuthor,
      created: timestamp,
      updated: timestamp,
      ...overrides
    };
  }

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
      cacheResetter$: new Subject<CachedEntity[]>(),
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
    
    const service = new UserAreaDataService(dialog as any, backend as any, discoveryTipService as any, {capture: () => {}, identify: () => {}, reset: () => {}} as any);
    return {service, backend, dialog, discoveryTipService};
  }

  function collectCacheBusts(backend: ReturnType<typeof build>['backend']): CachedEntity[][] {
    const bustedKeys: CachedEntity[][] = [];
    backend.cacheResetter$.subscribe(keys => bustedKeys.push(keys));
    return bustedKeys;
  }
  
  it('loads comments/modules/patches/racks on update requests', () => {
    const {service, backend} = build();
    
    service.updateCommentsData$.next();
    service.updateModulesData$.next();
    service.updatePatchesData$.next();
    service.updateRackData$.next(undefined);
    
    expect(backend.GET.currentUserComments).toHaveBeenCalledWith(0, 9);
    expect(backend.GET.currentUserModules).toHaveBeenCalledWith(true, false, undefined, true);
    expect(backend.get.currentUserPatches).toHaveBeenCalledWith(true);
    expect(backend.get.currentUserRacks).toHaveBeenCalledWith(true);
    
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

  it('loadMoreComments$ appends the next comment page', () => {
    const {service, backend} = build();
    backend.GET.currentUserComments.and.returnValues(
      of({data: [{id: 1}], count: 3}),
      of({data: [{id: 2}, {id: 3}], count: 3}),
    );

    service.updateCommentsData$.next();
    service.loadMoreComments$.next();

    expect(service.commentsPagination.skip$.value).toBe(1);
    expect(backend.GET.currentUserComments).toHaveBeenCalledWith(1, 10);
    expect(service.commentsData$.value as any).toEqual([{id: 1}, {id: 2}, {id: 3}]);
    expect(service.commentsCount$.value).toBe(3);
  });

  it('retries current user reads once after busting the exact stale cache key', () => {
    const {service, backend} = build();
    const bustedKeys = collectCacheBusts(backend);
    const moduleCalls: Record<string, number> = {modules: 0, manuals: 0};
    const error = new Error('cached failure');
    spyOn(console, 'error');

    backend.GET.currentUserModules.and.callFake((_includeInsOuts?: boolean, includeManuals?: boolean) => {
      const key = includeManuals ? 'manuals' : 'modules';
      moduleCalls[key]++;
      if (moduleCalls[key] === 1) {
        return throwError(() => error);
      }
      return of(includeManuals
        ? [{id: 30, name: 'Manual Module', manualURL: 'https://manual'}]
        : [{id: 2, name: 'Recovered Module'}]
      );
    });
    backend.get.currentUserRacks.and.returnValues(
      throwError(() => error),
      of([{id: 20, name: 'Recovered Rack'}])
    );
    backend.get.currentUserPatches.and.returnValues(
      throwError(() => error),
      of([{id: 10, name: 'Recovered Patch', tags: []}])
    );
    backend.GET.currentUserComments.and.returnValues(
      throwError(() => error),
      of({data: [{id: 1}], count: 1})
    );

    service.updateModulesData$.next();
    service.updateRackData$.next(undefined);
    service.updatePatchesData$.next();
    service.updateManualsData$.next();
    service.updateCommentsData$.next();

    expect(service.modulesData$.value?.map(({id, name}) => ({id, name}))).toEqual([{id: 2, name: 'Recovered Module'}]);
    expect(service.rackData$.value?.map(({id, name}) => ({id, name}))).toEqual([{id: 20, name: 'Recovered Rack'}]);
    expect(service.patchesData$.value?.map(({id, name, tags}) => ({id, name, tags}))).toEqual([{id: 10, name: 'Recovered Patch', tags: []}]);
    expect(service.manualsData$.value?.map(({id, name, manualURL}) => ({id, name, manualURL}))).toEqual([{id: 30, name: 'Manual Module', manualURL: 'https://manual'}]);
    expect(service.commentsData$.value?.map(({id}) => ({id}))).toEqual([{id: 1}]);
    expect(bustedKeys).toEqual([
      ['currentUserModules'],
      ['rackWithId'],
      ['patches'],
      ['currentUserModules'],
      ['currentUserComments']
    ]);
    expect(moduleCalls).toEqual({modules: 2, manuals: 2});
    expect(backend.get.currentUserRacks).toHaveBeenCalledTimes(2);
    expect(backend.get.currentUserPatches).toHaveBeenCalledTimes(2);
    expect(backend.GET.currentUserComments).toHaveBeenCalledTimes(2);
  });

  it('accepts successful empty current user reads without retrying or busting caches', () => {
    const {service, backend} = build();
    const bustedKeys = collectCacheBusts(backend);

    backend.GET.currentUserModules.and.returnValue(of([]));
    backend.get.currentUserRacks.and.returnValue(of([]));
    backend.get.currentUserPatches.and.returnValue(of([]));
    backend.GET.currentUserComments.and.returnValue(of({data: [], count: 0}));

    service.updateModulesData$.next();
    service.updateRackData$.next(undefined);
    service.updatePatchesData$.next();
    service.updateManualsData$.next();
    service.updateCommentsData$.next();

    expect(service.modulesData$.value).toEqual([]);
    expect(service.rackData$.value).toEqual([]);
    expect(service.patchesData$.value).toEqual([]);
    expect(service.manualsData$.value).toEqual([]);
    expect(service.commentsData$.value).toEqual([]);
    expect(service.patchesCount$.value).toBe(0);
    expect(service.racksCount$.value).toBe(0);
    expect(service.commentsCount$.value).toBe(0);
    expect(bustedKeys).toEqual([]);
    expect(backend.GET.currentUserModules).toHaveBeenCalledTimes(2);
    expect(backend.get.currentUserRacks).toHaveBeenCalledTimes(1);
    expect(backend.get.currentUserPatches).toHaveBeenCalledTimes(1);
    expect(backend.GET.currentUserComments).toHaveBeenCalledTimes(1);
  });

  it('preserves prior user-area data after exhausted errors and recovers on later triggers', () => {
    const {service, backend} = build();
    const error = new Error('still failing');
    spyOn(console, 'error');
    service.modulesData$.next([moduleFixture({id: 1, name: 'Prior Module'})]);
    service.rackData$.next([rackFixture({id: 1, name: 'Prior Rack'})]);
    service.racksCount$.next(1);
    service.patchesData$.next([patchFixture({id: 1, name: 'Prior Patch', tags: []})]);
    service.patchesCount$.next(1);
    service.commentsData$.next([commentFixture({id: 1})]);
    service.commentsCount$.next(5);

    backend.GET.currentUserModules.and.returnValues(
      throwError(() => error),
      throwError(() => error),
      of([{id: 2, name: 'Recovered Module'}])
    );
    backend.get.currentUserRacks.and.returnValues(
      throwError(() => error),
      throwError(() => error),
      of([{id: 2, name: 'Recovered Rack'}, {id: 3, name: 'Second Rack'}])
    );
    backend.get.currentUserPatches.and.returnValues(
      throwError(() => error),
      throwError(() => error),
      of([{id: 2, name: 'Recovered Patch', tags: []}, {id: 3, name: 'Second Patch', tags: []}])
    );
    backend.GET.currentUserComments.and.returnValues(
      throwError(() => error),
      throwError(() => error),
      of({data: [{id: 2}], count: 6})
    );

    service.updateModulesData$.next();
    service.updateRackData$.next(undefined);
    service.updatePatchesData$.next();
    service.updateCommentsData$.next();

    expect(service.modulesData$.value?.map(module => module.id)).toEqual([1]);
    expect(service.rackData$.value?.map(rack => rack.id)).toEqual([1]);
    expect(service.racksCount$.value).toBe(1);
    expect(service.patchesData$.value?.map(patch => patch.id)).toEqual([1]);
    expect(service.patchesCount$.value).toBe(1);
    expect(service.commentsData$.value?.map(comment => ({id: comment.id}))).toEqual([{id: 1}]);
    expect(service.commentsCount$.value).toBe(5);

    service.updateModulesData$.next();
    service.updateRackData$.next(undefined);
    service.updatePatchesData$.next();
    service.updateCommentsData$.next();

    expect(service.modulesData$.value?.map(module => module.id)).toEqual([2]);
    expect(service.rackData$.value?.map(rack => rack.id)).toEqual([2, 3]);
    expect(service.racksCount$.value).toBe(2);
    expect(service.patchesData$.value?.map(patch => patch.id)).toEqual([2, 3]);
    expect(service.patchesCount$.value).toBe(2);
    expect(service.commentsData$.value?.map(comment => ({id: comment.id}))).toEqual([{id: 2}]);
    expect(service.commentsCount$.value).toBe(6);
  });
  
  it('loads and sorts only modules with manuals', () => {
    const {service, backend} = build();
    
    service.updateManualsData$.next();
    
    expect(backend.GET.currentUserModules).toHaveBeenCalledWith(false, true, undefined, true);
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
      width: RACK_CREATOR_MANUAL_DIALOG_WIDTH,
      maxWidth: RACK_CREATOR_IMPORT_DIALOG_WIDTH,
      disableClose: false
    });
    expect(discoveryTipService.recordAction).toHaveBeenCalledWith('user-area.racks.create-clicked');
    expect(rackUpdateSpy).toHaveBeenCalledWith(undefined);
  });

  it('excludes WANTS modules when opening rack creator (only HAS and SELLS pass)', () => {
    const {service, dialog} = build();
    service.modulesData$.next([
      {id: 1, name: 'Rings',  hp: 8, possessionKind: 'HAS'}   as any,
      {id: 2, name: 'Clouds', hp: 14, possessionKind: 'WANTS'} as any,
      {id: 3, name: 'Braids', hp: 10, possessionKind: 'SELLS'} as any,
    ]);

    service.addRack$.next();

    const callArgs = (dialog.open as jasmine.Spy).calls.mostRecent().args[1];
    const passedIds = (callArgs.data.userModules as any[]).map((m: any) => m.id);
    expect(passedIds).toEqual([1, 3]);
    expect(passedIds).not.toContain(2);
  });

  it('shows my modules by default and switches between collection filters', () => {
    const {service} = build();
    const emittedIds: number[][] = [];
    service.modulesData$.next([
      {id: 1, name: 'Rings', manufacturer: {name: 'Mutable'}, description: '', possessionKind: 'HAS'} as any,
      {id: 2, name: 'Clouds', manufacturer: {name: 'Mutable'}, description: '', possessionKind: 'WANTS'} as any,
      {id: 3, name: 'Braids', manufacturer: {name: 'Mutable'}, description: '', possessionKind: 'SELLS'} as any,
      {id: 4, name: 'Legacy', manufacturer: {name: 'Mutable'}, description: ''} as any,
    ]);

    const subscription = service.filteredModulesData$.subscribe((modules) => {
      emittedIds.push((modules ?? []).map(module => module.id));
    });
    service.moduleCollectionFilter$.next('WISHLIST');
    service.moduleCollectionFilter$.next('FOR_SALE');

    expect(emittedIds).toEqual([[1, 4], [2], [3]]);
    subscription.unsubscribe();
  });

  it('resets module collection view to my modules', () => {
    const {service} = build();

    service.moduleCollectionFilter$.next('WISHLIST');
    service.resetUiState();

    expect(service.moduleCollectionFilter$.value).toBe('MY_MODULES');
  });

  it('resets module pagination when collection status changes', () => {
    const {service} = build();
    service.modulesPagination.skip$.next(20);

    service.moduleCollectionFilter$.next('WISHLIST');

    expect(service.modulesPagination.skip$.value).toBe(0);
  });

  it('grows modules and patches via load more without triggering extra backend calls', () => {
    const {service, backend} = build();

    service.modulesData$.next([
      {id: 1, name: 'One', manufacturer: {name: 'A'}, description: ''},
      {id: 2, name: 'Two', manufacturer: {name: 'A'}, description: ''},
      {id: 3, name: 'Three', manufacturer: {name: 'A'}, description: ''}
    ] as any);
    service.patchesData$.next([
      {id: 1, name: 'Patch One', description: '', tags: []},
      {id: 2, name: 'Patch Two', description: '', tags: []},
      {id: 3, name: 'Patch Three', description: '', tags: []}
    ] as any);

    expect(service.modulesPagination.take$.value).toBe(10);
    service.loadMoreModules$.next();
    service.patchesPagination.take$.next(1);
    service.loadMorePatches$.next();

    expect(service.modulesPagination.skip$.value).toBe(0);
    expect(service.modulesPagination.take$.value).toBe(20);
    expect(service.patchesPagination.skip$.value).toBe(0);
    expect(service.patchesPagination.take$.value).toBe(11);
    expect(backend.GET.currentUserModules).not.toHaveBeenCalled();
    expect(backend.get.currentUserPatches).not.toHaveBeenCalled();

    service.pagedModulesData$.subscribe((modules) => {
      expect(modules?.map((module) => module.id)).toEqual([1, 2, 3]);
    });
    service.pagedPatchesData$.subscribe((patches) => {
      expect(patches?.map((patch) => patch.id)).toEqual([1, 2, 3]);
    });
  });

  it('loadMoreRacks$ grows take$ and does not trigger extra backend calls', () => {
    const {service, backend} = build();

    service.rackData$.next([
      {id: 1, name: 'Rack One', description: ''},
      {id: 2, name: 'Rack Two', description: ''},
      {id: 3, name: 'Rack Three', description: ''}
    ] as any);

    expect(service.racksPagination.take$.value).toBe(10);
    service.loadMoreRacks$.next();
    expect(service.racksPagination.take$.value).toBe(20);
    expect(backend.get.currentUserRacks).not.toHaveBeenCalled();

    let lastRacks: any[] = [];
    service.pagedRacksData$.subscribe((racks) => { if (racks) { lastRacks = racks; } });
    expect(lastRacks.map((r: any) => r.id)).toEqual([1, 2, 3]);
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

  it('filteredPatchesData$ filters by active tag', (done) => {
    const {service} = build();
    service.patchesData$.next([
      {id: 1, name: 'Patch A', tags: ['ambient']} as any,
      {id: 2, name: 'Patch B', tags: ['drone']} as any,
    ]);
    service.activeTagFilter$.next('ambient');

    service.filteredPatchesData$.subscribe(patches => {
      expect(patches?.length).toBe(1);
      expect(patches?.[0].id).toBe(1);
      done();
    });
  });

  it('filteredPatchesData$ shows all patches when tag filter is cleared', (done) => {
    const {service} = build();
    service.patchesData$.next([
      {id: 1, name: 'Alpha', tags: ['ambient']} as any,
      {id: 2, name: 'Beta', tags: ['drone']} as any,
    ]);
    service.activeTagFilter$.next(null);

    service.filteredPatchesData$.subscribe(patches => {
      expect(patches?.length).toBe(2);
      done();
    });
  });

  it('filteredPatchesData$ returns undefined when patchesData$ is undefined', (done) => {
    const {service} = build();
    service.patchesData$.next(undefined);

    service.filteredPatchesData$.subscribe(patches => {
      expect(patches).toBeUndefined();
      done();
    });
  });

  it('filteredPatchesData$ combines tag and text search', (done) => {
    const {service} = build();
    service.patchesData$.next([
      {id: 1, name: 'Ambient Study', description: '', tags: ['ambient']} as any,
      {id: 2, name: 'Drone Fog',    description: '', tags: ['ambient', 'drone']} as any,
      {id: 3, name: 'Bright Tones', description: '', tags: ['melodic']} as any,
    ]);
    service.activeTagFilter$.next('ambient');
    service['_searchQuery$'].next('drone');

    service.filteredPatchesData$.subscribe(patches => {
      expect(patches?.length).toBe(1);
      expect(patches?.[0].id).toBe(2);
      done();
    });
  });
});
