import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of } from 'rxjs';
import {
  mapModulesToRecentActivityItems,
  ModuleBrowserDataService
} from './module-browser-data.service';


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
  
  it('maps module list into recent activity sorted by updated timestamp', () => {
    const modules = [
      {
        id: 2,
        name: 'Older Module',
        description: '',
        hp: 8,
        public: true,
        manufacturerId: 10,
        manufacturer: {name: 'Maker A'},
        standard: 0,
        tags: [],
        panels: [],
        created: '2025-01-01T00:00:00.000Z',
        updated: '2025-01-02T00:00:00.000Z'
      },
      {
        id: 1,
        name: 'Newest Module',
        description: '',
        hp: 10,
        public: true,
        manufacturerId: 11,
        manufacturer: {name: 'Maker B'},
        standard: 0,
        tags: [],
        panels: [],
        created: '2025-01-03T00:00:00.000Z',
        updated: '2025-01-04T00:00:00.000Z'
      }
    ] as any;
    
    const result = mapModulesToRecentActivityItems(modules, 5);
    
    expect(result.map(item => item.targetLabel)).toEqual(['Newest Module', 'Older Module']);
    expect(result[0].actionLabel).toBe('updated');
    expect(result[0].actorLabel).toBe('Maker B');
    expect(result[0].contextLabel).toBe('Module');
    expect(result[0].route).toEqual(['/modules', 'details', 1]);
  });
  
  it('uses create activity when module created and updated timestamps match', () => {
    const modules = [
      {
        id: 7,
        name: 'Fresh Module',
        description: '',
        hp: 6,
        public: true,
        manufacturerId: 22,
        manufacturer: {name: 'Maker C'},
        standard: 0,
        tags: [],
        panels: [],
        created: '2025-03-01T10:00:00.000Z',
        updated: '2025-03-01T10:00:00.000Z'
      }
    ] as any;
    
    const result = mapModulesToRecentActivityItems(modules, 5);
    
    expect(result[0].type).toBe('create');
    expect(result[0].actionLabel).toBe('created');
    expect(result[0].timestamp).toBe('2025-03-01T10:00:00.000Z');
  });
  
  it('exposes recentActivityItems$ based on current modulesList$', () => {
    const {service} = build();
    service.modulesList$.next([
      {
        id: 9,
        name: 'Activity Source',
        description: '',
        hp: 6,
        public: true,
        manufacturerId: 1,
        manufacturer: {name: 'Maker'},
        standard: 0,
        tags: [],
        panels: [],
        created: '2025-02-01T00:00:00.000Z',
        updated: '2025-02-02T00:00:00.000Z'
      }
    ] as any);
    
    let output: any[] = [];
    service.recentActivityItems$.subscribe(items => output = items);
    
    expect(output.length).toBe(1);
    expect(output[0].targetLabel).toBe('Activity Source');
  });
});