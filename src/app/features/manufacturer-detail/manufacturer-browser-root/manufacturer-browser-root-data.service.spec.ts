import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  BehaviorSubject,
  Observable,
  of
} from 'rxjs';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ManufacturerDetail } from '../manufacturer-detail-data.service';


interface ManufacturerPageResponse {
  data: ManufacturerDetail[] | null;
  count: number;
  error: {message: string} | null;
}

type ManufacturersPaginated = (
  from: number,
  to?: number,
  name?: string,
  orderBy?: string,
  orderDirection?: string
) => Observable<ManufacturerPageResponse>;

interface BrowserBackendDouble {
  GET: {
    manufacturersPaginated: jasmine.Spy<ManufacturersPaginated>;
  };
}

interface ManufacturerBrowserRootDataServiceInternals {
  _manufacturers$: BehaviorSubject<ManufacturerDetail[] | null>;
}

function serviceInternals(service: ManufacturerBrowserRootDataService): ManufacturerBrowserRootDataServiceInternals {
  return service as unknown as ManufacturerBrowserRootDataServiceInternals;
}

function buildService(paginatedReturn?: ManufacturerPageResponse) {
  const defaultReturn: ManufacturerPageResponse = {
    data: [
      {id: 1, name: 'Mutable', logo: null},
      {id: 2, name: 'Make Noise', logo: null},
    ],
    count: 2,
    error: null
  };
  const backend = {
    GET: {
      manufacturersPaginated: jasmine.createSpy<ManufacturersPaginated>('manufacturersPaginated')
        .and.returnValue(of(paginatedReturn ?? defaultReturn))
    }
  } satisfies BrowserBackendDouble;
  const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
  const service = new ManufacturerBrowserRootDataService(
    backend as unknown as SupabaseService,
    snackBar as MatSnackBar
  );
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
    const emitted: (ManufacturerDetail[] | null)[] = [];
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

  it('passes the debounced search term to manufacturersPaginated', fakeAsync(() => {
    const {service, backend} = buildService();
    service.fields.search.control.setValue('make noise');

    tick(400);

    const args = backend.GET.manufacturersPaginated.calls.mostRecent().args;
    expect(args[2]).toBe('make noise');
    service.ngOnDestroy();
  }));
  
  it('loadMore$ appends results and advances skip', fakeAsync(() => {
    const {service, backend} = buildService();
    const firstBatch: ManufacturerDetail[] = Array.from({length: 10}, (_, i) => ({
      id: i + 1,
      name: `Manufacturer ${i + 1}`,
      logo: null,
    }));
    serviceInternals(service)._manufacturers$.next(firstBatch);
    service.serversideAdditionalData.itemsCount$.next(30);
    const before = backend.GET.manufacturersPaginated.calls.count();
    service.loadMore$.next();
    tick();
    expect(service.serversideTableRequestData.skip$.value).toBe(10);
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
    const emitted: (ManufacturerDetail[] | null)[] = [];
    service.manufacturers$.subscribe(v => emitted.push(v));
    service.updateList$.next();
    tick();
    expect(emitted.length).toBeGreaterThan(0);
  }));
  
  it('ngOnDestroy cleans up without error', () => {
    const {service} = buildService();
    expect(() => service.ngOnDestroy()).not.toThrow();
  });
  
  it('resetForm$ triggers exactly one backend call, not two (no double reload)', fakeAsync(() => {
    const {service, backend} = buildService();
    tick(400);
    backend.GET.manufacturersPaginated.calls.reset();
    
    service.resetForm$.next();
    expect(backend.GET.manufacturersPaginated.calls.count()).toBe(1);
    
    tick(400);
    expect(backend.GET.manufacturersPaginated.calls.count()).toBe(1);
    
    service.ngOnDestroy();
  }));
});
