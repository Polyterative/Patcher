import { HasUnrackedModulesListPipe } from './has-unracked-modules-list.pipe';
import { RackedModule } from 'src/app/models/module';

const makeModule = (id: number, row: number | null, col: number | null): RackedModule => ({
  module: { id, hp: 4 } as any,
  rackingData: { id: 1, row, column: col, rack_id: 1, moduleid: id } as any
});

describe('HasUnrackedModulesListPipe', () => {
  let pipe: HasUnrackedModulesListPipe;

  beforeEach(() => {
    pipe = new HasUnrackedModulesListPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns false for null input', () => {
    expect(pipe.transform(null)).toBeFalse();
  });

  it('returns false when all modules are placed', () => {
    const rows = [[makeModule(1, 0, 0), makeModule(2, 0, 1)]];
    expect(pipe.transform(rows)).toBeFalse();
  });

  it('returns true when a module has null row', () => {
    const rows = [[makeModule(1, 0, 0), makeModule(2, null, 0)]];
    expect(pipe.transform(rows)).toBeTrue();
  });

  it('returns true when a module has null column', () => {
    const rows = [[makeModule(1, 0, null)]];
    expect(pipe.transform(rows)).toBeTrue();
  });
});
