import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of } from 'rxjs';
import { PatchBrowserDataService } from './patch-browser-data.service';


describe('PatchBrowserDataService', () => {
  function build() {
    const backend = {
      GET: {
        patches: jasmine.createSpy('GET.patches').and.returnValue(of({data: [], count: 0}))
      }
    };
    const service = new PatchBrowserDataService(backend as any);
    return {service, backend};
  }

  it('initializes sort$ to updated/desc', () => {
    const {service} = build();
    expect(service.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
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

    const args = backend.GET.patches.calls.mostRecent().args as any[];
    expect(args[2]).toBe('rack');
    service.ngOnDestroy();
  }));
  
  it('loadMore$ appends results and advances skip', fakeAsync(() => {
    const {service, backend} = build();
    const firstBatch = Array.from({length: 10}, (_, i) => ({id: i + 1})) as any[];
    const secondBatch = Array.from({length: 10}, (_, i) => ({id: i + 11})) as any[];
    backend.GET.patches.and.returnValue(of({data: secondBatch, count: null}));
    service.patchesList$.next(firstBatch as any);
    service.serversideAdditionalData.itemsCount$.next(50);
    const before = backend.GET.patches.calls.count();
    service.loadMore$.next();
    tick();
    expect(service.serversideTableRequestData.skip$.value).toBe(10);
    expect(backend.GET.patches.calls.count()).toBeGreaterThan(before);
    expect((backend.GET.patches.calls.mostRecent().args as any[])[6]).toBeFalse();
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
