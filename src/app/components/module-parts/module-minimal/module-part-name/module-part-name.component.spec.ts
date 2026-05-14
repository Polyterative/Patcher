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

  it('data input can be set without error', () => {
    comp.data = {id: 42, name: 'Clouds', hp: 12} as any;
    expect(comp.data.id).toBe(42);
  });
});
