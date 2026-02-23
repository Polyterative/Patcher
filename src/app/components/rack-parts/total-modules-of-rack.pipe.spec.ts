import { RackedModule } from '../../models/module';
import { TotalModulesOfRackPipe } from './total-modules-of-rack.pipe';


function makeRackedModule(id: number): RackedModule {
  return {
    rackingData: {id: 1, rackid: 1, moduleid: id, row: 0, column: 0},
    module: {id, hp: 4} as any
  };
}

describe('TotalModulesOfRackPipe', () => {
  let pipe: TotalModulesOfRackPipe;
  
  beforeEach(() => {
    pipe = new TotalModulesOfRackPipe();
  });
  
  it('returns 0 for an empty rack', () => {
    expect(pipe.transform([])).toBe(0);
  });
  
  it('counts modules across a single row', () => {
    expect(pipe.transform([[makeRackedModule(1), makeRackedModule(2)]])).toBe(2);
  });
  
  it('counts modules across multiple rows', () => {
    expect(pipe.transform([[makeRackedModule(1)], [makeRackedModule(2), makeRackedModule(3)]])).toBe(3);
  });
  
  it('excludes blank modules from the count', () => {
    // 4647 is a blank
    const row = [makeRackedModule(1), makeRackedModule(4647), makeRackedModule(2)];
    expect(pipe.transform([row])).toBe(2);
  });
  
  it('returns 0 when all modules are blanks', () => {
    expect(pipe.transform([[makeRackedModule(4650), makeRackedModule(4711)]])).toBe(0);
  });
});