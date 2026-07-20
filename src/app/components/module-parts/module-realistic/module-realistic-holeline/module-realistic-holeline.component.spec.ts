import { ModuleRealisticHolelineComponent } from './module-realistic-holeline.component';
import { MinimalModule } from 'src/app/models/module';

const makeMinimalModule = (id: number, hp: number): MinimalModule => ({
  id,
  created: '',
  updated: '',
  name: `Module ${ id }`,
  description: '',
  hp,
  public: true,
  manufacturer: {id: 1, name: 'Test Maker'},
  manufacturerId: 1,
  standard: {id: 0, name: 'Eurorack'},
  tags: [],
  panels: []
});

describe('ModuleRealisticHolelineComponent', () => {
  it('creates without error', () => {
    expect(new ModuleRealisticHolelineComponent()).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    const comp = new ModuleRealisticHolelineComponent();
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    const comp = new ModuleRealisticHolelineComponent();
    comp.data = makeMinimalModule(3, 6);
    expect(comp.data.hp).toBe(6);
  });
});
