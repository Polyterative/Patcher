import { ModulePartHpComponent } from './module-part-hp.component';
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

describe('ModulePartHpComponent', () => {
  let comp: ModulePartHpComponent;

  beforeEach(() => {
    comp = new ModulePartHpComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    comp.data = makeMinimalModule({id: 5, hp: 14});
    expect(comp.data.hp).toBe(14);
  });

  it('data hp of 4 is preserved', () => {
    comp.data = makeMinimalModule({id: 7, hp: 4});
    expect(comp.data.hp).toBe(4);
  });
});
