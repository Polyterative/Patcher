import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { ManufacturerDetailComponent } from './manufacturer-detail.component';
import {
  ManufacturerDetail,
  ManufacturerDetailDataService
} from './manufacturer-detail-data.service';
import { LabelValueData } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';
import { MinimalModule } from 'src/app/models/module';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { ActivatedRoute, Params } from '@angular/router';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { TimeagoPipe } from 'ngx-timeago';
import { MANUFACTURER_FEATURED_MODULE_LIMIT } from './manufacturer-updates.utils';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import {
  MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE,
  ManufacturerAnalyticsDisplayRow
} from './manufacturer-analytics.utils';


function makeManufacturer(overrides: Partial<ManufacturerDetail> = {}): ManufacturerDetail {
  return {
    id: 1,
    name: 'Doepfer',
    logo: null,
    websiteURL: 'https://doepfer.de',
    changedModulesLast30Days: 0,
    latestModuleUpdatedAt: null,
    ...overrides,
  };
}

function makeModule(overrides: Partial<MinimalModule> = {}): MinimalModule {
  return {
    id: 10,
    name: 'A-110-1',
    description: '',
    hp: 8,
    public: true,
    manufacturer: {id: 1, name: 'Doepfer'},
    manufacturerId: 1,
    standard: {id: 0, name: '3U'},
    tags: [],
    panels: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStandard(id: number): MinimalModule['standard'] {
  return {id, name: id === 0 ? '3U' : '1U'};
}

function build() {
  const manufacturerData$ = new BehaviorSubject<ManufacturerDetail | null>(null);
  const modulesData$       = new BehaviorSubject<ModuleList>(null);
  const displayAggregateRows$ = new BehaviorSubject<unknown>([]);
  const isAdmin$ = new BehaviorSubject<boolean>(false);
  const updateManufacturerNext = jasmine.createSpy<(id: number) => void>('updateManufacturer$.next');

  const dataService = {
    logoStorageBase: 'https://cdn.example.test/manufacturer-logos/',
    manufacturerData$,
    modulesData$,
    displayAggregateRows$,
    isAdmin$,
    updateManufacturer$: {next: updateManufacturerNext},
  } as unknown as ManufacturerDetailDataService;

  const routeParams$ = new Subject<Params>();
  const route   = {params: routeParams$.asObservable()} as ActivatedRoute;

  const seoUpdateSpy = jasmine.createSpy<(data: SeoSocialShareData, appArea: string) => void>('updateSeo');
  const seoService = {updateSeo: seoUpdateSpy} as unknown as SeoAndUtilsService;

  const timeagoSpy   = jasmine.createSpy('transform').and.returnValue('3 days ago');
  const timeago = {transform: timeagoSpy} as unknown as TimeagoPipe;

  const urlCopySpy = jasmine.createSpy('copyTextToClipboard');
  const urlCreatorService = {copyTextToClipboard: urlCopySpy} as unknown as UrlCreatorService;

  const appState = {isDev: false} as unknown as import('src/app/shared-interproject/app-state.service').AppStateService;

  const component = new ManufacturerDetailComponent(
    dataService,
    route,
    seoService,
    timeago,
    urlCreatorService,
    appState,
  );

  return {
    component,
    manufacturerData$,
    modulesData$,
    displayAggregateRows$,
    isAdmin$,
    updateManufacturerNext,
    routeParams$,
    seoUpdateSpy,
    timeagoSpy,
    urlCopySpy,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statsSnapshot(component: ManufacturerDetailComponent): LabelValueData[] {
  let result: LabelValueData[] = [];
  component.stats$.subscribe(s => result = s).unsubscribe();
  return result;
}

// ─── stats$ ───────────────────────────────────────────────────────────────────

describe('ManufacturerDetailComponent', () => {

  it('enables module description keyword highlights on manufacturer detail module cards', () => {
    const {component} = build();

    expect(component.moduleViewConfig.highlightDescriptionKeywords).toBeTrue();
    component.ngOnDestroy();
  });

  describe('stats$', () => {

    it('returns [] when manufacturerData$ is null', () => {
      const {component, modulesData$} = build();
      modulesData$.next([]);
      expect(statsSnapshot(component)).toEqual([]);
      component.ngOnDestroy();
    });

    it('includes "In catalogue" with the module count', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer());
      modulesData$.next([makeModule(), makeModule({id: 11})]);
      const stats = statsSnapshot(component);
      const entry = stats.find(s => s.label === 'In catalogue');
      expect(entry).toBeDefined();
      expect(entry!.value).toBe('2');
      component.ngOnDestroy();
    });

    it('computes Average HP from total HP divided by count (one decimal)', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer());
      modulesData$.next([makeModule({hp: 6}), makeModule({hp: 10})]);
      const stats = statsSnapshot(component);
      const entry = stats.find(s => s.label === 'Average HP');
      expect(entry).toBeDefined();
      expect(entry!.hidden).toBeFalse();
      expect(entry!.value).toBe('8.0');
      component.ngOnDestroy();
    });

    it('hides Average HP when modules list is empty', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer());
      modulesData$.next([]);
      const stats = statsSnapshot(component);
      const entry = stats.find(s => s.label === 'Average HP');
      expect(entry!.hidden).toBeTrue();
      component.ngOnDestroy();
    });

    it('counts 3U modules (standard.id = 0) separately', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer());
      modulesData$.next([
        makeModule({standard: makeStandard(0)}),
        makeModule({standard: makeStandard(0)}),
        makeModule({standard: makeStandard(1)}),
      ]);
      const stats = statsSnapshot(component);
      const threeU = stats.find(s => s.label === '3U');
      const oneU   = stats.find(s => s.label === '1U');
      expect(threeU!.value).toBe('2');
      expect(threeU!.hidden).toBeFalse();
      expect(oneU!.value).toBe('1');
      expect(oneU!.hidden).toBeFalse();
      component.ngOnDestroy();
    });

    it('hides 3U entry when there are no 3U modules', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer());
      modulesData$.next([makeModule({standard: makeStandard(1)})]);
      const stats = statsSnapshot(component);
      const threeU = stats.find(s => s.label === '3U');
      expect(threeU!.hidden).toBeTrue();
      component.ngOnDestroy();
    });

    it('hides "Active this month" when changedModulesLast30Days is 0', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer({changedModulesLast30Days: 0}));
      modulesData$.next([]);
      const stats = statsSnapshot(component);
      const entry = stats.find(s => s.label === 'Active this month');
      expect(entry!.hidden).toBeTrue();
      component.ngOnDestroy();
    });

    it('shows "Active this month" when changedModulesLast30Days > 0', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer({changedModulesLast30Days: 5}));
      modulesData$.next([]);
      const stats = statsSnapshot(component);
      const entry = stats.find(s => s.label === 'Active this month');
      expect(entry!.hidden).toBeFalse();
      expect(entry!.value).toBe('5');
      component.ngOnDestroy();
    });

    it('shows "Last updated" when latestModuleUpdatedAt is set', () => {
      const {component, manufacturerData$, modulesData$, timeagoSpy} = build();
      const dateStr = '2026-04-01T00:00:00Z';
      manufacturerData$.next(makeManufacturer({latestModuleUpdatedAt: dateStr}));
      modulesData$.next([]);
      const stats = statsSnapshot(component);
      const entry = stats.find(s => s.label === 'Last updated');
      expect(timeagoSpy).toHaveBeenCalledWith(dateStr);
      expect(entry!.hidden).toBeFalse();
      expect(entry!.value).toBe('3 days ago');
      component.ngOnDestroy();
    });

    it('hides "Last updated" when latestModuleUpdatedAt is null', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer({latestModuleUpdatedAt: null}));
      modulesData$.next([]);
      const stats = statsSnapshot(component);
      const entry = stats.find(s => s.label === 'Last updated');
      expect(entry!.hidden).toBeTrue();
      component.ngOnDestroy();
    });
  });

  // ─── logoUrl() ──────────────────────────────────────────────────────────────

  describe('logoUrl()', () => {

    it('returns a full CDN URL when logo filename is present', () => {
      const {component} = build();
      const result = component.logoUrl(makeManufacturer({logo: 'doepfer.png'}));
      expect(result).toBe(
        'https://cdn.example.test/manufacturer-logos/doepfer.png'
      );
      component.ngOnDestroy();
    });

    it('returns null when logo is null', () => {
      const {component} = build();
      expect(component.logoUrl(makeManufacturer({logo: null}))).toBeNull();
      component.ngOnDestroy();
    });
  });

  // ─── Route id parsing ───────────────────────────────────────────────────────

  describe('route id parsing', () => {

    it('forwards a positive id to updateManufacturer$.next', () => {
      const {component, routeParams$, updateManufacturerNext} = build();
      routeParams$.next({id: '42'});
      expect(updateManufacturerNext).toHaveBeenCalledWith(42);
      component.ngOnDestroy();
    });

    it('ignores id = 0 (never calls updateManufacturer$.next)', () => {
      const {component, routeParams$, updateManufacturerNext} = build();
      routeParams$.next({id: '0'});
      expect(updateManufacturerNext).not.toHaveBeenCalled();
      component.ngOnDestroy();
    });

    it('ignores missing id param', () => {
      const {component, routeParams$, updateManufacturerNext} = build();
      routeParams$.next({});
      expect(updateManufacturerNext).not.toHaveBeenCalled();
      component.ngOnDestroy();
    });
  });

  // ─── SEO wiring ─────────────────────────────────────────────────────────────

  describe('SEO wiring', () => {

    it('updates SEO title when manufacturer data arrives', () => {
      const {component, manufacturerData$, modulesData$, seoUpdateSpy} = build();
      manufacturerData$.next(makeManufacturer({name: 'Mutable Instruments', id: 7}));
      modulesData$.next([]);
      const lastCall = seoUpdateSpy.calls.mostRecent();
      expect(lastCall.args[0].title).toBe('Mutable Instruments - Manufacturer');
      expect(lastCall.args[0].url).toContain('/manufacturers/details/7');
      expect(lastCall.args[0].image).toBeUndefined();
      component.ngOnDestroy();
    });

    it('uses the data service logo storage base for SEO images', () => {
      const {component, manufacturerData$, modulesData$, seoUpdateSpy} = build();
      manufacturerData$.next(makeManufacturer({logo: 'mutable.png'}));
      modulesData$.next([]);
      const lastCall = seoUpdateSpy.calls.mostRecent();
      expect(lastCall.args[0].image).toBe('https://cdn.example.test/manufacturer-logos/mutable.png');
      component.ngOnDestroy();
    });

    it('does not update SEO title when manufacturerData$ emits null', () => {
      const {component, seoUpdateSpy} = build();
      const baseCallCount = seoUpdateSpy.calls.count(); // constructor's initial baseline call
      // null is already the initial BehaviorSubject value so no further call occurs
      expect(seoUpdateSpy.calls.count()).toBe(baseCallCount);
      component.ngOnDestroy();
    });
  });

  // ─── featuredModules$ (display-only, no persistence) ──────────────────────

  describe('featuredModules$', () => {

    function featuredSnapshot(component: ManufacturerDetailComponent): MinimalModule[] {
      let result: MinimalModule[] = [];
      component.featuredModules$.subscribe(s => result = s).unsubscribe();
      return result;
    }

    it('returns [] when modules list is null', () => {
      const {component} = build();
      expect(featuredSnapshot(component)).toEqual([]);
      component.ngOnDestroy();
    });

    it('surfaces public modules in catalogue order', () => {
      const {component, modulesData$} = build();
      modulesData$.next([makeModule({id: 10}), makeModule({id: 11})]);
      expect(featuredSnapshot(component).map(m => m.id)).toEqual([10, 11]);
      component.ngOnDestroy();
    });

    it('excludes non-public modules', () => {
      const {component, modulesData$} = build();
      modulesData$.next([
        makeModule({id: 10, public: false}),
        makeModule({id: 11}),
      ]);
      expect(featuredSnapshot(component).map(m => m.id)).toEqual([11]);
      component.ngOnDestroy();
    });

    it('caps the featured surface at the module limit', () => {
      const {component, modulesData$} = build();
      modulesData$.next(Array.from({length: MANUFACTURER_FEATURED_MODULE_LIMIT + 2}, (_, i) => makeModule({id: 100 + i})));
      const featured = featuredSnapshot(component);
      expect(featured.length).toBe(MANUFACTURER_FEATURED_MODULE_LIMIT);
      expect(featured.map(m => m.id)).toEqual([100, 101, 102, 103, 104, 105]);
      component.ngOnDestroy();
    });

    it('returns [] for an empty catalogue without calling the featured cap', () => {
      const {component, modulesData$} = build();
      modulesData$.next([]);
      expect(featuredSnapshot(component)).toEqual([]);
      component.ngOnDestroy();
    });

    it('caps interleaved public modules while skipping private ones', () => {
      const {component, modulesData$} = build();
      const modules = Array.from({length: MANUFACTURER_FEATURED_MODULE_LIMIT + 3}, (_, i) => makeModule({
        id: 200 + i,
        public: i % 2 === 0
      }));
      modulesData$.next(modules);
      const featured = featuredSnapshot(component);
      expect(featured.length).toBeLessThanOrEqual(MANUFACTURER_FEATURED_MODULE_LIMIT);
      expect(featured.every(m => m.public !== false)).toBeTrue();
      expect(featured.map(m => m.id)).toEqual([200, 202, 204, 206, 208]);
      component.ngOnDestroy();
    });

    it('returns [] when every catalogue module is private', () => {
      const {component, modulesData$} = build();
      modulesData$.next([makeModule({id: 10, public: false}), makeModule({id: 11, public: false})]);
      expect(featuredSnapshot(component)).toEqual([]);
      component.ngOnDestroy();
    });
  });

  // ─── analyticsRows$ (threshold-gated, display copy only) ──────────────────

  describe('analyticsRows$', () => {

    it('returns [] while the display-only aggregate seam is empty', () => {
      const {component} = build();
      let result: unknown;
      component.analyticsRows$.subscribe(s => result = s).unsubscribe();
      expect(result).toEqual([]);
      component.ngOnDestroy();
    });

    it('hides below-threshold counts with generic copy and no exact count', () => {
      const {component, displayAggregateRows$} = build();
      displayAggregateRows$.next([{metricId: 'views', count: 1}]);
      let result: readonly ManufacturerAnalyticsDisplayRow[] = [];
      component.analyticsRows$.subscribe(s => result = s).unsubscribe();
      expect(result.length).toBe(1);
      expect(result[0].state).toBe('hidden');
      expect(result[0].displayValue).toBe(MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE);
      expect('count' in result[0]).toBeFalse();
      component.ngOnDestroy();
    });

    it('shows above-threshold counts with locale display values', () => {
      const {component, displayAggregateRows$} = build();
      displayAggregateRows$.next([{metricId: 'outbound_clicks', count: 3000}]);
      let result: readonly ManufacturerAnalyticsDisplayRow[] = [];
      component.analyticsRows$.subscribe(s => result = s).unsubscribe();
      expect(result).toEqual([jasmine.objectContaining({state: 'available', displayValue: '3,000', count: 3000})]);
      component.ngOnDestroy();
    });

    it('filters unknown metrics and malformed rows from the analytics surface', () => {
      const {component, displayAggregateRows$} = build();
      displayAggregateRows$.next([
        {metricId: 'viewer_user_ids', count: 100},
        {metricId: 'views'},
        null,
        {metricId: 'views', count: 12}
      ]);
      let result: readonly ManufacturerAnalyticsDisplayRow[] = [];
      component.analyticsRows$.subscribe(s => result = s).unsubscribe();
      expect(result).toEqual([jasmine.objectContaining({metricId: 'views', state: 'available', count: 12})]);
      expect(JSON.stringify(result)).not.toContain('viewer_user_ids');
      component.ngOnDestroy();
    });

    it('keeps every below-threshold row hidden without exposing exact counts', () => {
      const {component, displayAggregateRows$} = build();
      displayAggregateRows$.next([
        {metricId: 'views', count: 1},
        {metricId: 'collection_count', count: 2}
      ]);
      let result: readonly ManufacturerAnalyticsDisplayRow[] = [];
      component.analyticsRows$.subscribe(s => result = s).unsubscribe();
      expect(result.length).toBe(2);
      for (const row of result) {
        expect(row.state).toBe('hidden');
        expect(row.displayValue).toBe(MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE);
        expect('count' in row).toBeFalse();
      }
      component.ngOnDestroy();
    });
  });

  // ─── widgetCard$ (embed preview, public fields only) ──────────────────────

  describe('widgetCard$', () => {

    function widgetSnapshot(component: ManufacturerDetailComponent) {
      let result: {manufacturer: {canonicalUrl: string}; module: {canonicalUrl: string}} | null | undefined;
      component.widgetCard$.subscribe(s => result = s).unsubscribe();
      return result;
    }

    it('returns null when manufacturer data is missing', () => {
      const {component, modulesData$} = build();
      modulesData$.next([makeModule()]);
      expect(widgetSnapshot(component)).toBeNull();
      component.ngOnDestroy();
    });

    it('returns null when no public module exists', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer());
      modulesData$.next([makeModule({public: false})]);
      expect(widgetSnapshot(component)).toBeNull();
      component.ngOnDestroy();
    });

    it('returns null when the module list is null or empty', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer());
      expect(widgetSnapshot(component)).toBeNull();
      modulesData$.next([]);
      expect(widgetSnapshot(component)).toBeNull();
      component.ngOnDestroy();
    });

    it('serializes a preview contract for the first public module', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer({id: 1, name: 'Doepfer'}));
      modulesData$.next([makeModule({id: 10, name: 'A-110-1'})]);
      const card = widgetSnapshot(component);
      expect(card!.manufacturer.canonicalUrl).toBe('https://patcher.xyz/manufacturers/details/1');
      expect(card!.module.canonicalUrl).toBe('https://patcher.xyz/modules/details/10');
      expect(JSON.stringify(card)).not.toContain('adminUser');
      component.ngOnDestroy();
    });
  });

  // ─── widgetEmbedSnippet$ (copyable display-only snippet, no endpoint) ───

  describe('widgetEmbedSnippet$', () => {

    function snippetSnapshot(component: ManufacturerDetailComponent): string | null {
      let result: string | null = null;
      component.widgetEmbedSnippet$.subscribe(s => result = s).unsubscribe();
      return result;
    }

    it('returns null when no public module exists (no backend fetch)', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer());
      modulesData$.next([makeModule({public: false})]);
      expect(snippetSnapshot(component)).toBeNull();
      component.ngOnDestroy();
    });

    it('derives a static blockquote snippet with canonical URLs and no endpoint', () => {
      const {component, manufacturerData$, modulesData$} = build();
      manufacturerData$.next(makeManufacturer({id: 1, name: 'Doepfer'}));
      modulesData$.next([makeModule({id: 10, name: 'A-110-1'})]);
      const snippet = snippetSnapshot(component);
      expect(snippet).toContain('<blockquote');
      expect(snippet).toContain('https://patcher.xyz/modules/details/10');
      expect(snippet).not.toContain('<script');
      expect(snippet).not.toContain('<iframe');
      expect(snippet).not.toContain('adminUser');
      component.ngOnDestroy();
    });

    it('delegates snippet copying to UrlCreatorService with copy messaging', () => {
      const {component, urlCopySpy} = build();
      component.copyWidgetSnippet('<blockquote>embed</blockquote>');
      expect(urlCopySpy).toHaveBeenCalledWith(
        '<blockquote>embed</blockquote>',
        'Widget embed snippet copied to clipboard.',
        'Clipboard write failed — copy the snippet manually.'
      );
      component.ngOnDestroy();
    });

    it('ignores empty snippet copy requests', () => {
      const {component, urlCopySpy} = build();
      component.copyWidgetSnippet(null);
      component.copyWidgetSnippet('');
      expect(urlCopySpy).not.toHaveBeenCalled();
      component.ngOnDestroy();
    });
  });

});
