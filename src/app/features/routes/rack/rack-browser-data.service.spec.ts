import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of } from 'rxjs';
import { RackBrowserDataService } from './rack-browser-data.service';


describe('RackBrowserDataService', () => {
  function build() {
    const backend = {
      GET: {
        racksMinimal: jasmine.createSpy('GET.racksMinimal').and.returnValue(of({data: [], count: 0}))
      }
    };
    const service = new RackBrowserDataService(backend as any);
    return {service, backend};
  }

  it('initializes sort$ to updated/desc', () => {
    const {service} = build();
    expect(service.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
  });

  it('calls backend with updated/desc when updateRacksList$ fires', () => {
    const {service, backend} = build();
    service.updateRacksList$.next();
    expect(backend.GET.racksMinimal).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'updated', 'desc'
    );
  });

  it('passes the debounced search term to GET.racksMinimal', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.search.control.setValue('performance');

    tick(750);

    const args = backend.GET.racksMinimal.calls.mostRecent().args as any[];
    expect(args[2]).toBe('performance');
    service.ngOnDestroy();
  }));

  it('updates sort$ and re-fetches after order control changes (debounced)', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.order.control.setValue({id: 'name', name: 'Name ↓'});
    tick(750);
    expect(service.serversideTableRequestData.sort$.value).toEqual(['name', 'desc']);
    expect(backend.GET.racksMinimal).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'name', 'desc'
    );
    service.ngOnDestroy();
  }));

  it('resets sort$ to updated/desc and re-fetches on resetForm$', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.order.control.setValue({id: 'created', name: 'Created ↓'});
    tick(750);
    backend.GET.racksMinimal.calls.reset();

    service.resetForm$.next();
    expect(service.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
    expect(backend.GET.racksMinimal).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'updated', 'desc'
    );
    service.ngOnDestroy();
  }));

  it('uses correct sort after navigation: stale sort$ overridden by explicit sync', () => {
    const {service, backend} = build();
    service.serversideTableRequestData.sort$.next(['name', 'asc']);
    backend.GET.racksMinimal.calls.reset();

    // simulate what the root component constructor does on navigation return
    service.fields.order.control.patchValue({id: 'updated', name: 'Updated ↓'}, {emitEvent: false});
    service.serversideTableRequestData.sort$.next(['updated', 'desc']);
    service.updateRacksList$.next();

    expect(backend.GET.racksMinimal).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'updated', 'desc'
    );
  });
  
  it('resetForm$ triggers exactly one backend call, not two (no double reload)', fakeAsync(() => {
    const {service, backend} = build();
    tick(750);
    backend.GET.racksMinimal.calls.reset();
    
    service.resetForm$.next();
    expect(backend.GET.racksMinimal.calls.count()).toBe(1);
    
    tick(750);
    expect(backend.GET.racksMinimal.calls.count()).toBe(1);
    
    service.ngOnDestroy();
  }));

  it('updates racksList$ and itemsCount$ on successful backend response', () => {
    const {service, backend} = build();
    backend.GET.racksMinimal.and.returnValue(
      of({data: [{id: 1}, {id: 2}], count: 42})
    );

    service.updateRacksList$.next();

    expect(service.racksList$.value).toEqual([{id: 1}, {id: 2}] as any);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(42);
  });

  it('falls back to previous data on backend error response', () => {
    const {service, backend} = build();
    backend.GET.racksMinimal.and.returnValue(
      of({data: [{id: 99}], count: 1})
    );
    service.updateRacksList$.next();

    backend.GET.racksMinimal.and.returnValue(
      of({error: 'server error', data: null, count: 0})
    );
    service.updateRacksList$.next();

    expect(service.racksList$.value).toEqual([{id: 99}] as any);
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(1);
  });

  it('canReset$ emits true when search is non-empty', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));

    service.fields.search.control.setValue('test');
    tick(0);

    expect(canReset).toBeTrue();
    service.ngOnDestroy();
  }));

  it('loadMore$ appends to racksList$ and advances skip', () => {
    const {service, backend} = build();
    backend.GET.racksMinimal.calls.reset();

    // Simulate initial 20 items loaded
    (service.racksList$ as any).next(Array(20).fill({id: 1}));
    service.serversideAdditionalData.itemsCount$.next(35);

    service.loadMore$.next();

    expect(service.serversideTableRequestData.skip$.value).toBe(20);
    expect(backend.GET.racksMinimal).toHaveBeenCalledWith(
      20, 39, '', 'updated', 'desc'
    );
  });

  it('canReset$ emits false when search is empty', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));

    service.fields.search.control.setValue('');
    tick(0);

    expect(canReset).toBeFalse();
    service.ngOnDestroy();
  }));

  it('racksList$ starts as null', () => {
    const {service} = build();
    expect(service.racksList$.value).toBeNull();
    service.ngOnDestroy();
  });

  it('hasMoreRacks$ emits true when total count > loaded list length', () => {
    const {service} = build();
    let hasMore: boolean | undefined;
    service.hasMoreRacks$.subscribe(v => (hasMore = v));

    service.serversideAdditionalData.itemsCount$.next(35);
    (service.racksList$ as any).next(Array(20).fill({id: 1}));

    expect(hasMore).toBeTrue();
    expect(service.racksList$.value?.length).toBe(20);
    service.ngOnDestroy();
  });
});
