import { TotalHpOfRackPipe } from './total-hp-of-rack.pipe';
import { RackedModule } from '../../models/module';

const makeModule = (id: number, hp: number): RackedModule => ({
  module: { id, hp } as any,
  rackingData: { id: 1, row: 0, column: 0, rackid: 1, moduleid: id }
});

const BLANK_ID = 4647;
const INTELLIJEL_BLANK_ID = 4711;

describe('TotalHpOfRackPipe', () => {
  let pipe: TotalHpOfRackPipe;

  beforeEach(() => {
    pipe = new TotalHpOfRackPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns 0 for empty rack', () => {
    expect(pipe.transform([])).toBe(0);
  });

  it('sums hp across all rows', () => {
    const rack = [[makeModule(1, 4), makeModule(2, 6)], [makeModule(3, 8)]];
    expect(pipe.transform(rack)).toBe(18);
  });

  it('excludes blank modules', () => {
    const rack = [[makeModule(1, 4), makeModule(BLANK_ID, 100)]];
    expect(pipe.transform(rack)).toBe(4);
  });

  it('excludes multiple blank modules across multiple rows', () => {
    const rack = [
      [makeModule(BLANK_ID, 100), makeModule(1, 6)],
      [makeModule(BLANK_ID, 100), makeModule(BLANK_ID, 100), makeModule(2, 4)]
    ];
    expect(pipe.transform(rack)).toBe(10);
  });

  it('returns 0 when every module is blank', () => {
    expect(pipe.transform([[makeModule(BLANK_ID, 100), makeModule(INTELLIJEL_BLANK_ID, 200)]])).toBe(0);
  });

  it('includes unracked real modules in total HP', () => {
    const unracked = makeModule(1, 12);
    unracked.rackingData.row = null as any;
    unracked.rackingData.column = null as any;
    expect(pipe.transform([[unracked]])).toBe(12);
  });

  it('ignores empty rows while summing later rows', () => {
    expect(pipe.transform([[], [makeModule(1, 7)], []])).toBe(7);
  });
});
