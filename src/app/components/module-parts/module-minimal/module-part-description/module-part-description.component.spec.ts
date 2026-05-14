import { ModulePartDescriptionComponent } from './module-part-description.component';

describe('ModulePartDescriptionComponent', () => {
  let comp: ModulePartDescriptionComponent;

  beforeEach(() => {
    comp = new ModulePartDescriptionComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    comp.data = {id: 1, name: 'VCO', description: 'A voltage controlled oscillator'} as any;
    expect(comp.data.name).toBe('VCO');
  });
});
