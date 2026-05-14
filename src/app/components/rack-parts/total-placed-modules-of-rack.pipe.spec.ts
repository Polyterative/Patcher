import { TotalPlacedModulesOfRackPipe } from './total-placed-modules-of-rack.pipe';
import { RackedModule } from '../../models/module';

const makeModule = (id: number, row: number | null, col: number | null): RackedModule => ({
  module: { id, hp: 4 } as any,
  rackingData: { id: 1, row, column: col, rackid: 1, moduleid: id } as any
});

const BLANK_ID = 4647;

describe('TotalPlacedModulesOfRackPipe', () => {
  let pipe: TotalPlacedModulesOfRackPipe;

  beforeEach(() => {
    pipe = new TotalPlacedModulesOfRackPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns 0 for empty rack', () => {
    expect(pipe.transform([])).toBe(0);
  });

  it('counts placed modules', () => {
    const rack = [[makeModule(1, 0, 0), makeModule(2, 0, 1)]];
    expect(pipe.transform(rack)).toBe(2);
  });

  it('does not count unracked (null row) modules', () => {
    const rack = [[makeModule(1, 0, 0), makeModule(2, null, 0)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('does not count unracked (null col) modules', () => {
    const rack = [[makeModule(1, 0, null)]];
    expect(pipe.transform(rack)).toBe(0);
  });

  it('does not count blank modules', () => {
    const rack = [[makeModule(BLANK_ID, 0, 0), makeModule(1, 0, 1)]];
    expect(pipe.transform(rack)).toBe(1);
  });
});
