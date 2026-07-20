import { ModulePartNameComponent } from './module-part-name.component';
import { MinimalModule } from 'src/app/models/module';

const makeMinimalModule = (id: number, name: string, hp: number): MinimalModule => ({
  id,
  created: '',
  updated: '',
  name,
  description: '',
  hp,
  public: true,
  manufacturer: {id: 1, name: 'Test Maker'},
  manufacturerId: 1,
  standard: {id: 0, name: 'Eurorack'},
  tags: [],
  panels: []
});

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
    comp.data = makeMinimalModule(42, 'Clouds', 12);
    expect(comp.data.id).toBe(42);
  });
});
