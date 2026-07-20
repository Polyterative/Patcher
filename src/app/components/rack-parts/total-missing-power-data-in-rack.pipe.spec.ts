import { TotalMissingPowerDataInRackPipe } from './total-missing-power-data-in-rack.pipe';
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

describe('TotalMissingPowerDataInRackPipe', () => {
  let pipe: TotalMissingPowerDataInRackPipe;

  beforeEach(() => {
    pipe = new TotalMissingPowerDataInRackPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns 0 for empty rack', () => {
    expect(pipe.transform([])).toBe(0);
  });

  it('returns 0 when all power data is present', () => {
    const rack = [[makeModule(1, 200, 100, 0)]];
    expect(pipe.transform(rack)).toBe(0);
  });

  it('counts module with null powerPos12', () => {
    const rack = [[makeModule(1, null, 100, 0)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('counts module with null powerNeg12', () => {
    const rack = [[makeModule(1, 200, null, 0)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('counts module with null powerPos5', () => {
    const rack = [[makeModule(1, 200, 100, null)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('counts unique modules only (not duplicates)', () => {
    const rack = [[makeModule(1, null, 100, 0), makeModule(1, null, 100, 0)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('excludes blank modules', () => {
    const rack = [[makeModule(BLANK_ID, null, null, null)]];
    expect(pipe.transform(rack)).toBe(0);
  });
});
