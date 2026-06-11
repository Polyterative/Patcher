import { ManufacturerBrowserRootComponent } from './manufacturer-browser-root.component';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { Subject, BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';

function mockDataService(): ManufacturerBrowserRootDataService {
  return {
    paginatorToFistPage$: new Subject<void>(),
    loadMore$: new Subject<void>(),
    manufacturers$: new BehaviorSubject<any[]>([]),
    updateList$: new Subject<void>()
  } as unknown as ManufacturerBrowserRootDataService;
}

function mockSeo(): SeoAndUtilsService {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  } as unknown as SeoAndUtilsService;
}

describe('ManufacturerBrowserRootComponent', () => {
  let dataService: ManufacturerBrowserRootDataService;
  let seo: SeoAndUtilsService;

  beforeEach(() => TestBed.configureTestingModule({}));

  afterEach(() => TestBed.resetTestingModule());

  function makeComp(): ManufacturerBrowserRootComponent {
    return TestBed.runInInjectionContext(() => {
      dataService = mockDataService();
      seo = mockSeo();
      return new ManufacturerBrowserRootComponent(dataService, seo);
    });
  }

  it('creates without error', () => {
    expect(() => makeComp()).not.toThrow();
  });

  it('calls updateSeo on construction', () => {
    makeComp();
    expect(seo.updateSeo).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ title: jasmine.stringContaining('Manufacturers') }),
      'Manufacturers'
    );
  });

  it('emits updateList$ on construction', () => {
    let emitted = false;
    const ds = mockDataService();
    const s = mockSeo();
    ds.updateList$.subscribe(() => emitted = true);
    TestBed.runInInjectionContext(() => new ManufacturerBrowserRootComponent(ds, s));
    expect(emitted).toBeTrue();
  });

  it('has formTypes reference', () => {
    const comp = makeComp();
    expect(comp.formTypes).toBeDefined();
  });

  it('SEO has correct url and description', () => {
    makeComp();
    expect(seo.updateSeo).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        url: 'https://patcher.xyz/manufacturers/browser',
        description: jasmine.stringContaining('manufacturer')
      }),
      jasmine.any(String)
    );
  });

  it('does not scroll to top when paginatorToFistPage$ fires', () => {
    const scrollSpy = spyOn(window, 'scrollTo');
    const ds = mockDataService();
    const s = mockSeo();
    const comp = TestBed.runInInjectionContext(() => new ManufacturerBrowserRootComponent(ds, s));

    ds.paginatorToFistPage$.next();

    expect(scrollSpy).not.toHaveBeenCalled();
    comp.ngOnDestroy();
  });
});
