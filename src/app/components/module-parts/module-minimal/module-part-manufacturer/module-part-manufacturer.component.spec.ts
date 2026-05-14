import { ModulePartManufacturerComponent } from './module-part-manufacturer.component';

describe('ModulePartManufacturerComponent', () => {
  let comp: ModulePartManufacturerComponent;

  beforeEach(() => {
    comp = new ModulePartManufacturerComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
