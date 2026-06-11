import { TotalPlacedModulesOfRackPipe } from './total-placed-modules-of-rack.pipe';
import { RackedModule } from '../../models/module';

const makeModule = (id: number, row: number | null | undefined, col: number | null | undefined): RackedModule => ({
  module: { id, hp: 4 } as any,
  rackingData: { id: 1, row, column: col, rackid: 1, moduleid: id } as any
});

const BLANK_ID = 4647;
const INTELLIJEL_BLANK_ID = 4711;

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

  it('does not count Intellijel blank modules', () => {
    const rack = [[makeModule(INTELLIJEL_BLANK_ID, 0, 0), makeModule(1, 0, 1)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('does not count modules with undefined row', () => {
    const rack = [[makeModule(1, undefined, 0), makeModule(2, 0, 0)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('does not count modules with undefined column', () => {
    const rack = [[makeModule(1, 0, undefined), makeModule(2, 0, 0)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('counts placed modules across empty rows and unracked bucket', () => {
    const rack = [
      [],
      [makeModule(1, 1, 0)],
      [makeModule(2, null, null)]
    ];
    expect(pipe.transform(rack)).toBe(1);
  });
});
