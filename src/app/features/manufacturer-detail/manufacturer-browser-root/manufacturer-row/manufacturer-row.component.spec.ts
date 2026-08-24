import {
  Component,
  Input
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import {
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  groupModulesByPhysicalStandard,
  ManufacturerRowComponent
} from './manufacturer-row.component';
import { defaultModuleMinimalViewConfig } from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { ManufacturerDetail } from '../../manufacturer-detail-data.service';
import { MinimalModule } from 'src/app/models/module';
import { ModuleRecentMarketPrice } from 'src/app/features/backend/supabase-queries';
import { ManufacturerRowDataService } from './manufacturer-row-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  AppStateService,
  ModuleListDisplayMode
} from 'src/app/shared-interproject/app-state.service';

type ManufacturerRowModule = Pick<MinimalModule, 'id' | 'standard'> & Partial<MinimalModule>;

type ManufacturerRowDataServiceMock = {
  canLoadRecentModuleMarketPrices: boolean;
  logoStorageBase: string;
  modulesBySameManufacturer: jasmine.Spy;
  recentModuleMarketPrices: jasmine.Spy;
};

type AppStateServiceMock = {
  preferredPanelColor$: Observable<number | null>;
  moduleListDisplayMode$: Observable<ModuleListDisplayMode>;
};

function makeManufacturer(id = 1): ManufacturerDetail {
  return { id, name: 'Acme', logo: null } as unknown as ManufacturerDetail;
}

function makeModule(id: number, standardId: number | undefined): ManufacturerRowModule {
  return {
    id,
    standard: standardId === undefined ? undefined : { id: standardId, name: `Standard ${standardId}` }
  } as ManufacturerRowModule;
}

function makeDataServiceMock(
  modules$: Observable<ManufacturerRowModule[] | null> = of([makeModule(101, 0)]),
  summaries$: Observable<ModuleRecentMarketPrice[]> = of([])
): ManufacturerRowDataServiceMock {
  return {
    modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(modules$),
    recentModuleMarketPrices: jasmine.createSpy('recentModuleMarketPrices').and.returnValue(summaries$),
    canLoadRecentModuleMarketPrices: true,
    logoStorageBase: 'https://cdn.example.test/manufacturer-logos/'
  } as ManufacturerRowDataServiceMock;
}

function makeAppStateMock(mode: ModuleListDisplayMode = 'list'): AppStateServiceMock {
  return {
    preferredPanelColor$: of(null),
    moduleListDisplayMode$: of(mode)
  };
}

function makeComponent(
  dataService: ManufacturerRowDataServiceMock,
  appState: AppStateServiceMock = makeAppStateMock()
): ManufacturerRowComponent {
  return new ManufacturerRowComponent(
    dataService as unknown as ManufacturerRowDataService,
    appState as unknown as AppStateService
  );
}

// Lightweight stand-ins for the heavy module-parts components so the
// rendering tests below only exercise ManufacturerRowComponent's own
// displayMode/forceListMode branching, not the full module rendering stack.
@Component({selector: 'app-module-panel-wall', template: '', standalone: true})
class StubModulePanelWallComponent {
  @Input() modules: unknown;
  @Input() preferredPanelColor: unknown;
  @Input() wrap: unknown;
}

@Component({selector: 'lib-clean-card', template: '<ng-content></ng-content>', standalone: true})
class StubCleanCardComponent {}

@Component({selector: 'app-module-minimal', template: '', standalone: true})
class StubModuleMinimalComponent {
  @Input() data: unknown;
  @Input() viewConfig: unknown;
  @Input() priceSummary: unknown;
}

@Component({selector: 'app-manufacturer-updated-badge', template: '', standalone: true})
class StubManufacturerUpdatedBadgeComponent {
  @Input() updatedAt: unknown;
}

@Component({selector: 'lib-auto-content-loading-indicator', template: '', standalone: true})
class StubAutoContentLoadingIndicatorComponent {
  @Input() loadingLines: unknown;
  @Input() skipFirstData: unknown;
}

function makeSupabaseServiceDouble(
  modules$: Observable<ManufacturerRowModule[] | null> = of([makeModule(101, 0)])
): SupabaseService {
  return {
    get: {
      modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(modules$)
    },
    GET: {
      recentModuleMarketPrices: jasmine.createSpy('recentModuleMarketPrices').and.returnValue(of([]))
    },
    storage: {
      publicUrlBases: {
        manufacturerLogos: 'https://cdn.example.test/manufacturer-logos/'
      }
    }
  } as unknown as SupabaseService;
}

function renderManufacturerRow(
  moduleListDisplayMode$: Observable<ModuleListDisplayMode>,
  forceListMode: boolean,
  displayMode: ModuleListDisplayMode | null = null,
  modules$: Observable<ManufacturerRowModule[] | null> = of([makeModule(101, 0)])
) {
  TestBed.configureTestingModule({
    imports: [ManufacturerRowComponent, RouterTestingModule],
    providers: [
      { provide: SupabaseService, useValue: makeSupabaseServiceDouble(modules$) },
      {
        provide: AppStateService,
        useValue: { preferredPanelColor$: of(null), moduleListDisplayMode$ }
      }
    ]
  }).overrideComponent(ManufacturerRowComponent, {
    set: {
      imports: [
        CommonModule,
        RouterModule,
        StubModulePanelWallComponent,
        StubCleanCardComponent,
        StubModuleMinimalComponent,
        StubManufacturerUpdatedBadgeComponent,
        StubAutoContentLoadingIndicatorComponent
      ]
    }
  });

  const fixture = TestBed.createComponent(ManufacturerRowComponent);
  fixture.componentInstance.manufacturer = makeManufacturer(1);
  fixture.componentInstance.forceListMode = forceListMode;
  fixture.componentInstance.displayMode = displayMode;
  fixture.detectChanges();
  return fixture;
}

describe('ManufacturerRowComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      const dataService = makeDataServiceMock();
      expect(() => makeComponent(dataService)).not.toThrow();
    });

    it('modules$ starts as null', () => {
      const dataService = makeDataServiceMock();
      const comp = makeComponent(dataService);
      let initial: ManufacturerRowModule[] | null | undefined;
      comp.modules$.subscribe(v => (initial = v)).unsubscribe();
      expect(initial).toBeNull();
    });

    it('hideRowLink defaults to false', () => {
      const dataService = makeDataServiceMock();
      const comp = makeComponent(dataService);
      expect(comp.hideRowLink).toBeFalse();
    });

    it('showPriceSummary defaults to false', () => {
      const dataService = makeDataServiceMock();
      const comp = makeComponent(dataService);
      expect(comp.showPriceSummary).toBeFalse();
    });

    it('forceListMode defaults to false', () => {
      const dataService = makeDataServiceMock();
      const comp = makeComponent(dataService);
      expect(comp.forceListMode).toBeFalse();
    });

    it('exposes the manufacturer logo storage base from the data service', () => {
      const dataService = makeDataServiceMock();
      const comp = makeComponent(dataService);

      expect(comp.logoStorageBase).toBe('https://cdn.example.test/manufacturer-logos/');
    });

    it('exposes the shared display mode preference to the template fallback', () => {
      const appState = makeAppStateMock('panels');
      const comp = makeComponent(makeDataServiceMock(), appState);

      expect(comp.appState.moduleListDisplayMode$).toBe(appState.moduleListDisplayMode$);
    });

    it('accepts an optional local display mode override', () => {
      const comp = makeComponent(makeDataServiceMock());

      comp.displayMode = 'panels';

      expect(comp.displayMode).toBe('panels');
    });
  });

  describe('groupModulesByPhysicalStandard', () => {
    it('orders panel groups as 3U, 1U, then Other while preserving module order inside each group', () => {
      const modules = [
        makeModule(1, 1),
        makeModule(2, 0),
        makeModule(3, 2),
        makeModule(4, 99),
        makeModule(5, 0),
      ] as MinimalModule[];

      const groups = groupModulesByPhysicalStandard(modules);

      expect(groups.map(group => group.label)).toEqual(['3U', '1U', 'Other']);
      expect(groups.map(group => group.modules.map(module => module.id))).toEqual([[2, 5], [1, 3], [4]]);
    });

    it('omits empty physical standard groups', () => {
      const groups = groupModulesByPhysicalStandard([
        makeModule(1, 0),
      ] as MinimalModule[]);

      expect(groups.map(group => group.label)).toEqual(['3U']);
    });

    it('keeps unknown and missing standards in the final Other group', () => {
      const groups = groupModulesByPhysicalStandard([
        makeModule(1, 9),
        makeModule(2, undefined),
      ] as MinimalModule[]);

      expect(groups.map(group => group.label)).toEqual(['Other']);
      expect(groups[0].modules.map(module => module.id)).toEqual([1, 2]);
    });
  });

  describe('moduleViewConfig', () => {
    it('is based on defaultModuleMinimalViewConfig', () => {
      const dataService = makeDataServiceMock();
      const comp = makeComponent(dataService);
      expect(comp.moduleViewConfig).toBeTruthy();
    });

    it('sets hideButtons = true', () => {
      const comp = makeComponent(makeDataServiceMock());
      expect(comp.moduleViewConfig.hideButtons).toBeTrue();
    });

    it('sets hideManufacturer = true', () => {
      const comp = makeComponent(makeDataServiceMock());
      expect(comp.moduleViewConfig.hideManufacturer).toBeTrue();
    });

    it('sets tagsMaxCount = 0', () => {
      const comp = makeComponent(makeDataServiceMock());
      expect(comp.moduleViewConfig.tagsMaxCount).toBe(0);
    });

    it('sets hideTags = true', () => {
      const comp = makeComponent(makeDataServiceMock());
      expect(comp.moduleViewConfig.hideTags).toBeTrue();
    });
  });

  describe('ngOnInit', () => {
    it('loads modules for manufacturer.id', () => {
      const dataService = makeDataServiceMock();
      const comp = makeComponent(dataService);
      comp.manufacturer = makeManufacturer(42);
      comp.ngOnInit();
      expect(dataService.modulesBySameManufacturer).toHaveBeenCalledWith(42);
    });

    it('emits modules from backend into modules$', () => {
      const modules = [makeModule(1, 0), makeModule(2, 1)];
      const dataService = makeDataServiceMock(of(modules));
      const comp = makeComponent(dataService);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();

      let result: ManufacturerRowModule[] | null | undefined;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toEqual(modules);
    });

    it('emits [] when backend returns null', () => {
      const dataService = makeDataServiceMock(of(null));
      const comp = makeComponent(dataService);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();

      let result: ManufacturerRowModule[] | null | undefined;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toEqual([]);
    });

    it('stops subscription on destroy', () => {
      const subject = new Subject<ManufacturerRowModule[] | null>();
      const dataService = makeDataServiceMock(subject.asObservable());
      const comp = makeComponent(dataService);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();
      comp.ngOnDestroy();

      subject.next([makeModule(99, 0)]);

      // modules$ should still be null (never emitted before destroy)
      let result: ManufacturerRowModule[] | null | undefined;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toBeNull();
    });

    it('does not fetch price summaries by default', () => {
      const dataService = makeDataServiceMock(of([makeModule(2, 0), makeModule(1, 1)]));
      const comp = makeComponent(dataService);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();

      expect(dataService.recentModuleMarketPrices).not.toHaveBeenCalled();
      comp.ngOnDestroy();
    });

    it('fetches price summaries for unique sorted module ids when enabled by parent', () => {
      const summary: ModuleRecentMarketPrice = {
        moduleId: 1,
        estimatedPriceEurMinor: 39900,
        displayPrice: '~€399',
        storeCount: 4,
        latestObservedAt: '2026-07-01T00:00:00.000Z',
        tooltip: 'Recent market price: ~€399 from 4 stores.'
      };
      const dataService = makeDataServiceMock(
        of([makeModule(2, 0), makeModule(1, 1), makeModule(2, 0)]),
        of([summary])
      );
      const comp = makeComponent(dataService);
      comp.manufacturer = makeManufacturer(1);
      comp.showPriceSummary = true;
      comp.ngOnInit();

      expect(dataService.recentModuleMarketPrices).toHaveBeenCalledOnceWith([1, 2]);

      let result: ReadonlyMap<number, ModuleRecentMarketPrice> | undefined;
      comp.priceSummaryByModuleId$.subscribe(v => (result = v)).unsubscribe();
      expect(result.get(1)).toEqual(summary);
      comp.ngOnDestroy();
    });

    it('does not fetch price summaries when there are no modules', () => {
      const dataService = makeDataServiceMock(of([]));
      const comp = makeComponent(dataService);
      comp.manufacturer = makeManufacturer(1);
      comp.showPriceSummary = true;
      comp.ngOnInit();

      expect(dataService.recentModuleMarketPrices).not.toHaveBeenCalled();
      comp.ngOnDestroy();
    });
  });

  describe('displayMode rendering', () => {
    it('falls back to the global preference when no local display mode is supplied', () => {
      const fixture = renderManufacturerRow(of('panels'), false);

      expect(fixture.nativeElement.querySelector('app-module-panel-wall')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.module-strip')).toBeNull();
    });

    it('renders the compact list when the local display mode input overrides a global panels preference', () => {
      const fixture = renderManufacturerRow(of('panels'), false, 'list');

      expect(fixture.nativeElement.querySelector('app-module-panel-wall')).toBeNull();
      expect(fixture.nativeElement.querySelector('.module-strip')).not.toBeNull();
    });

    it('renders panel groups when the local display mode input overrides a global list preference', () => {
      const fixture = renderManufacturerRow(of('list'), false, 'panels');

      expect(fixture.nativeElement.querySelector('app-module-panel-wall')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.module-strip')).toBeNull();
    });

    it('renders the compact list instead of the panel wall when forceListMode is true, even if the global preference is panels (e.g. the module detail page)', () => {
      const fixture = renderManufacturerRow(of('panels'), true, 'panels');

      expect(fixture.nativeElement.querySelector('app-module-panel-wall')).toBeNull();
      expect(fixture.nativeElement.querySelector('.module-strip')).not.toBeNull();
    });

    it('renders one labeled nowrap panel wall per physical standard group', () => {
      const fixture = renderManufacturerRow(
        of('list'),
        false,
        'panels',
        of([
          makeModule(1, 1),
          makeModule(2, 0),
          makeModule(3, 2),
          makeModule(4, 9),
        ])
      );

      const labels = Array.from(
        fixture.nativeElement.querySelectorAll('.manufacturer-row-panel-group-label')
      ).map(label => (label as HTMLElement).textContent?.trim());
      const panelWalls = fixture.debugElement.queryAll(By.directive(StubModulePanelWallComponent));

      expect(labels).toEqual(['3U', '1U', 'Other']);
      expect(panelWalls.map(wall => wall.componentInstance.wrap)).toEqual([false, false, false]);
      expect(panelWalls.map(wall => wall.componentInstance.modules.map((module: ManufacturerRowModule) => module.id)))
        .toEqual([[2], [1, 3], [4]]);
    });
  });
});
