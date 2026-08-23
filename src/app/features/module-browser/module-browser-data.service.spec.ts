import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import {
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { MinimalManufacturer } from 'src/app/models/manufacturer';
import { MinimalModule } from 'src/app/models/module';
import { Standard } from 'src/app/models/standard';
import {
  Tag,
  TagSuggestionGroup,
  TagType
} from 'src/app/models/tag';
import { AnalyticsService } from '../backbone/analytics-integration/analytics.service';
import { CachedEntity } from '../backend/supabase.cache';
import { SupabaseService } from '../backend/supabase.service';
import { IdNameOption } from './module-browser-data.models';
import { ModuleBrowserDataService } from './module-browser-data.service';


describe('ModuleBrowserDataService', () => {
  type ModulesQuery = (
    from?: number,
    to?: number,
    name?: string,
    orderBy?: string | null,
    orderDirection?: string,
    manufacturerId?: number,
    withHP?: number,
    withHpCondition?: '=' | '>' | '<' | '>=' | '<=' | '!=' | undefined,
    standard?: number | undefined,
    description?: string,
    onlyPublic?: boolean,
    tagIds?: number[],
    includeCount?: boolean
  ) => Observable<ModulesBackendResult>;
  type ModulesQueryArgs = Parameters<ModulesQuery>;
  type ManufacturersQuery = (
    from?: number,
    to?: number,
    columns?: string,
    orderBy?: string
  ) => Observable<ManufacturersBackendResult>;
  type AllTagsQuery = () => Observable<Tag[]>;
  type CacheResetterNext = (keys: CachedEntity[]) => void;
  type ModuleTag = MinimalModule['tags'][number];
  type RuntimeManufacturerControl = {
    setValue(value: string | IdNameOption): void;
  };

  interface ModulesBackendResult {
    data: MinimalModule[] | null;
    count: number | null;
    error?: unknown;
  }

  interface ManufacturersBackendResult {
    data: MinimalManufacturer[] | null;
    count?: number | null;
    error?: unknown;
  }

  interface BackendDouble {
    GET: {
      manufacturers: jasmine.Spy<ManufacturersQuery>;
      modules: jasmine.Spy<ModulesQuery>;
    };
    get: {
      allTags: jasmine.Spy<AllTagsQuery>;
    };
    cacheResetter$: {
      next: jasmine.Spy<CacheResetterNext>;
    };
  }

  interface AnalyticsDouble {
    capture: jasmine.Spy<AnalyticsService['capture']>;
    identify: jasmine.Spy<AnalyticsService['identify']>;
    reset: jasmine.Spy<AnalyticsService['reset']>;
  }

  function build(options: {allTags?: Tag[]} = {}) {
    const analytics = {
      capture: jasmine.createSpy<AnalyticsService['capture']>('capture'),
      identify: jasmine.createSpy<AnalyticsService['identify']>('identify'),
      reset: jasmine.createSpy<AnalyticsService['reset']>('reset')
    } satisfies AnalyticsDouble;
    const backend = {
      GET: {
        manufacturers: jasmine.createSpy<ManufacturersQuery>('GET.manufacturers').and.returnValue(of({data: []})),
        modules: jasmine.createSpy<ModulesQuery>('GET.modules').and.returnValue(of({data: [], count: 0}))
      },
      get: {
        allTags: jasmine.createSpy<AllTagsQuery>('get.allTags').and.returnValue(of(options.allTags ?? []))
      },
      cacheResetter$: {next: jasmine.createSpy<CacheResetterNext>('cacheResetter$.next')}
    } satisfies BackendDouble;
    TestBed.configureTestingModule({
      providers: [
        {provide: SupabaseService, useValue: backend},
        {provide: AnalyticsService, useValue: analytics}
      ]
    });
    const service = new ModuleBrowserDataService(
      TestBed.inject(SupabaseService),
      TestBed.inject(AnalyticsService)
    );
    return {service, backend, analytics};
  }

  function tagFixture(id: number, name: string, type = TagType.Utility): Tag {
    return {id, name, type};
  }

  function moduleTag(tag: Tag): ModuleTag {
    return {
      id: tag.id,
      tag,
      voteCount: []
    };
  }

  function moduleFactory(overrides: Partial<MinimalModule> = {}): MinimalModule {
    const defaultManufacturer: MinimalManufacturer = {id: 1, name: 'Maker'};
    const defaultStandard: Standard = {id: 0, name: '3U Doepfer'};

    return {
      id: overrides.id ?? 1,
      name: overrides.name ?? 'Module',
      description: overrides.description ?? 'Description',
      hp: overrides.hp ?? 8,
      public: overrides.public ?? true,
      created: overrides.created ?? '2026-01-01T00:00:00.000Z',
      updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
      manufacturerId: overrides.manufacturerId ?? 1,
      manufacturer: overrides.manufacturer ?? defaultManufacturer,
      standard: overrides.standard ?? defaultStandard,
      tags: overrides.tags ?? [],
      panels: overrides.panels ?? [],
      ins: overrides.ins,
      outs: overrides.outs,
      possessionKind: overrides.possessionKind,
    };
  }

  function moduleCallArgs(backend: BackendDouble): ModulesQueryArgs {
    return backend.GET.modules.calls.mostRecent().args;
  }

  it('initializes sort$ to updated/desc', () => {
    const {service} = build();
    expect(service.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
  });

  it('loads 25 modules per page by default', () => {
    const {service} = build();
    expect(service.serversideTableRequestData.take$.value).toBe(25);
  });

  it('busts manufacturers cache on init so autocomplete reloads fresh options', () => {
    const {backend} = build();
    expect(backend.cacheResetter$.next).toHaveBeenCalledWith(['manufacturers']);
  });

  function sortArgs(backend: BackendDouble): [ModulesQueryArgs[3], ModulesQueryArgs[4]] {
    const args = moduleCallArgs(backend);
    return [args[3], args[4]];
  }

  function searchPerformedCalls(
    analytics: AnalyticsDouble
  ): Parameters<AnalyticsService['capture']>[] {
    return analytics.capture.calls.allArgs()
      .filter(([eventName]) => eventName === 'search.performed');
  }

  it('calls backend with updated/desc when updateModulesList$ fires', () => {
    const {service, backend} = build();
    service.updateModulesList$.next();
    expect(sortArgs(backend)).toEqual(['updated', 'desc']);
  });

  it('does not track search.performed for default first-page loads', () => {
    const {service, analytics} = build();
    analytics.capture.calls.reset();

    service.updateModulesList$.next();

    expect(searchPerformedCalls(analytics)).toEqual([]);
    service.ngOnDestroy();
  });

  it('updates sort$ and re-fetches after order control changes (debounced)', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.order.control.setValue({id: 'hp', name: 'HP ↑'});
    tick(750);
    expect(service.serversideTableRequestData.sort$.value).toEqual(['hp', 'asc']);
    expect(sortArgs(backend)).toEqual(['hp', 'asc']);
    service.ngOnDestroy();
  }));

  it('resets sort$ to updated/desc and re-fetches on resetForm$', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.order.control.setValue({id: 'hp', name: 'HP ↓'});
    tick(750);
    backend.GET.modules.calls.reset();

    service.resetForm$.next();
    expect(service.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
    expect(sortArgs(backend)).toEqual(['updated', 'desc']);
    service.ngOnDestroy();
  }));

  it('uses correct sort after navigation: stale sort$ overridden by explicit sync', () => {
    const {service, backend} = build();
    service.serversideTableRequestData.sort$.next(['name', 'asc']);
    backend.GET.modules.calls.reset();

    // simulate what the root component constructor does on navigation return
    service.fields.order.control.patchValue(service.orderStartingValue, {emitEvent: false});
    service.serversideTableRequestData.sort$.next([service.orderStartingValue.id, 'desc']);
    service.updateModulesList$.next();

    expect(sortArgs(backend)).toEqual(['updated', 'desc']);
  });

  it('emits loading feedback immediately on filter input before the debounced fetch starts', fakeAsync(() => {
    const {service, backend} = build();
    const loadingEvents: number[] = [];
    service.modulesLoadingTrigger$.subscribe(() => loadingEvents.push(backend.GET.modules.calls.count()));
    backend.GET.modules.calls.reset();

    service.fields.name.control.setValue('rings');

    expect(loadingEvents.length).toBe(1);
    expect(backend.GET.modules.calls.count()).toBe(0);

    tick(749);
    expect(backend.GET.modules.calls.count()).toBe(0);

    tick(1);
    expect(loadingEvents.length).toBe(2);
    expect(backend.GET.modules.calls.count()).toBe(1);
    service.ngOnDestroy();
  }));
  
  it('canReset$ emits false when all fields are at default', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    tick();
    expect(canReset).toBeFalse();
  }));
  
  it('canReset$ emits true when name field has content', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    service.fields.name.control.setValue('rings');
    tick();
    expect(canReset).toBeTrue();
  }));

  it('passes the debounced name search term to GET.modules', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.name.control.setValue('rings');

    tick(750);

    const args = moduleCallArgs(backend);
    expect(args[2]).toBe('rings');
    service.ngOnDestroy();
  }));

  it('tracks search.performed once with derived result metadata after a query search', fakeAsync(() => {
    const {service, backend, analytics} = build();
    backend.GET.modules.and.returnValue(of({
      data: [moduleFactory({id: 41, name: 'Rings'})],
      count: 13
    }));
    analytics.capture.calls.reset();

    service.fields.name.control.setValue('rings');
    tick(750);

    const calls = searchPerformedCalls(analytics);
    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual(['search.performed', {
      query_len:      5,
      filters_active: 0,
      result_count:   13
    }]);
    service.ngOnDestroy();
  }));

  it('passes selected manufacturer id to GET.modules', fakeAsync(() => {
    const {service, backend} = build();
    (service.fields.manufacturers.control as unknown as RuntimeManufacturerControl)
      .setValue({id: '7', name: 'Shakmat Modular'});

    tick(750);

    const args = moduleCallArgs(backend);
    expect(args[5]).toBe(7);
    service.ngOnDestroy();
  }));

  it('passes the debounced description search term to GET.modules', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.description.control.setValue('analog filter');

    tick(750);

    const args = moduleCallArgs(backend);
    expect(args[9]).toBe('analog filter');
    service.ngOnDestroy();
  }));

  it('resets pagination and asks the paginator to return to the first page when search changes', fakeAsync(() => {
    const {service, backend} = build();
    const paginatorSpy = jasmine.createSpy('paginatorToFistPage$');
    service.paginatorToFistPage$.subscribe(paginatorSpy);
    service.serversideTableRequestData.skip$.next(40);
    backend.GET.modules.calls.reset();

    service.fields.name.control.setValue('rings');
    tick(750);

    expect(service.serversideTableRequestData.skip$.value).toBe(0);
    expect(paginatorSpy).toHaveBeenCalled();
    expect(backend.GET.modules.calls.mostRecent().args[2]).toBe('rings');
    service.ngOnDestroy();
  }));

  it('retries a thrown backend failure and renders recovered modules', () => {
    const {service, backend, analytics} = build();
    backend.cacheResetter$.next.calls.reset();
    analytics.capture.calls.reset();
    backend.GET.modules.and.returnValues(
      throwError(() => new Error('network')),
      of({data: [moduleFactory({id: 22, name: 'Recovered'})], count: 1})
    );

    service.updateModulesList$.next();

    expect(backend.GET.modules.calls.count()).toBe(2);
    expect(backend.cacheResetter$.next.calls.allArgs()).toEqual([[['modules']]]);
    expect(service.modulesList$.value?.map(module => module.name)).toEqual(['Recovered']);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(1);
    expect(searchPerformedCalls(analytics)).toEqual([]);
    service.ngOnDestroy();
  });

  it('retries an emitted backend response error and renders recovered modules', () => {
    const {service, backend} = build();
    backend.cacheResetter$.next.calls.reset();
    backend.GET.modules.and.returnValues(
      of({error: 'response error', data: null, count: 0}),
      of({data: [moduleFactory({id: 23, name: 'Response Recovered'})], count: 1})
    );

    service.updateModulesList$.next();

    expect(backend.GET.modules.calls.count()).toBe(2);
    expect(backend.cacheResetter$.next.calls.allArgs()).toEqual([[['modules']]]);
    expect(service.modulesList$.value?.map(module => module.name)).toEqual(['Response Recovered']);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(1);
    service.ngOnDestroy();
  });

  it('does not retry a successful empty modules response', () => {
    const {service, backend} = build();
    backend.cacheResetter$.next.calls.reset();

    service.updateModulesList$.next();

    expect(backend.GET.modules.calls.count()).toBe(1);
    expect(backend.cacheResetter$.next).not.toHaveBeenCalled();
    expect(service.modulesList$.value).toEqual([]);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(0);
    service.ngOnDestroy();
  });

  it('keeps the remote search stream alive after retries are exhausted', fakeAsync(() => {
    const {service, backend} = build();
    spyOn(console, 'error');
    backend.cacheResetter$.next.calls.reset();
    service.modulesList$.next([moduleFactory({id: 11, name: 'Existing'})]);
    service.serversideAdditionalData.itemsCount$.next(7);
    backend.GET.modules.and.returnValues(
      throwError(() => new Error('network')),
      throwError(() => new Error('still offline')),
      of({data: [moduleFactory({id: 22, name: 'Recovered'})], count: 1})
    );

    service.updateModulesList$.next();
    expect(service.modulesList$.value?.map(module => module.name)).toEqual(['Existing']);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(7);

    service.fields.name.control.setValue('recovered');
    tick(750);

    expect(service.modulesList$.value?.map(module => module.name)).toEqual(['Recovered']);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(1);
    const consoleErrorArgs = (console.error as jasmine.Spy<typeof console.error>).calls.mostRecent().args;
    expect(consoleErrorArgs[0]).toBe('[module-browser] Failed to load modules list');
    expect(consoleErrorArgs[1]).toBeInstanceOf(Error);
    expect((consoleErrorArgs[1] as Error).message).toBe('still offline');
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(backend.cacheResetter$.next.calls.allArgs()).toEqual([[['modules']]]);
    service.ngOnDestroy();
  }));
  
  it('canReset$ emits true when hp field has value', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    service.fields.hp.control.setValue('8');
    tick();
    expect(canReset).toBeTrue();
  }));
  
  it('loadMore$ appends results and advances skip', fakeAsync(() => {
    const {service, backend} = build();
    // simulate first page already loaded (25 modules)
    const firstBatch = Array.from({length: 25}, (_, i) => moduleFactory({id: i + 1}));
    const secondBatch = Array.from({length: 25}, (_, i) => moduleFactory({id: i + 26, name: `Module ${ i + 26 }`}));
    backend.GET.modules.and.returnValue(of({data: secondBatch, count: null}));
    service.modulesList$.next(firstBatch);
    service.serversideAdditionalData.itemsCount$.next(45);
    const beforeCount = backend.GET.modules.calls.count();
    service.loadMore$.next();
    tick();
    expect(service.serversideTableRequestData.skip$.value).toBe(25);
    expect(backend.GET.modules.calls.count()).toBeGreaterThan(beforeCount);
    expect(service.modulesList$.value?.length).toBe(50);
    expect(service.modulesList$.value?.at(-1)?.id).toBe(50);
  }));

  it('skips exact count on load more because the first page already knows the total', fakeAsync(() => {
    const {service, backend} = build();
    const firstBatch = Array.from({length: 25}, (_, i) => moduleFactory({id: i + 1}));
    service.modulesList$.next(firstBatch);
    service.serversideAdditionalData.itemsCount$.next(45);

    service.loadMore$.next();
    tick();

    const args = moduleCallArgs(backend);
    expect(args[0]).toBe(25);
    expect(args[1]).toBe(49);
    expect(args[12]).toBeFalse();
  }));
  
  it('canReset$ emits true when tag filter has selections', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    service.fields.tags.control.setValue([{id: '1', name: 'VCO'}]);
    tick();
    expect(canReset).toBeTrue();
  }));
  
  it('canReset$ emits false after tags are cleared back to empty', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    service.fields.tags.control.setValue([{id: '1', name: 'VCO'}]);
    tick();
    service.fields.tags.control.setValue([]);
    tick();
    expect(canReset).toBeFalse();
  }));
  
  it('passes selected tag ids to GET.modules when updateModulesList$ fires', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.tags.control.setValue([{id: '3', name: 'Filter'}, {id: '7', name: 'Drum'}]);
    tick(750);
    const args = moduleCallArgs(backend);
    // tagIds is the 12th argument (index 11)
    expect(args[11]).toEqual([3, 7]);
    service.ngOnDestroy();
  }));

  it('tracks search.performed once after a tag filter action that also changes ordering', fakeAsync(() => {
    const {service, backend, analytics} = build();
    backend.GET.modules.and.returnValue(of({
      data: [
        moduleFactory({id: 51, name: 'Filtered One'}),
        moduleFactory({id: 52, name: 'Filtered Two'})
      ],
      count: 2
    }));
    analytics.capture.calls.reset();

    service.fields.tags.control.setValue([{id: '5', name: 'Oscillator'}]);
    tick(750);

    const calls = searchPerformedCalls(analytics);
    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual(['search.performed', {
      query_len:      0,
      filters_active: 1,
      result_count:   2
    }]);
    service.ngOnDestroy();
  }));

  it('refreshes modules on tag changes even when the order stays on best match', fakeAsync(() => {
    const {service, backend, analytics} = build();

    service.fields.order.control.setValue(service.bestMatchOrderOption);
    tick(750);
    backend.GET.modules.calls.reset();
    analytics.capture.calls.reset();

    service.fields.tags.control.setValue([{id: '5', name: 'Oscillator'}]);

    expect(backend.GET.modules.calls.count()).toBe(1);
    const eventNames = analytics.capture.calls.allArgs().map(args => args[0]);
    expect(eventNames).toContain('search.tags_selected');
    expect(eventNames).not.toContain('search.filter_changed');
    service.ngOnDestroy();
  }));
  
  it('passes undefined tag ids when no tags are selected', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.tags.control.setValue([]);
    tick(750);
    const args = moduleCallArgs(backend);
    expect(args[11]).toBeUndefined();
    service.ngOnDestroy();
  }));
  
  it('resets tags to empty on resetForm$', fakeAsync(() => {
    const {service} = build();
    service.fields.tags.control.setValue([{id: '5', name: 'Oscillator'}]);
    tick(750);
    service.resetForm$.next();
    expect(service.fields.tags.control.value).toEqual([]);
    service.ngOnDestroy();
  }));

  it('resets tagSearch control and tagSearchQuery$ on resetForm$', fakeAsync(() => {
    const {service} = build();
    service.fields.tagSearch.control.setValue('osc');
    tick(750);
    service.resetForm$.next();
    expect(service.fields.tagSearch.control.value).toBe('');
    expect(service.tagSearchQuery$.value).toBe('');
    service.ngOnDestroy();
  }));

  it('tagSearch control changes propagate to tagSearchQuery$', fakeAsync(() => {
    const {service} = build();
    service.fields.tagSearch.control.setValue('vco');
    expect(service.tagSearchQuery$.value).toBe('vco');
    service.fields.tagSearch.control.setValue('');
    expect(service.tagSearchQuery$.value).toBe('');
    service.ngOnDestroy();
  }));

  it('sets remoteTagFilterLoading$ during tag changes after initial results and clears it on the next backend response', fakeAsync(() => {
    const {service, backend} = build();
    const modulesResponse$ = new Subject<{data: MinimalModule[]; count: number}>();

    backend.GET.modules.and.returnValue(modulesResponse$.asObservable());
    service.modulesList$.next([moduleFactory({id: 1})]);

    service.fields.tags.control.setValue([{id: '5', name: 'Oscillator'}]);
    expect(service.remoteTagFilterLoading$.value).toBeTrue();

    tick(750);
    modulesResponse$.next({data: [moduleFactory({id: 2})], count: 1});
    modulesResponse$.complete();

    expect(service.remoteTagFilterLoading$.value).toBeFalse();
    service.ngOnDestroy();
  }));

  it('keeps remoteTagFilterLoading$ true across repeated tag changes until the latest response lands', fakeAsync(() => {
    const {service, backend} = build();
    const firstResponse$ = new Subject<{data: MinimalModule[]; count: number}>();
    const secondResponse$ = new Subject<{data: MinimalModule[]; count: number}>();

    backend.GET.modules.and.returnValues(firstResponse$.asObservable(), secondResponse$.asObservable());
    service.modulesList$.next([moduleFactory({id: 1})]);

    service.fields.tags.control.setValue([{id: '5', name: 'Oscillator'}]);
    expect(service.remoteTagFilterLoading$.value).toBeTrue();
    tick(750);

    service.fields.tags.control.setValue([{id: '8', name: 'Filter'}]);
    expect(service.remoteTagFilterLoading$.value).toBeTrue();
    tick(750);

    firstResponse$.next({data: [moduleFactory({id: 2})], count: 1});
    firstResponse$.complete();
    expect(service.remoteTagFilterLoading$.value).toBeTrue();

    secondResponse$.next({data: [moduleFactory({id: 3})], count: 1});
    secondResponse$.complete();
    expect(service.remoteTagFilterLoading$.value).toBeFalse();
    service.ngOnDestroy();
  }));

  it('clears tag-filter loading feedback when a filtered backend request fails', fakeAsync(() => {
    const {service, backend} = build();
    spyOn(console, 'error');
    service.modulesList$.next([moduleFactory({id: 1})]);
    backend.GET.modules.and.returnValue(throwError(() => new Error('tag failure')));

    service.fields.tags.control.setValue([{id: '5', name: 'Oscillator'}]);
    expect(service.remoteTagFilterLoading$.value).toBeTrue();
    tick(750);

    expect(service.remoteTagFilterLoading$.value).toBeFalse();
    expect(service.modulesList$.value?.map(module => module.id)).toEqual([1]);
    service.ngOnDestroy();
  }));

  it('does not set remoteTagFilterLoading$ for non-tag filter changes', fakeAsync(() => {
    const {service} = build();
    service.modulesList$.next([moduleFactory({id: 1})]);

    service.fields.name.control.setValue('Oscillator');
    expect(service.remoteTagFilterLoading$.value).toBeFalse();

    tick(750);
    expect(service.remoteTagFilterLoading$.value).toBeFalse();
    service.ngOnDestroy();
  }));
  
  it('resetForm$ triggers exactly one backend call, not two (no double reload)', fakeAsync(() => {
    const {service, backend} = build();
    // Let the initial load settle
    tick(750);
    backend.GET.modules.calls.reset();
    
    service.resetForm$.next();
    // The explicit updateModulesList$.next() fires immediately → one call
    expect(backend.GET.modules.calls.count()).toBe(1);
    
    // Advancing past the debounce window must NOT produce a second call
    tick(750);
    expect(backend.GET.modules.calls.count()).toBe(1);
    
    service.ngOnDestroy();
  }));

  it('applies owned-mode hp sorting when the default browser order is still active', () => {
    const {service} = build();
    service.applyOwnedModeDefaultOrder();

    expect(service.fields.order.control.value).toEqual({id: 'hp', name: 'HP ↑'});
  });

  it('applies owned-mode hp sorting when only the default sort id still matches', () => {
    const {service} = build();
    service.fields.order.control.setValue({id: 'updated', name: 'Recently changed'});

    service.applyOwnedModeDefaultOrder();

    expect(service.fields.order.control.value).toEqual({id: 'hp', name: 'HP ↑'});
  });

  it('filters owned modules by the active manufacturer, tags, and hp rules and sorts by hp ascending', fakeAsync(() => {
    const {service} = build();
    (service.fields.manufacturers.control as unknown as RuntimeManufacturerControl)
      .setValue({id: '2', name: 'Maker 2'});
    service.fields.tags.control.setValue([{id: '7', name: 'Filter'}]);
    service.fields.hp.control.setValue('10');
    service.fields.hpCondition.control.setValue({id: '>=', name: 'more or exactly'});
    service.fields.order.control.setValue({id: 'hp', name: 'HP ↑'});
    tick(750);

    const filtered = service.filterOwnedModules([
      moduleFactory({
        id: 1,
        name: 'Too Small',
        hp: 8,
        manufacturerId: 2,
        tags: [moduleTag(tagFixture(7, 'Filter'))]
      }),
      moduleFactory({
        id: 2,
        name: 'Keep Me First',
        hp: 10,
        manufacturerId: 2,
        tags: [moduleTag(tagFixture(7, 'Filter'))]
      }),
      moduleFactory({
        id: 3,
        name: 'Wrong Maker',
        hp: 12,
        manufacturerId: 1,
        tags: [moduleTag(tagFixture(7, 'Filter'))]
      }),
      moduleFactory({
        id: 4,
        name: 'Keep Me Second',
        hp: 14,
        manufacturerId: 2,
        tags: [moduleTag(tagFixture(7, 'Filter'))]
      }),
    ]);

    expect(filtered?.map((module) => module.id)).toEqual([2, 4]);
    service.ngOnDestroy();
  }));

  it('filters owned modules by the active name and description queries', fakeAsync(() => {
    const {service} = build();
    service.fields.name.control.setValue('Oscillator');
    service.fields.description.control.setValue('analog');
    tick(750);

    const filtered = service.filterOwnedModules([
      moduleFactory({id: 1, name: 'Digital Voice', description: 'Digital wavetable synth'}),
      moduleFactory({id: 2, name: 'Analog Oscillator', description: 'Warm analog tone'}),
      moduleFactory({id: 3, name: 'Analog Filter', description: 'Classic analog tone'}),
    ]);

    expect(filtered?.map((module) => module.id)).toEqual([2]);
    service.ngOnDestroy();
  }));

  it('filters owned modules with accent-insensitive text search', fakeAsync(() => {
    const {service} = build();
    service.fields.name.control.setValue('Lubadh');
    service.fields.description.control.setValue('looper');
    tick(750);

    const filtered = service.filterOwnedModules([
      moduleFactory({id: 1, name: 'Lùbadh', description: 'Dual lòoper and sampler'}),
      moduleFactory({id: 2, name: 'Mimeophon', description: 'Stereo delay'})
    ]);

    expect(filtered?.map((module) => module.id)).toEqual([1]);
    service.ngOnDestroy();
  }));

  it('filters owned modules out when their ids are excluded for the rack-aware available mode', () => {
    const {service} = build();

    const filtered = service.filterOwnedModules([
      moduleFactory({id: 1, name: 'Already in rack'}),
      moduleFactory({id: 2, name: 'Still available'})
    ], [1]);

    expect(filtered?.map((module) => module.id)).toEqual([2]);
  });

  it('filters rack-owned modules to modules the user owns', () => {
    const {service} = build();

    const filtered = service.filterOwnedModules([
      moduleFactory({id: 1, name: 'Owned', possessionKind: 'HAS'}),
      moduleFactory({id: 2, name: 'Wanted', possessionKind: 'WANTS'}),
      moduleFactory({id: 3, name: 'For Sale', possessionKind: 'SELLS'})
    ]);

    expect(filtered?.map((module) => module.id)).toEqual([1]);
  });

  it('filters wanted modules to wishlist modules only', () => {
    const {service} = build();

    const filtered = service.filterWantedModules([
      moduleFactory({id: 1, name: 'Owned', possessionKind: 'HAS'}),
      moduleFactory({id: 2, name: 'Wanted', possessionKind: 'WANTS'}),
      moduleFactory({id: 3, name: 'For Sale', possessionKind: 'SELLS'})
    ]);

    expect(filtered?.map((module) => module.id)).toEqual([2]);
  });

  it('groups and filters tags by the search query', fakeAsync(() => {
    const {service} = build({
      allTags: [
        {id: 1, name: 'Oscillator', type: TagType.Source},
        {id: 2, name: 'Filter', type: TagType.Nature},
        {id: 3, name: 'Warm', type: TagType.Character}
      ]
    });
    let groupedTags: TagSuggestionGroup[] | undefined;
    service.groupedFilterTags$.subscribe((value) => (groupedTags = value));

    tick(300);
    expect(groupedTags?.map((group) => group.label)).toEqual(['Source', 'Nature', 'Character']);

    service.fields.tagSearch.control.setValue('fi');
    tick(300);

    expect(groupedTags).toEqual([
      {
        label: 'Nature',
        tags: [{id: 2, name: 'Filter', type: TagType.Nature}]
      }
    ]);
    service.ngOnDestroy();
  }));

  it('toggleTagFilter adds and removes tags from the multiselect control', () => {
    const {service} = build();
    const tag = {id: 5, name: 'Oscillator', type: TagType.Source};

    service.toggleTagFilter(tag);
    expect(service.fields.tags.control.value).toEqual([{id: '5', name: 'Oscillator'}]);

    service.toggleTagFilter(tag);
    expect(service.fields.tags.control.value).toEqual([]);
  });

  it('auto-selects best-match when tags become active and reverts when they clear', fakeAsync(() => {
    const {service} = build();

    service.fields.tags.control.setValue([{id: '5', name: 'Oscillator'}]);
    expect(service.fields.order.control.value).toEqual(service.bestMatchOrderOption);

    tick(750);
    service.fields.tags.control.setValue([]);
    expect(service.fields.order.control.value).toEqual(service.orderStartingValue);
    service.ngOnDestroy();
  }));

  it('uses updated/desc for backend sorting when best-match is selected', fakeAsync(() => {
    const {service, backend} = build();

    service.fields.tags.control.setValue([{id: '5', name: 'Oscillator'}]);
    tick(750);

    expect(service.fields.order.control.value).toEqual(service.bestMatchOrderOption);
    expect(sortArgs(backend)).toEqual(['updated', 'desc']);
    service.ngOnDestroy();
  }));

  it('applies client-side AND filtering to remote module results', () => {
    const {service, backend} = build();
    backend.GET.modules.and.returnValue(of({
      data: [
        moduleFactory({
          id: 1,
          name: 'Both Tags',
          tags: [
            moduleTag(tagFixture(1, 'Oscillator')),
            moduleTag(tagFixture(2, 'Analog'))
          ]
        }),
        moduleFactory({
          id: 2,
          name: 'One Tag',
          tags: [
            moduleTag(tagFixture(1, 'Oscillator'))
          ]
        })
      ],
      count: 2
    }));

    service.fields.tags.control.setValue([
      {id: '1', name: 'Oscillator'},
      {id: '2', name: 'Analog'}
    ]);
    service.tagMatchMode$.next('AND');

    expect(service.modulesList$.value?.map((module) => module.id)).toEqual([1]);
  });

  it('uses the AND-filtered result count so empty pages do not expose load-more state', () => {
    const {service, backend} = build();
    backend.GET.modules.and.returnValue(of({
      data: [
        moduleFactory({
          id: 1,
          name: 'Passive Only',
          tags: [
            moduleTag(tagFixture(1, 'Passive'))
          ]
        }),
        moduleFactory({
          id: 2,
          name: 'Power Only',
          tags: [
            moduleTag(tagFixture(2, 'Power'))
          ]
        })
      ],
      count: 117
    }));

    service.fields.tags.control.setValue([
      {id: '1', name: 'Passive'},
      {id: '2', name: 'Power'}
    ]);
    service.tagMatchMode$.next('AND');

    expect(service.modulesList$.value).toEqual([]);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(0);
  });

  it('resets pagination on tag match-mode changes so empty backend pages replace stale results', () => {
    const {service, backend} = build();
    const staleResults = Array.from({length: 25}, (_, index) => moduleFactory({id: index + 1}));
    service.modulesList$.next(staleResults);
    service.serversideAdditionalData.itemsCount$.next(117);
    service.serversideTableRequestData.skip$.next(25);
    service.fields.tags.control.setValue([
      {id: '1', name: 'Passive'},
      {id: '2', name: 'Power'}
    ], {emitEvent: false});
    backend.GET.modules.and.returnValue(of({data: [], count: 0}));

    service.tagMatchMode$.next('AND');

    expect(service.serversideTableRequestData.skip$.value).toBe(0);
    expect(service.modulesList$.value).toEqual([]);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(0);
  });

  it('preserves the backend count for non-empty AND-filtered pages so load-more can continue', () => {
    const {service, backend} = build();
    backend.GET.modules.and.returnValue(of({
      data: [
        moduleFactory({
          id: 1,
          name: 'Both Tags',
          tags: [
            moduleTag(tagFixture(1, 'Passive')),
            moduleTag(tagFixture(2, 'Power'))
          ]
        }),
        moduleFactory({
          id: 2,
          name: 'Power Only',
          tags: [
            moduleTag(tagFixture(2, 'Power'))
          ]
        })
      ],
      count: 117
    }));

    service.fields.tags.control.setValue([
      {id: '1', name: 'Passive'},
      {id: '2', name: 'Power'}
    ]);
    service.tagMatchMode$.next('AND');

    expect(service.modulesList$.value?.map((module) => module.id)).toEqual([1]);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(117);
  });

  it('sorts best-match by score desc then name asc', () => {
    const {service} = build();
    service.fields.tags.control.setValue([
      {id: '1', name: 'Oscillator'},
      {id: '2', name: 'Analog'}
    ]);

    const sorted = service.sortModulesByBestMatch([
      moduleFactory({
        id: 3,
        name: 'Zulu',
        tags: [moduleTag(tagFixture(1, 'Oscillator'))]
      }),
      moduleFactory({
        id: 1,
        name: 'Alpha',
        tags: [
          moduleTag(tagFixture(1, 'Oscillator')),
          moduleTag(tagFixture(2, 'Analog'))
        ]
      }),
      moduleFactory({
        id: 2,
        name: 'Beta',
        tags: [moduleTag(tagFixture(1, 'Oscillator'))]
      })
    ]);

    expect(sorted.map((module) => module.id)).toEqual([1, 2, 3]);
  });

  it('canReset$ emits true when tag match mode differs from OR', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));

    service.tagMatchMode$.next('AND');
    tick();

    expect(canReset).toBeTrue();
  }));
});
