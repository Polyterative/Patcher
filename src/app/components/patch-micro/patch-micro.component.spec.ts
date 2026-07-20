import { PatchMicroComponent } from './patch-micro.component';
import { defaultPatchMinimalViewConfig } from '../patch-parts/patch-minimal/patch-minimal.component';
import { patchFixture } from '../patch-parts/patch-graph/patch-graph-test-fixtures';

describe('PatchMicroComponent', () => {
  let comp: PatchMicroComponent;

  beforeEach(() => {
    comp = new PatchMicroComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('data defaults to null', () => {
    expect(comp.data).toBeNull();
  });

  it('viewConfig defaults to defaultPatchMinimalViewConfig', () => {
    expect(comp.viewConfig).toEqual(defaultPatchMinimalViewConfig);
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    const patch = patchFixture(9, {name: 'Bassline'});
    comp.data = patch;
    expect(comp.data).toBe(patch);
  });

  it('viewConfig input can be assigned', () => {
    const cfg = {...defaultPatchMinimalViewConfig, hideLabels: true};
    comp.viewConfig = cfg;
    expect(comp.viewConfig.hideLabels).toBeTrue();
  });
});
