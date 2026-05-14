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

  it('data input can be assigned', () => {
    comp.data = {id: 2, manufacturer: {name: 'Make Noise'}} as any;
    expect((comp.data as any).manufacturer.name).toBe('Make Noise');
  });
});
