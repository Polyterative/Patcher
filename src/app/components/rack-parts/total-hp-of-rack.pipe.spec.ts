import { TotalHpOfRackPipe } from './total-hp-of-rack.pipe';
import { RackedModule } from '../../models/module';

const makeModule = (id: number, hp: number): RackedModule => ({
  module: { id, hp } as any,
  rackingData: { id: 1, row: 0, column: 0, rackid: 1, moduleid: id }
});

const BLANK_ID = 4647;

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
});
