import { DbModule, RackedModule } from '../../models/module';
import { TotalModulesOfRackPipe } from './total-modules-of-rack.pipe';


function makeDbModule(id: number): DbModule {
  return {
    id,
    created: '',
    updated: '',
    name: `Module ${ id }`,
    description: '',
    hp: 4,
    public: true,
    manufacturer: {id: 1, name: 'Test Maker'},
    manufacturerId: 1,
    standard: {id: 0, name: 'Eurorack'},
    tags: [],
    panels: [],
    ins: [],
    outs: [],
    switches: [],
    manualURL: '',
    store_url: null,
    additional: null,
    isComplete: true,
    isApproved: true,
    isDIY: false,
    powerPos12: null,
    powerNeg12: null,
    powerPos5: null,
    depth: 0,
    weight: 0
  };
}

function makeRackedModule(id: number): RackedModule {
  return {
    rackingData: {id: 1, rackid: 1, moduleid: id, row: 0, column: 0},
    module: makeDbModule(id)
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

  it('counts unracked real modules because they are still rack modules', () => {
    const unracked = makeRackedModule(42);
    unracked.rackingData.row = null;
    unracked.rackingData.column = null;
    expect(pipe.transform([[unracked]])).toBe(1);
  });

  it('ignores empty rows while counting later rows', () => {
    expect(pipe.transform([[], [makeRackedModule(1)], []])).toBe(1);
  });

  it('excludes 1U blank modules from the count', () => {
    expect(pipe.transform([[makeRackedModule(4711), makeRackedModule(4735), makeRackedModule(1)]])).toBe(1);
  });
});