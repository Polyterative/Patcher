/**
 * Tests for rack statistics pipes: verify that blank spacing modules
 * (IDs 4647–4666 for 3U, 4711–4735 for Intellijel 1U) are excluded
 * from all rack statistics calculations.
 */
import { DbModule, RackedModule } from 'src/app/models/module';
import { BLANK_MODULE_IDS, isBlankModule } from './rack-blank-module.constants';
import { TotalModulesOfRackPipe } from './total-modules-of-rack.pipe';
import { TotalHpOfRackPipe } from './total-hp-of-rack.pipe';
import { TotalPowerOfRackPipe } from './total-power-of-rack.pipe';
import { TotalWeightOfRackPipe } from './total-weight-of-rack.pipe';
import { TotalDepthOfRackPipe } from './total-depth-of-rack.pipe';
import { TotalMissingPowerDataInRackPipe } from './total-missing-power-data-in-rack.pipe';


function makeModule(id: number, overrides: Partial<DbModule> = {}): DbModule {
  return {
    id,
    name: `Module ${id}`,
    hp: 4,
    powerPos12: 10,
    powerNeg12: -5,
    powerPos5: 0,
    weight: 100,
    depth: 25,
    description: '',
    public: true,
    manufacturer: { id: 1, name: 'Test', slug: 'test' } as any,
    manufacturerId: 1,
    standard: { id: 0, name: '3U Eurorack' } as any,
    tags: [],
    panels: [],
    ins: [],
    outs: [],
    switches: [],
    manualURL: '',
    additional: null,
    isComplete: true,
    isApproved: true,
    isDIY: false,
    created: '',
    updated: '',
    ...overrides
  } as DbModule;
}

function makeRackedModule(id: number, overrides: Partial<DbModule> = {}): RackedModule {
  return {
    module: makeModule(id, overrides),
    rackingData: { id: 0, row: 0, col: 0 } as any
  };
}

/** A real 3U blank module ID */
const BLANK_3U_ID = 4647;
/** A real Intellijel 1U blank module ID */
const BLANK_1U_ID = 4711;
/** A regular non-blank module ID */
const REAL_MODULE_ID = 9999;

describe('rack-blank-module.constants', () => {
  describe('isBlankModule', () => {
    it('should return true for all 3U blank IDs (4647–4666)', () => {
      for (let id = 4647; id <= 4666; id++) {
        expect(isBlankModule(id)).withContext(`ID ${id}`).toBeTrue();
      }
    });

    it('should return true for all Intellijel 1U blank IDs (4711–4735)', () => {
      for (let id = 4711; id <= 4735; id++) {
        expect(isBlankModule(id)).withContext(`ID ${id}`).toBeTrue();
      }
    });

    it('should return false for a regular module ID', () => {
      expect(isBlankModule(REAL_MODULE_ID)).toBeFalse();
    });

    it('should return false for ID 4646 (just below blank range)', () => {
      expect(isBlankModule(4646)).toBeFalse();
    });

    it('should return false for ID 4667 (just above 3U blank range)', () => {
      expect(isBlankModule(4667)).toBeFalse();
    });

    it('BLANK_MODULE_IDS set should have 45 entries (20 + 25)', () => {
      expect(BLANK_MODULE_IDS.size).toBe(45);
    });
  });
});

describe('TotalModulesOfRackPipe', () => {
  let pipe: TotalModulesOfRackPipe;

  beforeEach(() => { pipe = new TotalModulesOfRackPipe(); });

  it('should count only non-blank modules', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(REAL_MODULE_ID),
      makeRackedModule(BLANK_3U_ID),
      makeRackedModule(BLANK_1U_ID)
    ]];
    expect(pipe.transform(modules)).toBe(1);
  });

  it('should return 0 when all modules are blanks', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(BLANK_3U_ID),
      makeRackedModule(4648)
    ]];
    expect(pipe.transform(modules)).toBe(0);
  });

  it('should count correctly when there are no blanks', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(REAL_MODULE_ID),
      makeRackedModule(1)
    ]];
    expect(pipe.transform(modules)).toBe(2);
  });

  it('should handle empty rack', () => {
    expect(pipe.transform([[]])).toBe(0);
  });
});

describe('TotalHpOfRackPipe', () => {
  let pipe: TotalHpOfRackPipe;

  beforeEach(() => { pipe = new TotalHpOfRackPipe(); });

  it('should exclude HP of blank modules from total', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(REAL_MODULE_ID, { hp: 8 }),
      makeRackedModule(BLANK_3U_ID, { hp: 2 }),
      makeRackedModule(BLANK_1U_ID, { hp: 1 })
    ]];
    expect(pipe.transform(modules)).toBe(8);
  });

  it('should return 0 when only blanks are present', () => {
    const modules: RackedModule[][] = [[makeRackedModule(BLANK_3U_ID, { hp: 4 })]];
    expect(pipe.transform(modules)).toBe(0);
  });

  it('should sum HP of non-blank modules across rows', () => {
    const modules: RackedModule[][] = [
      [makeRackedModule(1, { hp: 6 }), makeRackedModule(BLANK_3U_ID, { hp: 2 })],
      [makeRackedModule(2, { hp: 10 })]
    ];
    expect(pipe.transform(modules)).toBe(16);
  });
});

describe('TotalPowerOfRackPipe', () => {
  let pipe: TotalPowerOfRackPipe;

  beforeEach(() => { pipe = new TotalPowerOfRackPipe(); });

  it('should exclude power draw of blank modules', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(REAL_MODULE_ID, { powerPos12: 100, powerNeg12: -50, powerPos5: 10 }),
      makeRackedModule(BLANK_3U_ID, { powerPos12: 999, powerNeg12: -999, powerPos5: 999 })
    ]];
    const [pos12, neg12, pos5] = pipe.transform(modules);
    expect(pos12).toBe(100);
    expect(neg12).toBe(-50);
    expect(pos5).toBe(10);
  });

  it('should return [0, 0, 0] when only blanks present', () => {
    const modules: RackedModule[][] = [[makeRackedModule(BLANK_3U_ID)]];
    expect(pipe.transform(modules)).toEqual([0, 0, 0]);
  });
});

describe('TotalWeightOfRackPipe', () => {
  let pipe: TotalWeightOfRackPipe;

  beforeEach(() => { pipe = new TotalWeightOfRackPipe(); });

  it('should exclude weight of blank modules', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(REAL_MODULE_ID, { weight: 200 }),
      makeRackedModule(BLANK_3U_ID, { weight: 999 })
    ]];
    expect(pipe.transform(modules)).toBe(200);
  });

  it('should return 0 when only blanks present', () => {
    const modules: RackedModule[][] = [[makeRackedModule(BLANK_3U_ID, { weight: 100 })]];
    expect(pipe.transform(modules)).toBe(0);
  });
});

describe('TotalDepthOfRackPipe', () => {
  let pipe: TotalDepthOfRackPipe;

  beforeEach(() => { pipe = new TotalDepthOfRackPipe(); });

  it('should exclude depth of blank modules from statistics', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(REAL_MODULE_ID, { depth: 40 }),
      makeRackedModule(BLANK_3U_ID, { depth: 999 })
    ]];
    const [max, min, avg] = pipe.transform(modules);
    expect(max).toBe(40);
    expect(min).toBe(40);
    expect(avg).toBe(40);
  });

  it('should return [0, 0, 0] when only blanks present', () => {
    const modules: RackedModule[][] = [[makeRackedModule(BLANK_3U_ID, { depth: 10 })]];
    expect(pipe.transform(modules)).toEqual([0, 0, 0]);
  });
});

describe('TotalMissingPowerDataInRackPipe', () => {
  let pipe: TotalMissingPowerDataInRackPipe;

  beforeEach(() => { pipe = new TotalMissingPowerDataInRackPipe(); });

  it('should not count blanks as missing power data', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(BLANK_3U_ID, { powerPos12: null as any, powerNeg12: null as any, powerPos5: null as any }),
      makeRackedModule(REAL_MODULE_ID, { powerPos12: 10, powerNeg12: -5, powerPos5: 0 })
    ]];
    expect(pipe.transform(modules)).toBe(0);
  });

  it('should count non-blank modules with missing power data', () => {
    const modules: RackedModule[][] = [[
      makeRackedModule(REAL_MODULE_ID, { powerPos12: null as any, powerNeg12: null as any, powerPos5: null as any }),
      makeRackedModule(BLANK_3U_ID, { powerPos12: null as any, powerNeg12: null as any, powerPos5: null as any })
    ]];
    expect(pipe.transform(modules)).toBe(1);
  });
});