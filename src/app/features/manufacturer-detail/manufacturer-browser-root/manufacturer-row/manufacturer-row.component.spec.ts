import { of, Subject } from 'rxjs';
import { ManufacturerRowComponent } from './manufacturer-row.component';
import { defaultModuleMinimalViewConfig } from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { ManufacturerDetail } from '../../manufacturer-detail-data.service';

function makeManufacturer(id = 1): ManufacturerDetail {
  return { id, name: 'Acme', logo: null } as unknown as ManufacturerDetail;
}

function makeBackendMock(modules$ = of([{ id: 101 }])) {
  return {
    get: {
      modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(modules$)
    }
  } as any;
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
      let initial: any;
      comp.modules$.subscribe(v => (initial = v)).unsubscribe();
      expect(initial).toBeNull();
    });

    it('hideRowLink defaults to false', () => {
      const backend = makeBackendMock();
      const comp = new ManufacturerRowComponent(backend);
      expect(comp.hideRowLink).toBeFalse();
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

      let result: any;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toEqual(modules);
    });

    it('emits [] when backend returns null', () => {
      const backend = makeBackendMock(of(null));
      const comp = new ManufacturerRowComponent(backend);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();

      let result: any;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toEqual([]);
    });

    it('stops subscription on destroy', () => {
      const subject = new Subject<any>();
      const backend = makeBackendMock(subject.asObservable());
      const comp = new ManufacturerRowComponent(backend);
      comp.manufacturer = makeManufacturer(1);
      comp.ngOnInit();
      comp.ngOnDestroy();

      subject.next([{ id: 99 }]);

      // modules$ should still be null (never emitted before destroy)
      let result: any;
      comp.modules$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toBeNull();
    });
  });
});
