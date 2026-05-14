import { ModulePatchesComponent } from './module-patches.component';
import { defaultPatchMinimalViewConfig } from '../patch-parts/patch-minimal/patch-minimal.component';

describe('ModulePatchesComponent', () => {
  let comp: ModulePatchesComponent;

  beforeEach(() => {
    comp = new ModulePatchesComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('viewConfig defaults to defaultPatchMinimalViewConfig', () => {
    expect(comp.viewConfig).toEqual(defaultPatchMinimalViewConfig);
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
