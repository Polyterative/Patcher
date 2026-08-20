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
import {
  AppStateService,
  ModuleListDisplayMode
} from 'src/app/shared-interproject/app-state.service';

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

interface AppStateServiceDouble {
  moduleListDisplayMode$: Observable<ModuleListDisplayMode>;
  setModuleListDisplayMode: jasmine.Spy<(mode: ModuleListDisplayMode) => void>;
}

function asDataService(double: ManufacturerBrowserRootDataServiceDouble): ManufacturerBrowserRootDataService {
  return double as unknown as ManufacturerBrowserRootDataService;
}

function asSeoService(double: SeoAndUtilsServiceDouble): SeoAndUtilsService {
  return double as unknown as SeoAndUtilsService;
}

function asAppStateService(double: AppStateServiceDouble): AppStateService {
  return double as unknown as AppStateService;
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

function mockAppState(mode: ModuleListDisplayMode = 'list'): AppStateServiceDouble {
  return {
    moduleListDisplayMode$: of(mode),
    setModuleListDisplayMode: jasmine.createSpy<(nextMode: ModuleListDisplayMode) => void>('setModuleListDisplayMode')
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
      return new ManufacturerBrowserRootComponent(dataService, asAppStateService(mockAppState()), seo);
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
    TestBed.runInInjectionContext(() => new ManufacturerBrowserRootComponent(
      asDataService(ds),
      asAppStateService(mockAppState()),
      asSeoService(s)
    ));
    expect(emitted).toBeTrue();
  });

  it('has formTypes reference', () => {
    const comp = makeComp();
    expect(comp.formTypes).toBeDefined();
  });

  it('sets the shared module-list display mode preference', () => {
    const appStateDouble = mockAppState();
    const comp = TestBed.runInInjectionContext(() => new ManufacturerBrowserRootComponent(
      asDataService(mockDataService()),
      asAppStateService(appStateDouble),
      asSeoService(mockSeo())
    ));

    comp.setDisplayMode('panels');

    expect(appStateDouble.setModuleListDisplayMode).toHaveBeenCalledOnceWith('panels');
    comp.ngOnDestroy();
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
    const comp = TestBed.runInInjectionContext(() => new ManufacturerBrowserRootComponent(
      asDataService(ds),
      asAppStateService(mockAppState()),
      asSeoService(s)
    ));

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
        {provide: AppStateService, useValue: asAppStateService(mockAppState())},
        {provide: SeoAndUtilsService, useValue: asSeoService(mockSeo())},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    const fixture = TestBed.createComponent(ManufacturerBrowserRootComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading-shell')).not.toBeNull();
  });
});
