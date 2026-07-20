import { CalculateRowInformationPipe } from './calculate-row-information.pipe';
import { DbModule, RackedModule } from 'src/app/models/module';

const makeDbModule = (id: number, hp: number): DbModule => ({
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
  depth: 30,
  weight: 0
});

const makeRackedModule = (id: number, hp: number, row = 0, col = 0): RackedModule => ({
  module: makeDbModule(id, hp),
  rackingData: { id: 1, row, column: col, rackid: 1, moduleid: id }
});

describe('CalculateRowInformationPipe', () => {
  let pipe: CalculateRowInformationPipe;

  beforeEach(() => {
    pipe = new CalculateRowInformationPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns "Total HP: 0" for empty row', () => {
    expect(pipe.transform([])).toBe('Total HP: 0');
  });

  it('sums hp of all modules in row', () => {
    const row = [makeRackedModule(1, 4), makeRackedModule(2, 6)];
    expect(pipe.transform(row)).toBe('Total HP: 10');
  });

  it('single module hp is returned', () => {
    expect(pipe.transform([makeRackedModule(1, 8)])).toBe('Total HP: 8');
  });

  it('handles row with multiple modules of same hp', () => {
    const row = [makeRackedModule(1, 4), makeRackedModule(2, 4), makeRackedModule(3, 4)];
    expect(pipe.transform(row)).toBe('Total HP: 12');
  });

  it('includes zero HP modules without changing the total', () => {
    const row = [makeRackedModule(1, 0), makeRackedModule(2, 6)];
    expect(pipe.transform(row)).toBe('Total HP: 6');
  });

  it('includes blank modules because it reports physical row HP', () => {
    const row = [makeRackedModule(1, 6), makeRackedModule(4647, 2)];
    expect(pipe.transform(row)).toBe('Total HP: 8');
  });
});
