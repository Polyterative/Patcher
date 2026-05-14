import { TotalPowerOfRackPipe } from './total-power-of-rack.pipe';
import { RackedModule } from '../../models/module';

const makeModule = (id: number, p12: number | null, n12: number | null, p5: number | null): RackedModule => ({
  module: { id, hp: 4, powerPos12: p12, powerNeg12: n12, powerPos5: p5 } as any,
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
