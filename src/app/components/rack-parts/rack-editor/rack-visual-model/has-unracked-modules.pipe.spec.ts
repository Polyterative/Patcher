import { HasUnrackedModulesPipe } from './has-unracked-modules.pipe';
import { DbModule, RackedModule } from 'src/app/models/module';

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
