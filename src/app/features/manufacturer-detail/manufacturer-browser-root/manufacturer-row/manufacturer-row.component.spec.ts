import {
  Observable,
  of,
  Subject
} from 'rxjs';
import { ManufacturerRowComponent } from './manufacturer-row.component';
import { defaultModuleMinimalViewConfig } from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { ManufacturerDetail } from '../../manufacturer-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ModuleRecentMarketPrice } from 'src/app/features/backend/supabase-queries';

type ManufacturerRowModule = { id: number };

interface ManufacturerRowBackendMock extends SupabaseService {
  get: SupabaseService['get'] & {
    modulesBySameManufacturer: jasmine.Spy;
  };
  GET: SupabaseService['GET'] & {
    recentModuleMarketPrices: jasmine.Spy;
  };
}

function makeManufacturer(id = 1): ManufacturerDetail {
  return { id, name: 'Acme', logo: null } as unknown as ManufacturerDetail;
}

function makeBackendMock(
  modules$: Observable<ManufacturerRowModule[] | null> = of([{ id: 101 }]),
  summaries$: Observable<ModuleRecentMarketPrice[]> = of([])
): ManufacturerRowBackendMock {
  return {
    get: {
      modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(modules$)
    },
    GET: {
      recentModuleMarketPrices: jasmine.createSpy('recentModuleMarketPrices').and.returnValue(summaries$)
    }
  } as unknown as ManufacturerRowBackendMock;
}

describe('ManufacturerRowComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      const backend = makeBackendMock();
      expect(() => new ManufacturerRowComponent(backend)).not.toThrow();
    });

    it('modules$ starts as null', () => {
      const backend = makeBackendMock();
      const comp = new ManufacturerRowComponent(backend);
      let initial: ManufacturerRowModule[] | null | undefined;
      comp.modules$.subscribe(v => (initial = v)).unsubscribe();
      expect(initial).toBeNull();
    });

    it('hideRowLink defaults to false', () => {
      const backend = makeBackendMock();
      const comp = new ManufacturerRowComponent(backend);
      expect(comp.hideRowLink).toBeFalse();
    });

    it('showPriceSummary defaults to false', () => {
      const backend = makeBackendMock();
      const comp = new ManufacturerRowComponent(backend);
      expect(comp.showPriceSummary).toBeFalse();
    });
  });

  describe('moduleViewConfig', () => {
    it('is based on defaultModuleMinimalViewConfig', () => {
      const backend = makeBackendMock();
      const comp = new ManufacturerRowComponent(backend);
      expect(comp.moduleViewConfig).toBeTruthy();
    });

    it('sets hideButtons = true', () => {
      const comp = new ManufacturerRowComponent(makeBackendMock());
      expect(comp.moduleViewConfig.hideButtons).toBeTrue();
    });

    it('sets hideManufacturer = true', () => {
      const comp = new ManufacturerRowComponent(makeBackendMock());
      expect(comp.moduleViewConfig.hideManufacturer).toBeTrue();
    });

    it('sets tagsMaxCount = 0', () => {
      const comp = new ManufacturerRowComponent(makeBackendMock());
      expect(comp.moduleViewConfig.tagsMaxCount).toBe(0);
    });

    it('sets hideTags = true', () => {
      const comp = new ManufacturerRowComponent(makeBackendMock());
      expect(comp.moduleViewConfig.hideTags).toBeTrue();
    });
  });

  describe('ngOnInit', () => {
    it('calls backend.get.modulesBySameManufacturer with manufacturer.id', () => {
      const backend = makeBackendMock();
      const comp = new ManufacturerRowComponent(backend);
      comp.manufacturer = makeManufacturer(42);
      comp.ngOnInit();
      expect(backend.get.modulesBySameManufacturer).toHaveBeenCalledWith(42, 0, 29);
    });

    it('emits modules from backend into modules$', () => {
      const modules = [{ id: 1 }, { id: 2 }];
      const backend = makeBackendMock(of(modules));
      const comp = new ManufacturerRowComponent(backend);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();

      let result: ManufacturerRowModule[] | null | undefined;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toEqual(modules);
    });

    it('emits [] when backend returns null', () => {
      const backend = makeBackendMock(of(null));
      const comp = new ManufacturerRowComponent(backend);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();

      let result: ManufacturerRowModule[] | null | undefined;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toEqual([]);
    });

    it('stops subscription on destroy', () => {
      const subject = new Subject<ManufacturerRowModule[] | null>();
      const backend = makeBackendMock(subject.asObservable());
      const comp = new ManufacturerRowComponent(backend);
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
      const backend = makeBackendMock(of([{ id: 2 }, { id: 1 }]));
      const comp = new ManufacturerRowComponent(backend);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();

      expect(backend.GET.recentModuleMarketPrices).not.toHaveBeenCalled();
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
      const backend = makeBackendMock(
        of([{ id: 2 }, { id: 1 }, { id: 2 }]),
        of([summary])
      );
      const comp = new ManufacturerRowComponent(backend);
      comp.manufacturer = makeManufacturer(1);
      comp.showPriceSummary = true;
      comp.ngOnInit();

      expect(backend.GET.recentModuleMarketPrices).toHaveBeenCalledOnceWith([1, 2]);

      let result: ReadonlyMap<number, ModuleRecentMarketPrice> | undefined;
      comp.priceSummaryByModuleId$.subscribe(v => (result = v)).unsubscribe();
      expect(result.get(1)).toEqual(summary);
      comp.ngOnDestroy();
    });

    it('does not fetch price summaries when there are no modules', () => {
      const backend = makeBackendMock(of([]));
      const comp = new ManufacturerRowComponent(backend);
      comp.manufacturer = makeManufacturer(1);
      comp.showPriceSummary = true;
      comp.ngOnInit();

      expect(backend.GET.recentModuleMarketPrices).not.toHaveBeenCalled();
      comp.ngOnDestroy();
    });
  });
});
