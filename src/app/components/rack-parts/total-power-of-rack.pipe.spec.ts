import { TotalPowerOfRackPipe } from './total-power-of-rack.pipe';
import { DbModule, RackedModule } from '../../models/module';

const makeDbModule = (id: number, p12: number | null, n12: number | null, p5: number | null): DbModule => ({
  id,
  created: '',
  updated: '',
  name: `M${id}`,
  description: '',
  hp: 4,
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
  powerPos12: p12,
  powerNeg12: n12,
  powerPos5: p5,
  depth: 0,
  weight: 0
});

const makeModule = (id: number, p12: number | null, n12: number | null, p5: number | null): RackedModule => ({
  module: makeDbModule(id, p12, n12, p5),
  rackingData: { id: 1, row: 0, column: 0, rackid: 1, moduleid: id }
});

const BLANK_ID = 4647;

describe('TotalPowerOfRackPipe', () => {
  let pipe: TotalPowerOfRackPipe;

  beforeEach(() => {
    pipe = new TotalPowerOfRackPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns [0, 0, 0] for empty rack', () => {
    expect(pipe.transform([])).toEqual([0, 0, 0]);
  });

  it('sums power values across modules', () => {
    const rack = [[makeModule(1, 100, 50, 10), makeModule(2, 200, 80, 20)]];
    expect(pipe.transform(rack)).toEqual([300, 130, 30]);
  });

  it('treats null power values as 0', () => {
    const rack = [[makeModule(1, null, null, null)]];
    expect(pipe.transform(rack)).toEqual([0, 0, 0]);
  });

  it('excludes blank modules', () => {
    const rack = [[makeModule(BLANK_ID, 999, 999, 999), makeModule(1, 100, 50, 10)]];
    expect(pipe.transform(rack)).toEqual([100, 50, 10]);
  });

  it('handles multi-row rack', () => {
    const rack = [
      [makeModule(1, 100, 50, 0)],
      [makeModule(2, 200, 80, 20)]
    ];
    expect(pipe.transform(rack)).toEqual([300, 130, 20]);
  });
});
