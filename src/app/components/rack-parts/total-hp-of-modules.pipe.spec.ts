import { TotalHpOfModulesPipe } from './total-hp-of-modules.pipe';
import { RackedModule } from '../../models/module';

const makeModule = (id: number, hp: number): RackedModule => ({
  module: { id, hp } as any,
  rackingData: { id: 1, row: 0, column: 0, rackid: 1, moduleid: id }
});

describe('TotalHpOfModulesPipe', () => {
  let pipe: TotalHpOfModulesPipe;

  beforeEach(() => {
    pipe = new TotalHpOfModulesPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns 0 for empty array', () => {
    expect(pipe.transform([])).toBe(0);
  });

  it('returns hp of single module', () => {
    expect(pipe.transform([makeModule(1, 8)])).toBe(8);
  });

  it('sums hp of all modules', () => {
    expect(pipe.transform([makeModule(1, 4), makeModule(2, 6), makeModule(3, 2)])).toBe(12);
  });
});
