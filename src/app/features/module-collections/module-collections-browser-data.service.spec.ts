import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ModuleCollectionSummary } from 'src/app/models/module-collection';
import {
  COLLECTION_ORDER_OPTIONS,
  ModuleCollectionsBrowserDataService
} from './module-collections-browser-data.service';

const collection: ModuleCollectionSummary = {
  id: 1,
  authorid: 'author-1',
  author: { id: 'author-1', username: 'patcher' },
  name: 'Starter collection',
  description: 'Useful modules',
  image: null,
  public: true,
  public_id: 'starter',
  created: '2026-01-01T00:00:00Z',
  updated: '2026-01-02T00:00:00Z',
  module_count: 3
};

describe('ModuleCollectionsBrowserDataService', () => {
  function setup() {
    const publicModuleCollectionsPage = jasmine.createSpy('publicModuleCollectionsPage')
      .and.callFake((from: number, to: number, search: string) => of({
        items: search ? [] : [collection],
        total: search ? 0 : 30,
        remaining: search ? 0 : Math.max(30 - (to + 1), 0)
      }));
    const analytics = { capture: jasmine.createSpy('capture') };
    const service = new ModuleCollectionsBrowserDataService(
      { GET: { publicModuleCollectionsPage } } as any,
      analytics as any
    );

    return {
      service,
      publicModuleCollectionsPage,
      analytics
    };
  }

  function trackState(service: ModuleCollectionsBrowserDataService) {
    const state: {
      collections?: ModuleCollectionSummary[];
      hasMore?: boolean;
      remainingCount?: number;
    } = {};
    service.collections$.subscribe(collections => state.collections = collections);
    service.hasMore$.subscribe(hasMore => state.hasMore = hasMore);
    service.remainingCount$.subscribe(remainingCount => state.remainingCount = remainingCount);
    return state;
  }

  it('loads the first public collections page with defaults', fakeAsync(() => {
    const { service, publicModuleCollectionsPage } = setup();
    const state = trackState(service);

    tick(300);

    expect(publicModuleCollectionsPage).toHaveBeenCalledWith(0, 23, '', 'updated_desc');
    expect(state.collections).toEqual([collection]);
    expect(state.hasMore).toBeTrue();
    expect(state.remainingCount).toBe(6);
  }));

  it('resets filters and reloads the default first page', fakeAsync(() => {
    const { service, publicModuleCollectionsPage, analytics } = setup();
    const state = trackState(service);
    tick(300);

    service.fields.search.control.setValue('west coast');
    tick(300);
    expect(state.collections).toEqual([]);

    service.resetForm$.next();
    tick();

    expect(analytics.capture).toHaveBeenCalledWith('module_collection.discovery_filters_reset', {});
    expect(service.fields.search.control.value).toBe('');
    expect(service.fields.order.control.value).toEqual(COLLECTION_ORDER_OPTIONS[0]);
    expect(publicModuleCollectionsPage).toHaveBeenCalledWith(0, 23, '', 'updated_desc');
    expect(state.collections).toEqual([collection]);

    service.loadMore$.next();
    tick();

    const lastCall = publicModuleCollectionsPage.calls.mostRecent().args;
    expect(lastCall).toEqual([24, 47, '', 'updated_desc']);
  }));

  it('tracks search/order discovery interactions without raw search text', fakeAsync(() => {
    const { service, analytics } = setup();
    tick(300);
    analytics.capture.calls.reset();

    service.fields.search.control.setValue('west coast');
    tick(300);
    service.fields.order.control.setValue(COLLECTION_ORDER_OPTIONS[2]);
    tick();

    expect(analytics.capture).toHaveBeenCalledWith(
      'module_collection.discovery_filter_changed',
      jasmine.objectContaining({
        search_active: true,
        search_length: 10,
        order: 'updated_desc'
      })
    );
    expect(analytics.capture).toHaveBeenCalledWith(
      'module_collection.discovery_filter_changed',
      jasmine.objectContaining({
        search_active: true,
        search_length: 10,
        order: 'name_asc'
      })
    );
    const filterEvent = analytics.capture.calls.allArgs()
      .find(args => args[0] === 'module_collection.discovery_filter_changed');
    expect(JSON.stringify(filterEvent?.[1])).not.toContain('west coast');
  }));

  it('tracks public collection search result metadata', fakeAsync(() => {
    const { service, analytics } = setup();

    tick(300);

    expect(analytics.capture).toHaveBeenCalledWith(
      'module_collection.discovery_search_performed',
      jasmine.objectContaining({
        search_active: false,
        search_length: 0,
        order: 'updated_desc',
        result_count: 1,
        total: 30,
        remaining: 6,
        failed: false
      })
    );
    expect(service).toBeTruthy();
  }));

  it('tracks load-more and collection click discovery interactions', fakeAsync(() => {
    const { service, analytics } = setup();
    tick(300);
    analytics.capture.calls.reset();

    service.loadMore$.next();
    tick();
    service.collectionOpened$.next({collection, index: 2});

    expect(analytics.capture).toHaveBeenCalledWith(
      'module_collection.discovery_load_more',
      jasmine.objectContaining({
        loaded_count: 1,
        remaining: 6,
        order: 'updated_desc',
        search_active: false
      })
    );
    expect(analytics.capture).toHaveBeenCalledWith('module_collection.discovery_collection_clicked', {
      collection_id: 1,
      public_id: 'starter',
      rank: 3,
      module_count: 3
    });
  }));

  it('retries the same page after a load-more failure', fakeAsync(() => {
    const { service, publicModuleCollectionsPage } = setup();
    const secondCollection = {
      ...collection,
      id: 2,
      name: 'Second page',
      public_id: 'second-page'
    };
    publicModuleCollectionsPage.and.callFake((from: number) => {
      if (from === 0) {
        return of({items: [collection], total: 48, remaining: 24});
      }
      if (publicModuleCollectionsPage.calls.count() === 2) {
        return throwError(() => new Error('page failed'));
      }
      return of({items: [secondCollection], total: 48, remaining: 0});
    });
    spyOn(console, 'error');
    const state = trackState(service);
    tick(300);

    service.loadMore$.next();
    tick();
    service.loadMore$.next();
    tick();

    expect(publicModuleCollectionsPage.calls.argsFor(1)[0]).toBe(24);
    expect(publicModuleCollectionsPage.calls.argsFor(2)[0]).toBe(24);
    expect(state.collections).toEqual([collection, secondCollection]);
    expect(state.remainingCount).toBe(0);
  }));

  it('ignores a pending debounced search after resetting filters', fakeAsync(() => {
    const { service, publicModuleCollectionsPage } = setup();
    const state = trackState(service);
    tick(300);
    publicModuleCollectionsPage.calls.reset();

    service.fields.search.control.setValue('west coast');
    service.resetForm$.next();
    tick(300);

    expect(publicModuleCollectionsPage.calls.allArgs().some(args => args[2] === 'west coast')).toBeFalse();
    expect(publicModuleCollectionsPage).not.toHaveBeenCalled();
    expect(state.collections).toEqual([collection]);
  }));

  it('ignores stale load-more responses after filters change', fakeAsync(() => {
    const loadMorePage$ = new Subject<{items: ModuleCollectionSummary[]; total: number; remaining: number}>();
    const secondCollection = {
      ...collection,
      id: 2,
      name: 'Stale page',
      public_id: 'stale-page'
    };
    const publicModuleCollectionsPage = jasmine.createSpy('publicModuleCollectionsPage')
      .and.callFake((from: number, _to: number, search: string) => {
        if (from > 0) {
          return loadMorePage$;
        }
        return of({
          items: search ? [] : [collection],
          total: search ? 0 : 48,
          remaining: search ? 0 : 24
        });
      });
    const service = new ModuleCollectionsBrowserDataService(
      { GET: { publicModuleCollectionsPage } } as any,
      { capture: jasmine.createSpy('capture') } as any
    );
    const state = trackState(service);
    tick(300);

    service.loadMore$.next();
    service.fields.search.control.setValue('west coast');
    tick(300);
    loadMorePage$.next({items: [secondCollection], total: 48, remaining: 0});

    expect(state.collections).toEqual([]);
  }));
});
