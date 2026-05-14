import { ModuleCompositeComponent } from './module-composite.component';
import {
  defaultModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { DbModule } from 'src/app/models/module';

function makeModule(hp = 4, standard = 1): DbModule {
  return { hp, standard } as unknown as DbModule;
}

describe('ModuleCompositeComponent', () => {
  let comp: ModuleCompositeComponent;

  beforeEach(() => {
    comp = new ModuleCompositeComponent();
  });

  describe('construction', () => {
    it('creates without error', () => {
      expect(comp).toBeTruthy();
    });

    it('viewConfig defaults to defaultModuleMinimalViewConfig', () => {
      expect(comp.viewConfig).toEqual(defaultModuleMinimalViewConfig);
    });

    it('instanceId defaults to undefined', () => {
      expect(comp.instanceId).toBeUndefined();
    });

    it('nameSuffix defaults to undefined', () => {
      expect(comp.nameSuffix).toBeUndefined();
    });

    it('preferredPanelColor defaults to null', () => {
      expect(comp.preferredPanelColor).toBeNull();
    });

    it('preferPortraitDetailSplit defaults to false', () => {
      expect(comp.preferPortraitDetailSplit).toBeFalse();
    });
  });

  describe('shouldUsePortraitDetailSplit', () => {
    it('returns false when preferPortraitDetailSplit=false', () => {
      comp.data = makeModule(4, 1);
      comp.preferPortraitDetailSplit = false;
      expect(comp.shouldUsePortraitDetailSplit).toBeFalse();
    });

    it('returns false for wide module (high aspect ratio) even when prefer=true', () => {
      // wide module: hp=20, standard Eurorack height ~128.5mm → aspect ratio > 0.78
      comp.data = makeModule(20, 1);
      comp.preferPortraitDetailSplit = true;
      // wide module will have aspect ratio >> 0.78 threshold → should NOT use portrait
      expect(comp.shouldUsePortraitDetailSplit).toBeFalse();
    });
  });

  describe('ngOnInit', () => {
    it('does not throw', () => {
      comp.data = makeModule();
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });
});
