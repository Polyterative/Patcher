import { fakeAsync, tick } from '@angular/core/testing';
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
});
