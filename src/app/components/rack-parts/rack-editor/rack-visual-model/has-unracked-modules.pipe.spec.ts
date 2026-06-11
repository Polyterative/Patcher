import { HasUnrackedModulesPipe } from './has-unracked-modules.pipe';
import { RackedModule } from 'src/app/models/module';

const makeModule = (id: number, row: number | null | undefined, col: number | null | undefined): RackedModule => ({
  module: { id, hp: 4 } as any,
  rackingData: { id: 1, row, column: col, rack_id: 1, moduleid: id } as any
});

describe('HasUnrackedModulesPipe', () => {
  let pipe: HasUnrackedModulesPipe;

  beforeEach(() => {
    pipe = new HasUnrackedModulesPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns false for empty array', () => {
    expect(pipe.transform([])).toBeFalse();
  });

  it('returns false when all modules are placed', () => {
    expect(pipe.transform([makeModule(1, 0, 0), makeModule(2, 1, 2)])).toBeFalse();
  });

  it('returns true when any module has null row', () => {
    expect(pipe.transform([makeModule(1, null, 0)])).toBeTrue();
  });

  it('returns true when any module has null column', () => {
    expect(pipe.transform([makeModule(1, 0, null)])).toBeTrue();
  });

  it('returns true when any module has undefined row', () => {
    expect(pipe.transform([makeModule(1, undefined, 0)])).toBeTrue();
  });

  it('returns true when any module has undefined column', () => {
    expect(pipe.transform([makeModule(1, 0, undefined)])).toBeTrue();
  });

  it('returns true when a later module is unracked', () => {
    expect(pipe.transform([makeModule(1, 0, 0), makeModule(2, null, null)])).toBeTrue();
  });
});
