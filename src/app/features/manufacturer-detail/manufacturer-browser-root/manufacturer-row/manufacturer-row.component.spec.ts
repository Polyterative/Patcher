import {
  Observable,
  of,
  Subject
} from 'rxjs';
import { ManufacturerRowComponent } from './manufacturer-row.component';
import { defaultModuleMinimalViewConfig } from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { ManufacturerDetail } from '../../manufacturer-detail-data.service';
import { ModuleRecentMarketPrice } from 'src/app/features/backend/supabase-queries';
import { ManufacturerRowDataService } from './manufacturer-row-data.service';

type ManufacturerRowModule = { id: number };

type ManufacturerRowDataServiceMock = {
  canLoadRecentModuleMarketPrices: boolean;
  logoStorageBase: string;
  modulesBySameManufacturer: jasmine.Spy;
  recentModuleMarketPrices: jasmine.Spy;
};

function makeManufacturer(id = 1): ManufacturerDetail {
  return { id, name: 'Acme', logo: null } as unknown as ManufacturerDetail;
}

function makeDataServiceMock(
  modules$: Observable<ManufacturerRowModule[] | null> = of([{ id: 101 }]),
  summaries$: Observable<ModuleRecentMarketPrice[]> = of([])
): ManufacturerRowDataServiceMock {
  return {
    modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(modules$),
    recentModuleMarketPrices: jasmine.createSpy('recentModuleMarketPrices').and.returnValue(summaries$),
    canLoadRecentModuleMarketPrices: true,
    logoStorageBase: 'https://cdn.example.test/manufacturer-logos/'
  } as ManufacturerRowDataServiceMock;
}

function makeComponent(dataService: ManufacturerRowDataServiceMock): ManufacturerRowComponent {
  return new ManufacturerRowComponent(dataService as unknown as ManufacturerRowDataService);
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

    it('exposes the manufacturer logo storage base from the data service', () => {
      const dataService = makeDataServiceMock();
      const comp = makeComponent(dataService);

      expect(comp.logoStorageBase).toBe('https://cdn.example.test/manufacturer-logos/');
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
      const modules = [{ id: 1 }, { id: 2 }];
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

      subject.next([{ id: 99 }]);

      // modules$ should still be null (never emitted before destroy)
      let result: ManufacturerRowModule[] | null | undefined;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toBeNull();
    });

    it('does not fetch price summaries by default', () => {
      const dataService = makeDataServiceMock(of([{ id: 2 }, { id: 1 }]));
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
        of([{ id: 2 }, { id: 1 }, { id: 2 }]),
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
});
