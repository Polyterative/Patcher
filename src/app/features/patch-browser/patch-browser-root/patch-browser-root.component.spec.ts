import { PatchBrowserRootComponent } from './patch-browser-root.component';
import { PatchBrowserDataService } from 'src/app/features/patch-browser/patch-browser-data.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { Subject, BehaviorSubject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';

function mockDataService(): PatchBrowserDataService {
  return {
    paginatorToFistPage$: new Subject<void>(),
    loadMore$: new Subject<void>(),
    patchesList$: new BehaviorSubject(null),
    updatePatchesList$: new Subject<void>(),
    serversideTableRequestData: { sort$: new Subject() },
    fields: {
      order: {
        control: new FormControl()
      }
    }
  } as unknown as PatchBrowserDataService;
}

function mockSeo(): SeoAndUtilsService {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  } as unknown as SeoAndUtilsService;
}

describe('PatchBrowserRootComponent', () => {
  let dataService: PatchBrowserDataService;
  let seo: SeoAndUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: document }]
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  function makeComp(): PatchBrowserRootComponent {
    return TestBed.runInInjectionContext(() => {
      dataService = mockDataService();
      seo = mockSeo();
      return new PatchBrowserRootComponent(dataService, seo);
    });
  }

  it('creates without error', () => {
    expect(() => makeComp()).not.toThrow();
  });

  it('calls updateSeo with "Patches"', () => {
    makeComp();
    expect(seo.updateSeo).toHaveBeenCalledWith(
      jasmine.objectContaining({ description: jasmine.any(String) }),
      'Patches'
    );
  });

  it('formTypes is defined', () => {
    expect(makeComp().formTypes).toBeDefined();
  });

  it('emits updatePatchesList$ on construction', () => {
    let emitted = false;
    const ds = mockDataService();
    ds.updatePatchesList$.subscribe(() => emitted = true);
    TestBed.runInInjectionContext(() => new PatchBrowserRootComponent(ds, mockSeo()));
    expect(emitted).toBeTrue();
  });

  it('viewConfig has hideButtons=true and hideDates=false', () => {
    const comp = makeComp();
    expect(comp.viewConfig.hideButtons).toBeTrue();
    expect(comp.viewConfig.hideDates).toBeFalse();
  });

  it('initialises default sort to updated descending', () => {
    const ds = mockDataService();
    const sortSpy = spyOn(ds.serversideTableRequestData.sort$, 'next').and.callThrough();
    TestBed.runInInjectionContext(() => new PatchBrowserRootComponent(ds, mockSeo()));
    expect(sortSpy).toHaveBeenCalledWith(['updated', 'desc']);
    expect(ds.fields.order.control.value).toEqual({id: 'updated', name: 'Updated ↓'});
  });

  it('scrolls to top when paginatorToFistPage$ fires', () => {
    const mockDoc = {defaultView: {scrollTo: jasmine.createSpy('scrollTo')}};
    TestBed.overrideProvider(DOCUMENT, {useValue: mockDoc});

    const ds = mockDataService();
    const comp = TestBed.runInInjectionContext(() => new PatchBrowserRootComponent(ds, mockSeo()));

    ds.paginatorToFistPage$.next();

    expect(mockDoc.defaultView.scrollTo).toHaveBeenCalledWith({top: 0, behavior: 'smooth'});
    comp.ngOnDestroy();
  });
});
