import { TotalDepthOfRackPipe } from './total-depth-of-rack.pipe';
import { RackedModule } from '../../models/module';

const makeRow = (id: number, depth: number, row = 0, col = 0): RackedModule => ({
  module: { id, hp: 4, depth } as any,
  rackingData: { id: 1, row, column: col, rackid: 1, moduleid: id }
});

const BLANK_ID = 4647;

describe('TotalDepthOfRackPipe', () => {
  let pipe: TotalDepthOfRackPipe;

  beforeEach(() => {
    pipe = new TotalDepthOfRackPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns [0, 0, 0] for empty rack', () => {
    expect(pipe.transform([])).toEqual([0, 0, 0]);
  });

  it('returns [0, 0, 0] when all modules are blanks', () => {
    const row = [[makeRow(BLANK_ID, 20)]];
    expect(pipe.transform(row)).toEqual([0, 0, 0]);
  });

  it('single module returns [depth, depth, depth]', () => {
    const result = pipe.transform([[makeRow(1, 30)]]);
    expect(result).toEqual([30, 30, 30]);
  });

  it('returns [max, min, avg] across modules', () => {
    const rack = [[makeRow(1, 20), makeRow(2, 40)]];
    const [max, min, avg] = pipe.transform(rack);
    expect(max).toBe(40);
    expect(min).toBe(20);
    expect(avg).toBe(30);
  });

  it('excludes blank modules from depth calculation', () => {
    const rack = [[makeRow(1, 30), makeRow(BLANK_ID, 100)]];
    const result = pipe.transform(rack);
    expect(result).toEqual([30, 30, 30]);
  });
});
