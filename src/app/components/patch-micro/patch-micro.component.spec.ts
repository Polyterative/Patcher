import { PatchMicroComponent } from './patch-micro.component';
import { defaultPatchMinimalViewConfig } from '../patch-parts/patch-minimal/patch-minimal.component';

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
});
