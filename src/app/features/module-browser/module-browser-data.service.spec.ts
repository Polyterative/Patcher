import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of } from 'rxjs';
import { MinimalModule } from 'src/app/models/module';
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

  function moduleFactory(overrides: Partial<MinimalModule> = {}): MinimalModule {
    return {
      id: overrides.id ?? 1,
      name: overrides.name ?? 'Module',
      description: overrides.description ?? 'Description',
      hp: overrides.hp ?? 8,
      public: overrides.public ?? true,
      created: overrides.created ?? '2026-01-01T00:00:00.000Z',
      updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
      manufacturerId: overrides.manufacturerId ?? 1,
      manufacturer: overrides.manufacturer ?? ({id: 1, name: 'Maker'} as any),
      standard: overrides.standard ?? ({id: 0, name: '3U Doepfer'} as any),
      tags: overrides.tags ?? [],
      panels: overrides.panels ?? [],
      ins: overrides.ins,
      outs: overrides.outs,
    };
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

  it('applies owned-mode hp sorting when the default browser order is still active', () => {
    const {service} = build();
    service.applyOwnedModeDefaultOrder();

    expect(service.fields.order.control.value).toEqual({id: 'hp', name: 'HP ↑'});
  });

  it('applies owned-mode hp sorting when only the default sort id still matches', () => {
    const {service} = build();
    service.fields.order.control.setValue({id: 'updated', name: 'Recently changed'} as any);

    service.applyOwnedModeDefaultOrder();

    expect(service.fields.order.control.value).toEqual({id: 'hp', name: 'HP ↑'});
  });

  it('filters owned modules by the active manufacturer, tags, and hp rules and sorts by hp ascending', fakeAsync(() => {
    const {service} = build();
    service.fields.manufacturers.control.setValue({id: '2', name: 'Maker 2'} as any);
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
        tags: [{id: 7, tag: {id: 7, name: 'Filter'} as any, voteCount: []}]
      }),
      moduleFactory({
        id: 2,
        name: 'Keep Me First',
        hp: 10,
        manufacturerId: 2,
        tags: [{id: 7, tag: {id: 7, name: 'Filter'} as any, voteCount: []}]
      }),
      moduleFactory({
        id: 3,
        name: 'Wrong Maker',
        hp: 12,
        manufacturerId: 1,
        tags: [{id: 7, tag: {id: 7, name: 'Filter'} as any, voteCount: []}]
      }),
      moduleFactory({
        id: 4,
        name: 'Keep Me Second',
        hp: 14,
        manufacturerId: 2,
        tags: [{id: 7, tag: {id: 7, name: 'Filter'} as any, voteCount: []}]
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

  it('filters owned modules out when their ids are excluded for the rack-aware available mode', () => {
    const {service} = build();

    const filtered = service.filterOwnedModules([
      moduleFactory({id: 1, name: 'Already in rack'}),
      moduleFactory({id: 2, name: 'Still available'})
    ], [1]);

    expect(filtered?.map((module) => module.id)).toEqual([2]);
  });
});
