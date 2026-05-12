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
      0, jasmine.any(Number), '', 'updated', 'desc'
    );
  });

  it('updates sort$ and re-fetches after order control changes (debounced)', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.order.control.setValue({id: 'name', name: 'Name ↑'});
    tick(750);
    expect(service.serversideTableRequestData.sort$.value).toEqual(['name', 'asc']);
    expect(backend.GET.patches).toHaveBeenCalledWith(
      0, jasmine.any(Number), '', 'name', 'asc'
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
      0, jasmine.any(Number), '', 'updated', 'desc'
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
      0, jasmine.any(Number), '', 'updated', 'desc'
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
  
  it('pageEvent$ updates skip/take and triggers reload', fakeAsync(() => {
    const {service, backend} = build();
    const before = backend.GET.patches.calls.count();
    service.pageEvent$.next({pageIndex: 1, pageSize: 10, length: 50} as any);
    tick();
    expect(service.serversideTableRequestData.skip$.value).toBe(10);
    expect(service.serversideTableRequestData.take$.value).toBe(10);
    expect(backend.GET.patches.calls.count()).toBeGreaterThan(before);
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
