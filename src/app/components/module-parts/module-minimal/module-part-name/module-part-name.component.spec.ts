import { ModulePartNameComponent } from './module-part-name.component';

describe('ModulePartNameComponent', () => {
  let comp: ModulePartNameComponent;

  beforeEach(() => {
    comp = new ModulePartNameComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('textSize defaults to undefined', () => {
    expect(comp.textSize).toBeUndefined();
  });

  it('suffix defaults to undefined', () => {
    expect(comp.suffix).toBeUndefined();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
