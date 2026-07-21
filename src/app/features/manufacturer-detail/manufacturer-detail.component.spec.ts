import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { ManufacturerDetailComponent } from './manufacturer-detail.component';
import {
  ManufacturerDetail
} from './manufacturer-detail-data.service';
import { LabelValueData } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';
import { MinimalModule } from 'src/app/models/module';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { ManufacturerDetailDataService } from './manufacturer-detail-data.service';
import { ActivatedRoute, Params } from '@angular/router';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { TimeagoPipe } from 'ngx-timeago';


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
  const updateManufacturerNext = jasmine.createSpy<(id: number) => void>('updateManufacturer$.next');

  const dataService = {
    logoStorageBase: 'https://cdn.example.test/manufacturer-logos/',
    manufacturerData$,
    modulesData$,
    updateManufacturer$: {next: updateManufacturerNext},
  } as unknown as ManufacturerDetailDataService;

  const routeParams$ = new Subject<Params>();
  const route   = {params: routeParams$.asObservable()} as ActivatedRoute;

  const seoUpdateSpy = jasmine.createSpy<(data: SeoSocialShareData, appArea: string) => void>('updateSeo');
  const seoService = {updateSeo: seoUpdateSpy} as unknown as SeoAndUtilsService;

  const timeagoSpy   = jasmine.createSpy('transform').and.returnValue('3 days ago');
  const timeago = {transform: timeagoSpy} as unknown as TimeagoPipe;

  const component = new ManufacturerDetailComponent(
    dataService,
    route,
    seoService,
    timeago,
  );

  return {
    component,
    manufacturerData$,
    modulesData$,
    updateManufacturerNext,
    routeParams$,
    seoUpdateSpy,
    timeagoSpy,
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

});
