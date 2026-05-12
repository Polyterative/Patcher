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
      get: {
        allTags: jasmine.createSpy('get.allTags').and.returnValue(of([]))
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

  it('busts manufacturers cache on init so autocomplete reloads fresh options', () => {
    const {backend} = build();
    expect(backend.cacheResetter$.next).toHaveBeenCalledWith(['manufacturers']);
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
    const args = backend.GET.modules.calls.mostRecent().args as any[];
    // tagIds is the 12th argument (index 11)
    expect(args[11]).toEqual([3, 7]);
    service.ngOnDestroy();
  }));
  
  it('passes undefined tag ids when no tags are selected', fakeAsync(() => {
    const {service, backend} = build();
    service.fields.tags.control.setValue([]);
    tick(750);
    const args = backend.GET.modules.calls.mostRecent().args as any[];
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
});
