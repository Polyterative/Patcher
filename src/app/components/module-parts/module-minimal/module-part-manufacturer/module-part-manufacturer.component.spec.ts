import { ModulePartManufacturerComponent } from './module-part-manufacturer.component';
import { MinimalModule } from 'src/app/models/module';


function makeMinimalModule(overrides: Partial<MinimalModule> = {}): MinimalModule {
  return {
    id: 1,
    created: '',
    updated: '',
    name: 'VCO',
    description: '',
    hp: 10,
    public: true,
    manufacturer: {id: 1, name: 'Make Noise'},
    manufacturerId: 1,
    standard: {id: 0, name: 'Eurorack'},
    tags: [],
    panels: [],
    ...overrides
  };
}

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
    comp.data = makeMinimalModule({id: 2, manufacturer: {id: 1, name: 'Make Noise'}});
    expect(comp.data.manufacturer.name).toBe('Make Noise');
  });

  it('data id is preserved after assignment', () => {
    comp.data = makeMinimalModule({id: 99});
    expect(comp.data.id).toBe(99);
  });
});
