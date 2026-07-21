import { ManufacturerBrowserRootComponent } from './manufacturer-browser-root.component';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  Subject,
  of
} from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { ManufacturerDetail } from '../manufacturer-detail-data.service';
import { SeoSocialShareData } from 'src/app/models/seo.model';

interface ManufacturerOrderOption {
  id: string;
  name: string;
  sortColumn: 'name' | 'module_updated';
  sortDirection: 'asc' | 'desc';
}

interface ManufacturerBrowserRootDataServiceDouble {
  fields: {
    search: {
      label: string;
      control: FormControl<string>;
    };
    order: {
      label: string;
      control: FormControl<ManufacturerOrderOption | null>;
      options$: Observable<ManufacturerOrderOption[]>;
    };
  };
  serversideAdditionalData: {
    itemsCount$: BehaviorSubject<number>;
  };
  paginatorToFistPage$: Subject<void>;
  loadMore$: Subject<void>;
  manufacturers$: BehaviorSubject<ManufacturerDetail[] | null>;
  canReset$: Observable<boolean>;
  loadedCount: number;
  updateList$: Subject<void>;
}

interface SeoAndUtilsServiceDouble {
  updateSeo: jasmine.Spy<(data: SeoSocialShareData, appArea: string) => void>;
}

function asDataService(double: ManufacturerBrowserRootDataServiceDouble): ManufacturerBrowserRootDataService {
  return double as unknown as ManufacturerBrowserRootDataService;
}

function asSeoService(double: SeoAndUtilsServiceDouble): SeoAndUtilsService {
  return double as unknown as SeoAndUtilsService;
}

function mockDataService(): ManufacturerBrowserRootDataServiceDouble {
  return {
    fields: {
      search: {
        label: 'Search manufacturer...',
        control: new FormControl<string>('', {nonNullable: true}),
      },
      order: {
        label: 'Order by',
        control: new FormControl<ManufacturerOrderOption | null>(null),
        options$: of([]),
      },
    },
    serversideAdditionalData: {
      itemsCount$: new BehaviorSubject<number>(0),
    },
    paginatorToFistPage$: new Subject<void>(),
    loadMore$: new Subject<void>(),
    manufacturers$: new BehaviorSubject<ManufacturerDetail[] | null>([]),
    canReset$: of(false),
    loadedCount: 0,
    updateList$: new Subject<void>()
  };
}

function mockSeo(): SeoAndUtilsServiceDouble {
  return {
    updateSeo: jasmine.createSpy<(data: SeoSocialShareData, appArea: string) => void>('updateSeo')
  };
}

describe('ManufacturerBrowserRootComponent', () => {
  let dataService: ManufacturerBrowserRootDataService;
  let seo: SeoAndUtilsService;

  beforeEach(() => TestBed.configureTestingModule({}));

  afterEach(() => TestBed.resetTestingModule());

  function makeComp(): ManufacturerBrowserRootComponent {
    return TestBed.runInInjectionContext(() => {
      dataService = asDataService(mockDataService());
      seo = asSeoService(mockSeo());
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
    TestBed.runInInjectionContext(() => new ManufacturerBrowserRootComponent(asDataService(ds), asSeoService(s)));
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
    const comp = TestBed.runInInjectionContext(() => new ManufacturerBrowserRootComponent(asDataService(ds), asSeoService(s)));

    ds.paginatorToFistPage$.next();

    expect(scrollSpy).not.toHaveBeenCalled();
    comp.ngOnDestroy();
  });

  it('renders the initial loader while manufacturers are unresolved', () => {
    TestBed.resetTestingModule();
    const ds = mockDataService();
    ds.manufacturers$.next(null);

    TestBed.configureTestingModule({
      declarations: [ManufacturerBrowserRootComponent],
      imports: [CommonModule, AutoContentLoadingIndicatorComponent],
      providers: [
        {provide: ManufacturerBrowserRootDataService, useValue: asDataService(ds)},
        {provide: SeoAndUtilsService, useValue: asSeoService(mockSeo())},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    const fixture = TestBed.createComponent(ManufacturerBrowserRootComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading-shell')).not.toBeNull();
  });
});
