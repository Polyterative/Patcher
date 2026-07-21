import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import {
  Observable,
  of,
  throwError
} from 'rxjs';
import { PatchMinimal } from '../../models/patch';
import {
  CachedEntity
} from '../backend/supabase.cache';
import { SupabaseService } from '../backend/supabase.service';
import { PatchBrowserDataService } from './patch-browser-data.service';


describe('PatchBrowserDataService', () => {
  type PatchesQuery = (
    from?: number,
    to?: number,
    name?: string,
    orderBy?: string | null,
    orderDirection?: string,
    columns?: string,
    includeCount?: boolean
  ) => Observable<PatchesBackendResult>;
  type PatchesQueryArgs = Parameters<PatchesQuery>;
  type CacheResetterNext = (keys: CachedEntity[]) => void;
  interface PatchesBackendResult {
    data: PatchMinimal[] | null;
    count: number | null;
    error?: unknown;
  }
  interface BackendDouble {
    GET: {
      patches: jasmine.Spy<PatchesQuery>;
    };
    cacheResetter$: {
      next: jasmine.Spy<CacheResetterNext>;
    };
  }

  function build() {
    const backend = {
      GET: {
        patches: jasmine.createSpy<PatchesQuery>('GET.patches').and.returnValue(of({data: [], count: 0}))
      },
      cacheResetter$: {next: jasmine.createSpy<CacheResetterNext>('cacheResetter$.next')}
    } satisfies BackendDouble;
    TestBed.configureTestingModule({
      providers: [
        {provide: SupabaseService, useValue: backend}
      ]
    });
    const service = new PatchBrowserDataService(TestBed.inject(SupabaseService));
    return {service, backend};
  }

  function patchFactory(id: number, name = `Patch ${ id }`): PatchMinimal {
    return {
      id,
      name,
      author: {id: 'user-1', username: 'patcher'},
      public: true,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z'
    };
  }

  it('initializes sort$ to updated/desc', () => {
    const {service} = build();
    expect(service.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
  });

  it('loads 25 patches per page by default', () => {
    const {service} = build();
    expect(service.serversideTableRequestData.take$.value).toBe(25);
  });

  it('calls backend with updated/desc when updatePatchesList$ fires', () => {
    const {service, backend} = build();
    service.updatePatchesList$.next();
    expect(backend.GET.patches).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'updated', 'desc', undefined, true
    );
  });

  it('updates sort$ and re-fetches after order control changes (debounced)', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.order.control.setValue({id: 'name', name: 'Name ↑'});
    tick(750);
    expect(service.serversideTableRequestData.sort$.value).toEqual(['name', 'asc']);
    expect(backend.GET.patches).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'name', 'asc', undefined, true
    );
    service.ngOnDestroy();
  }));

  it('resets sort$ to updated/desc and re-fetches on resetForm$', fakeAsync(() => {
    const {service, backend} = build();
    // simulate user changing sort
    service.fields.order.control.setValue({id: 'created', name: 'Created ↑'});
    tick(750);
    backend.GET.patches.calls.reset();

    service.resetForm$.next();
    expect(service.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
    expect(backend.GET.patches).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'updated', 'desc', undefined, true
    );
    service.ngOnDestroy();
  }));

  it('uses correct sort after navigation: stale sort$ overridden by explicit sync', () => {
    const {service, backend} = build();
    // simulate stale state left from a previous visit
    service.serversideTableRequestData.sort$.next(['name', 'asc']);
    backend.GET.patches.calls.reset();

    // simulate what the root component constructor does on navigation return
    service.fields.order.control.patchValue({id: 'updated', name: 'Updated ↓'}, {emitEvent: false});
    service.serversideTableRequestData.sort$.next(['updated', 'desc']);
    service.updatePatchesList$.next();

    expect(backend.GET.patches).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'updated', 'desc', undefined, true
    );
  });
  
  it('canReset$ emits false when all fields are at default', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    tick();
    expect(canReset).toBeFalse();
  }));
  
  it('canReset$ emits true when search name field has content', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    service.fields.search.control.setValue('my patch');
    tick();
    expect(canReset).toBeTrue();
  }));

  it('passes the debounced search term to GET.patches', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.search.control.setValue('rack');

    tick(750);

    const args: PatchesQueryArgs = backend.GET.patches.calls.mostRecent().args;
    expect(args[2]).toBe('rack');
    service.ngOnDestroy();
  }));

  it('retries a thrown backend failure and renders recovered patches', () => {
    const {service, backend} = build();
    backend.GET.patches.and.returnValues(
      throwError(() => new Error('network')),
      of({data: [patchFactory(22, 'Recovered')], count: 1})
    );

    service.updatePatchesList$.next();

    expect(backend.GET.patches.calls.count()).toBe(2);
    expect(backend.cacheResetter$.next.calls.allArgs()).toEqual([[['patches']]]);
    expect(service.patchesList$.value?.map(patch => patch.name)).toEqual(['Recovered']);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(1);
  });

  it('retries an emitted backend response error and renders recovered patches', () => {
    const {service, backend} = build();
    backend.GET.patches.and.returnValues(
      of({error: 'response error', data: null, count: 0}),
      of({data: [patchFactory(23, 'Response Recovered')], count: 1})
    );

    service.updatePatchesList$.next();

    expect(backend.GET.patches.calls.count()).toBe(2);
    expect(backend.cacheResetter$.next.calls.allArgs()).toEqual([[['patches']]]);
    expect(service.patchesList$.value?.map(patch => patch.name)).toEqual(['Response Recovered']);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(1);
  });

  it('does not retry a successful empty patches response', () => {
    const {service, backend} = build();

    service.updatePatchesList$.next();

    expect(backend.GET.patches.calls.count()).toBe(1);
    expect(backend.cacheResetter$.next).not.toHaveBeenCalled();
    expect(service.patchesList$.value).toEqual([]);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(0);
  });

  it('keeps the update stream alive after retries are exhausted', () => {
    const {service, backend} = build();
    spyOn(console, 'error');
    service.patchesList$.next([patchFactory(11, 'Existing')]);
    service.serversideAdditionalData.itemsCount$.next(7);
    backend.GET.patches.and.returnValues(
      throwError(() => new Error('network')),
      throwError(() => new Error('still offline')),
      of({data: [patchFactory(24, 'Later Recovered')], count: 1})
    );

    service.updatePatchesList$.next();
    expect(service.patchesList$.value?.map(patch => patch.name)).toEqual(['Existing']);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(7);

    service.updatePatchesList$.next();

    expect(service.patchesList$.value?.map(patch => patch.name)).toEqual(['Later Recovered']);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(1);
    expect(console.error).toHaveBeenCalledWith('[patch-browser] Failed to load patches list', jasmine.any(Error));
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(backend.cacheResetter$.next.calls.allArgs()).toEqual([[['patches']]]);
  });

  it('loadMore$ appends results and advances skip', fakeAsync(() => {
    const {service, backend} = build();
    const firstBatch = Array.from({length: 10}, (_, i) => patchFactory(i + 1));
    const secondBatch = Array.from({length: 10}, (_, i) => patchFactory(i + 11));
    backend.GET.patches.and.returnValue(of({data: secondBatch, count: null}));
    service.patchesList$.next(firstBatch);
    service.serversideAdditionalData.itemsCount$.next(50);
    const before = backend.GET.patches.calls.count();
    service.loadMore$.next();
    tick();
    expect(service.serversideTableRequestData.skip$.value).toBe(10);
    expect(backend.GET.patches.calls.count()).toBeGreaterThan(before);
    const args: PatchesQueryArgs = backend.GET.patches.calls.mostRecent().args;
    expect(args[6]).toBeFalse();
    expect(service.patchesList$.value?.length).toBe(20);
    expect(service.patchesList$.value?.at(-1)?.id).toBe(20);
  }));
  
  it('resetForm$ triggers exactly one backend call, not two (no double reload)', fakeAsync(() => {
    const {service, backend} = build();
    tick(750);
    backend.GET.patches.calls.reset();
    
    service.resetForm$.next();
    expect(backend.GET.patches.calls.count()).toBe(1);
    
    tick(750);
    expect(backend.GET.patches.calls.count()).toBe(1);
    
    service.ngOnDestroy();
  }));
});
