import {
  Component,
  Input,
  NO_ERRORS_SCHEMA
} from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModuleCompositeComponent } from './module-composite.component';
import {
  defaultModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { ModulePossessionCounts } from 'src/app/components/module-parts/module-detail-data.models';
import { DbModule } from 'src/app/models/module';

@Component({
  selector: 'app-module-details',
  template: '',
  standalone: false
})
class ModuleDetailsStubComponent {
  @Input() possessionCounts: ModulePossessionCounts | undefined;
}

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

    it('possessionCounts defaults to undefined', () => {
      expect(comp.possessionCounts).toBeUndefined();
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

  describe('template', () => {
    let fixture: ComponentFixture<ModuleCompositeComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [ModuleCompositeComponent, ModuleDetailsStubComponent],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();

      fixture = TestBed.createComponent(ModuleCompositeComponent);
      fixture.componentInstance.data = makeModule();
    });

    it('passes public possession counts to module details', () => {
      fixture.componentInstance.possessionCounts = {
        hasCount: 9,
        wantsCount: 3,
        sellsCount: 0
      };

      fixture.detectChanges();

      const details = fixture.debugElement.query(By.directive(ModuleDetailsStubComponent))
        .componentInstance as ModuleDetailsStubComponent;
      expect(details.possessionCounts).toEqual({
        hasCount: 9,
        wantsCount: 3,
        sellsCount: 0
      });
    });
  });
});
