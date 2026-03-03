import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of } from 'rxjs';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';


function buildService(paginatedReturn?: any) {
  const defaultReturn = {data: [{id: 1, name: 'Mutable'}, {id: 2, name: 'Make Noise'}], count: 2, error: null};
  const backend = {
    GET: {
      manufacturersPaginated: jasmine.createSpy('manufacturersPaginated')
        .and.returnValue(of(paginatedReturn ?? defaultReturn))
    }
  };
  const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
  const service = new ManufacturerBrowserRootDataService(backend as any, snackBar);
  return {service, backend, snackBar};
}


describe('ManufacturerBrowserRootDataService', () => {
  it('initializes with search and order fields', () => {
    const {service} = buildService();
    expect(service.fields.search.control).toBeDefined();
    expect(service.fields.order.control).toBeDefined();
    expect(service.fields.search.label).toContain('Search');
  });
  
  it('emits manufacturer data after updateList$ fires', fakeAsync(() => {
    const {service} = buildService();
    const emitted: any[] = [];
    service.manufacturers$.subscribe(v => emitted.push(v));
    service.updateList$.next();
    tick();
    expect(emitted.length).toBeGreaterThan(0);
    expect(Array.isArray(emitted[emitted.length - 1])).toBeTrue();
    expect(emitted[emitted.length - 1].length).toBe(2);
  }));
  
  it('updates itemsCount$ after successful fetch', fakeAsync(() => {
    const {service} = buildService();
    service.updateList$.next();
    tick();
    expect(service.serversideAdditionalData.itemsCount$.value).toBe(2);
  }));
  
  it('resets search control on resetForm$', fakeAsync(() => {
    const {service} = buildService();
    service.fields.search.control.setValue('test query');
    tick(400);
    service.resetForm$.next();
    tick();
    expect(service.fields.search.control.value).toBe('');
  }));
  
  it('updates filter$ on search control change (debounced)', fakeAsync(() => {
    const {service} = buildService();
    service.fields.search.control.setValue('mutable');
    tick(400);
    expect(service.serversideTableRequestData.filter$.value).toBe('mutable');
  }));
  
  it('updates skip/take and triggers reload on pageEvent$', fakeAsync(() => {
    const {service, backend} = buildService();
    const before = backend.GET.manufacturersPaginated.calls.count();
    service.pageEvent$.next({pageIndex: 2, pageSize: 20, length: 100} as any);
    tick();
    expect(service.serversideTableRequestData.skip$.value).toBe(40);
    expect(service.serversideTableRequestData.take$.value).toBe(20);
    expect(backend.GET.manufacturersPaginated.calls.count()).toBeGreaterThan(before);
  }));
  
  it('canReset$ emits false initially (default values)', fakeAsync(() => {
    const {service} = buildService();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    tick();
    expect(canReset).toBeFalse();
  }));
  
  it('canReset$ emits true when search has content', fakeAsync(() => {
    const {service} = buildService();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    service.fields.search.control.setValue('rings');
    tick();
    expect(canReset).toBeTrue();
  }));
  
  it('handles backend error response gracefully', fakeAsync(() => {
    const {service} = buildService({error: {message: 'DB error'}, data: null, count: 0});
    const emitted: any[] = [];
    service.manufacturers$.subscribe(v => emitted.push(v));
    service.updateList$.next();
    tick();
    expect(emitted.length).toBeGreaterThan(0);
  }));
  
  it('ngOnDestroy cleans up without error', () => {
    const {service} = buildService();
    expect(() => service.ngOnDestroy()).not.toThrow();
  });
});