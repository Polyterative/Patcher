import { RackDetailsRemainingIndicatorComponent } from './rack-details-remaining-indicator.component';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';

const rackFixture: RackMinimal = {
  id: 1,
  name: 'Fixture Rack',
  hp: 104,
  rows: 2,
  public: true,
  locked: false,
  author: {id: 'user-1', username: 'alice'},
  created: '2026-01-01T00:00:00.000Z',
  updated: '2026-01-01T00:00:00.000Z'
};

const rackedModuleFixture: RackedModule = {
  rackingData: {id: 1, rackid: 1, moduleid: 1, row: 0, column: 0},
  module: {
    id: 1,
    name: 'Fixture Module',
    description: '',
    hp: 8,
    public: true,
    manufacturer: {id: 1, name: 'Fixture Maker'},
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
    weight: 0,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z'
  }
};

describe('RackDetailsRemainingIndicatorComponent', () => {
  let comp: RackDetailsRemainingIndicatorComponent;

  beforeEach(() => {
    comp = new RackDetailsRemainingIndicatorComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    comp.data = rackFixture;
    expect(comp.data.hp).toBe(104);
  });

  it('rowModules input can be assigned', () => {
    comp.rowModules = [rackedModuleFixture];
    expect(comp.rowModules.length).toBe(1);
  });
});
