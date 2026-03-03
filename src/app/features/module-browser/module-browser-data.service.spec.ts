import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of } from 'rxjs';
import { ModuleBrowserDataService } from './module-browser-data.service';


describe('ModuleBrowserDataService', () => {
  function build() {
    const backend = {
      GET: {
        manufacturers: jasmine.createSpy('GET.manufacturers').and.returnValue(of({data: []})),
        modules: jasmine.createSpy('GET.modules').and.returnValue(of({data: [], count: 0}))
      },
      cacheResetter$: {next: jasmine.createSpy('cacheResetter$.next')}
    };
    const service = new ModuleBrowserDataService(backend as any);
    return {service, backend};
  }

  it('initializes sort$ to updated/desc', () => {
    const {service} = build();
    expect(service.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
  });

  function sortArgs(backend: any): [string, string] {
    const args = backend.GET.modules.calls.mostRecent().args as any[];
    return [args[3], args[4]];
  }

  it('calls backend with updated/desc when updateModulesList$ fires', () => {
    const {service, backend} = build();
    service.updateModulesList$.next();
    expect(sortArgs(backend)).toEqual(['updated', 'desc']);
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
  
  it('canReset$ emits true when hp field has value', fakeAsync(() => {
    const {service} = build();
    let canReset: boolean | undefined;
    service.canReset$.subscribe(v => (canReset = v));
    service.fields.hp.control.setValue('8');
    tick();
    expect(canReset).toBeTrue();
  }));
  
  it('pageEvent$ updates skip/take and triggers reload', fakeAsync(() => {
    const {service, backend} = build();
    const before = backend.GET.modules.calls.count();
    service.pageEvent$.next({pageIndex: 2, pageSize: 20, length: 100} as any);
    tick();
    expect(service.serversideTableRequestData.skip$.value).toBe(40);
    expect(service.serversideTableRequestData.take$.value).toBe(20);
    expect(backend.GET.modules.calls.count()).toBeGreaterThan(before);
  }));
});