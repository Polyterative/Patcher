import { DbModule, RackedModule } from '../../models/module';
import { TotalWeightOfRackPipe } from './total-weight-of-rack.pipe';

function makeDbModule(id: number, weight: number | null): DbModule {
  return {
    id,
    created: '',
    updated: '',
    name: `M${id}`,
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
    weight
  };
}

function makeRackedModule(id: number, weight: number | null): RackedModule {
  return {
    rackingData: {id: 1, rackid: 1, moduleid: id, row: 0, column: 0},
    module: makeDbModule(id, weight)
  };
}

describe('TotalWeightOfRackPipe', () => {
  let pipe: TotalWeightOfRackPipe;
  
  beforeEach(() => {
    pipe = new TotalWeightOfRackPipe();
  });
  
  it('returns 0 for an empty rack', () => {
    expect(pipe.transform([])).toBe(0);
  });
  
  it('sums weight across all modules in a single row', () => {
    const row = [makeRackedModule(1, 100), makeRackedModule(2, 200)];
    expect(pipe.transform([row])).toBe(300);
  });
  
  it('sums weight across multiple rows', () => {
    expect(pipe.transform([[makeRackedModule(1, 50)], [makeRackedModule(2, 75)]])).toBe(125);
  });
  
  it('excludes blank modules from the weight total', () => {
    const row = [makeRackedModule(1, 200), makeRackedModule(4647, 50)];
    expect(pipe.transform([row])).toBe(200);
  });
  
  it('excludes modules with null weight', () => {
    const row = [makeRackedModule(1, 100), makeRackedModule(2, null)];
    expect(pipe.transform([row])).toBe(100);
  });
  
  it('returns 0 when all modules are blanks', () => {
    expect(pipe.transform([[makeRackedModule(4648, 10)]])).toBe(0);
  });
});