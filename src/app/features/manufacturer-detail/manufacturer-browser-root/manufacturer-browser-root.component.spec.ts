import { ManufacturerBrowserRootComponent } from './manufacturer-browser-root.component';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';

function mockDataService(): ManufacturerBrowserRootDataService {
  return {
    fields: {
      search: {
        label: 'Search manufacturer...',
        control: new FormControl<string>('', {nonNullable: true}),
      },
      order: {
        label: 'Order by',
        control: new FormControl<any>(null),
        options$: of([]),
      },
    },
    serversideAdditionalData: {
      itemsCount$: new BehaviorSubject<number>(0),
    },
    paginatorToFistPage$: new Subject<void>(),
    loadMore$: new Subject<void>(),
    manufacturers$: new BehaviorSubject<any[] | null>([]),
    canReset$: of(false),
    loadedCount: 0,
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

  it('renders the initial loader while manufacturers are unresolved', () => {
    TestBed.resetTestingModule();
    const ds = mockDataService();
    (ds.manufacturers$ as BehaviorSubject<any[] | null>).next(null);

    TestBed.configureTestingModule({
      declarations: [ManufacturerBrowserRootComponent],
      imports: [CommonModule, AutoContentLoadingIndicatorComponent],
      providers: [
        {provide: ManufacturerBrowserRootDataService, useValue: ds},
        {provide: SeoAndUtilsService, useValue: mockSeo()},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    const fixture = TestBed.createComponent(ManufacturerBrowserRootComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading-shell')).not.toBeNull();
  });
});
