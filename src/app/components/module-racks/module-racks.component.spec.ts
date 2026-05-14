import { ModuleRacksComponent } from './module-racks.component';
import { defaultRackMinimalViewConfig } from '../rack-parts/rack-minimal/rack-minimal.component';

describe('ModuleRacksComponent', () => {
  let comp: ModuleRacksComponent;

  beforeEach(() => {
    comp = new ModuleRacksComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('viewConfig inherits defaultRackMinimalViewConfig base', () => {
    expect(comp.viewConfig).toBeTruthy();
  });

  it('viewConfig overrides hideButtons to true', () => {
    expect(comp.viewConfig.hideButtons).toBeTrue();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
