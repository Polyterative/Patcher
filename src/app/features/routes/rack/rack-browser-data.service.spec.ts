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
});