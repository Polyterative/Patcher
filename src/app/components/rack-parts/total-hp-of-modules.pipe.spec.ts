import { TotalHpOfModulesPipe } from './total-hp-of-modules.pipe';
import { DbModule, RackedModule } from '../../models/module';

const makeDbModule = (id: number, hp: number): DbModule => ({
  id,
  created: '',
  updated: '',
  name: `M${id}`,
  description: '',
  hp,
  public: true,
  manufacturer: { id: 1, name: 'Test Maker' },
  manufacturerId: 1,
  standard: { id: 0, name: 'Eurorack' },
  tags: [],
  panels: [],
  ins: [],
  outs: [],
  switches: [],
  manualURL: '',
  store_url: null,
  additional: null,
  isComplete: true,
  isApproved: true,
  isDIY: false,
  powerPos12: null,
  powerNeg12: null,
  powerPos5: null,
  depth: 0,
  weight: 0
});

const makeModule = (id: number, hp: number): RackedModule => ({
  module: makeDbModule(id, hp),
  rackingData: { id: 1, row: 0, column: 0, rackid: 1, moduleid: id }
});

describe('TotalHpOfModulesPipe', () => {
  let pipe: TotalHpOfModulesPipe;

  beforeEach(() => {
    pipe = new TotalHpOfModulesPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns 0 for empty array', () => {
    expect(pipe.transform([])).toBe(0);
  });

  it('returns hp of single module', () => {
    expect(pipe.transform([makeModule(1, 8)])).toBe(8);
  });

  it('sums hp of all modules', () => {
    expect(pipe.transform([makeModule(1, 4), makeModule(2, 6), makeModule(3, 2)])).toBe(12);
  });

  it('treats module with 0 hp as 0 contribution', () => {
    expect(pipe.transform([makeModule(1, 0), makeModule(2, 8)])).toBe(8);
  });
});
