import { HasUnrackedModulesListPipe } from './has-unracked-modules-list.pipe';
import { DbModule, RackedModule } from 'src/app/models/module';

type RackRows = RackedModule[][];

const makeDbModule = (id: number): DbModule => ({
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
});

const makeModule = (id: number, row: number | null | undefined, col: number | null | undefined): RackedModule => ({
  module: makeDbModule(id),
  rackingData: { id: 1, row, column: col, rackid: 1, moduleid: id }
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
    const rows: RackRows = [[makeModule(1, 0, 0), makeModule(2, 0, 1)]];
    expect(pipe.transform(rows)).toBeFalse();
  });

  it('returns true when a module has null row', () => {
    const rows: RackRows = [[makeModule(1, 0, 0), makeModule(2, null, 0)]];
    expect(pipe.transform(rows)).toBeTrue();
  });

  it('returns true when a module has null column', () => {
    const rows: RackRows = [[makeModule(1, 0, null)]];
    expect(pipe.transform(rows)).toBeTrue();
  });

  it('returns true when a module has undefined row', () => {
    const rows: RackRows = [[makeModule(1, undefined, 0)]];
    expect(pipe.transform(rows)).toBeTrue();
  });

  it('returns true when a module has undefined column', () => {
    const rows: RackRows = [[makeModule(1, 0, undefined)]];
    expect(pipe.transform(rows)).toBeTrue();
  });

  it('returns true when a later row has an unracked module', () => {
    const rows: RackRows = [
      [makeModule(1, 0, 0)],
      [makeModule(2, null, null)]
    ];
    expect(pipe.transform(rows)).toBeTrue();
  });

  it('returns false for empty rows', () => {
    expect(pipe.transform([[], []])).toBeFalse();
  });
});
