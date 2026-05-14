import { RackedToModulesPipe } from './racked-to-modules.pipe';
import { RackedModule } from '../../models/module';

const makeRackedModule = (id: number): RackedModule => ({
  module: { id, hp: 4, name: 'M' + id } as any,
  rackingData: { id: 1, row: 0, column: 0, rackid: 1, moduleid: id }
});

describe('RackedToModulesPipe', () => {
  let pipe: RackedToModulesPipe;

  beforeEach(() => {
    pipe = new RackedToModulesPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns empty array for empty input', () => {
    expect(pipe.transform([])).toEqual([]);
  });

  it('maps each racked module to its inner module', () => {
    const input = [makeRackedModule(1), makeRackedModule(2)];
    const result = pipe.transform(input);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('preserves module order', () => {
    const input = [makeRackedModule(10), makeRackedModule(20), makeRackedModule(30)];
    const ids = pipe.transform(input).map(m => m.id);
    expect(ids).toEqual([10, 20, 30]);
  });
});
