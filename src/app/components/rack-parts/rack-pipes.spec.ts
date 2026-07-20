/**
 * Batched specs for all rack-related pure pipes.
 * Each pipe is directly instantiated — no TestBed or DI needed.
 *
 * Pipes covered:
 *  - TotalHpOfRackPipe
 *  - TotalPowerOfRackPipe
 *  - TotalPlacedModulesOfRackPipe
 *  - TotalDepthOfRackPipe
 *  - TotalMissingPowerDataInRackPipe
 *  - HasUnrackedModulesListPipe
 *  - CalculateRowInformationPipe
 */
import { TotalHpOfRackPipe } from './total-hp-of-rack.pipe';
import { TotalPowerOfRackPipe } from './total-power-of-rack.pipe';
import { TotalPlacedModulesOfRackPipe } from './total-placed-modules-of-rack.pipe';
import { TotalDepthOfRackPipe } from './total-depth-of-rack.pipe';
import { TotalMissingPowerDataInRackPipe } from './total-missing-power-data-in-rack.pipe';
import { HasUnrackedModulesListPipe } from './rack-editor/rack-visual-model/has-unracked-modules-list.pipe';
import { CalculateRowInformationPipe } from './rack-editor/calculate-row-information.pipe';
import { DbModule, RackedModule } from '../../models/module';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** A well-known blank module ID (3U, 1 HP) */
const BLANK_ID = 4647;

function makeModule(id: number, hp: number, overrides: Partial<{
  powerPos12: number | null;
  powerNeg12: number | null;
  powerPos5: number | null;
  depth: number | null;
}> = {}): DbModule {
  return {
    id,
    created: '',
    updated: '',
    name: `Module ${ id }`,
    description: '',
    hp,
    public: true,
    manufacturer: { id: 1, name: 'Test Maker' },
    manufacturerId: 1,
    standard: { id: 0, name: 'Eurorack' },
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
    powerPos12: overrides.powerPos12 !== undefined ? overrides.powerPos12 : 50,
    powerNeg12: overrides.powerNeg12 !== undefined ? overrides.powerNeg12 : 30,
    powerPos5:  overrides.powerPos5  !== undefined ? overrides.powerPos5  : 10,
    depth:      overrides.depth      !== undefined ? overrides.depth      : 40,
    weight: 0
  };
}

function makeRacked(
  id: number,
  hp: number,
  row: number | null = 0,
  col: number | null = 0,
  moduleOverrides: Parameters<typeof makeModule>[2] = {}
): RackedModule {
  return {
    module: makeModule(id, hp, moduleOverrides),
    rackingData: { id: id * 10, rackid: 1, moduleid: id, row, column: col },
  };
}

/** Two-row rack with real modules. */
const row1 = [makeRacked(1, 4), makeRacked(2, 8)];
const row2 = [makeRacked(3, 6), makeRacked(4, 2)];
const twoRowRack: RackedModule[][] = [row1, row2];

/** Empty rack. */
const emptyRack: RackedModule[][] = [[], []];

// ── TotalHpOfRackPipe ─────────────────────────────────────────────────────────

describe('TotalHpOfRackPipe', () => {
  const pipe = new TotalHpOfRackPipe();

  it('sums HP across all rows', () => {
    expect(pipe.transform(twoRowRack)).toBe(4 + 8 + 6 + 2);
  });

  it('returns 0 for an empty rack', () => {
    expect(pipe.transform(emptyRack)).toBe(0);
  });

  it('excludes blank modules from the total', () => {
    const rack = [[makeRacked(1, 4), makeRacked(BLANK_ID, 2)]];
    expect(pipe.transform(rack)).toBe(4);
  });

  it('handles single-row racks', () => {
    const rack = [[makeRacked(1, 3), makeRacked(2, 5)]];
    expect(pipe.transform(rack)).toBe(8);
  });
});

// ── TotalPowerOfRackPipe ──────────────────────────────────────────────────────

describe('TotalPowerOfRackPipe', () => {
  const pipe = new TotalPowerOfRackPipe();

  it('returns [0, 0, 0] for an empty rack', () => {
    expect(pipe.transform(emptyRack)).toEqual([0, 0, 0]);
  });

  it('sums powerPos12, powerNeg12, powerPos5 across all modules', () => {
    const rack = [[makeRacked(1, 4, 0, 0, { powerPos12: 100, powerNeg12: 80, powerPos5: 20 })]];
    expect(pipe.transform(rack)).toEqual([100, 80, 20]);
  });

  it('treats null power values as 0', () => {
    const rack = [[makeRacked(1, 4, 0, 0, { powerPos12: null, powerNeg12: null, powerPos5: null })]];
    expect(pipe.transform(rack)).toEqual([0, 0, 0]);
  });

  it('excludes blank modules from power totals', () => {
    const rack = [
      [
        makeRacked(1, 4, 0, 0, { powerPos12: 50, powerNeg12: 40, powerPos5: 10 }),
        makeRacked(BLANK_ID, 2, 0, 1, { powerPos12: 999, powerNeg12: 999, powerPos5: 999 }),
      ]
    ];
    expect(pipe.transform(rack)).toEqual([50, 40, 10]);
  });

  it('sums across multiple rows', () => {
    const rack = [
      [makeRacked(1, 4, 0, 0, { powerPos12: 100, powerNeg12: 60, powerPos5: 20 })],
      [makeRacked(2, 8, 1, 0, { powerPos12: 200, powerNeg12: 40, powerPos5: 10 })],
    ];
    expect(pipe.transform(rack)).toEqual([300, 100, 30]);
  });
});

// ── TotalPlacedModulesOfRackPipe ──────────────────────────────────────────────

describe('TotalPlacedModulesOfRackPipe', () => {
  const pipe = new TotalPlacedModulesOfRackPipe();

  it('counts only modules with non-null row and column', () => {
    const rack = [
      [makeRacked(1, 4, 0, 0), makeRacked(2, 6, null, null)],
    ];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('returns 0 for an empty rack', () => {
    expect(pipe.transform(emptyRack)).toBe(0);
  });

  it('excludes blank modules', () => {
    const rack = [[makeRacked(1, 4), makeRacked(BLANK_ID, 2)]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('counts all placed non-blank modules across rows', () => {
    expect(pipe.transform(twoRowRack)).toBe(4);
  });

  it('does not count module when only row is null', () => {
    const rack = [[makeRacked(1, 4, null, 0)]];
    expect(pipe.transform(rack)).toBe(0);
  });

  it('does not count module when only column is null', () => {
    const rack = [[makeRacked(1, 4, 0, null)]];
    expect(pipe.transform(rack)).toBe(0);
  });
});

// ── TotalDepthOfRackPipe ──────────────────────────────────────────────────────

describe('TotalDepthOfRackPipe', () => {
  const pipe = new TotalDepthOfRackPipe();

  it('returns [0, 0, 0] for an empty rack', () => {
    expect(pipe.transform(emptyRack)).toEqual([0, 0, 0]);
  });

  it('returns [max, min, avg] for non-blank modules', () => {
    const rack = [
      [
        makeRacked(1, 4, 0, 0, { depth: 40 }),
        makeRacked(2, 6, 0, 1, { depth: 60 }),
        makeRacked(3, 2, 0, 2, { depth: 20 }),
      ]
    ];
    const [max, min, avg] = pipe.transform(rack);
    expect(max).toBe(60);
    expect(min).toBe(20);
    expect(avg).toBeCloseTo((40 + 60 + 20) / 3);
  });

  it('returns [0, 0, 0] when all modules have null depth', () => {
    const rack = [[makeRacked(1, 4, 0, 0, { depth: null })]];
    expect(pipe.transform(rack)).toEqual([0, 0, 0]);
  });

  it('excludes blank modules from depth calculation', () => {
    const rack = [
      [
        makeRacked(1, 4, 0, 0, { depth: 50 }),
        makeRacked(BLANK_ID, 2, 0, 1, { depth: 9999 }),
      ]
    ];
    const [max, min, avg] = pipe.transform(rack);
    expect(max).toBe(50);
    expect(min).toBe(50);
    expect(avg).toBe(50);
  });

  it('handles a single module', () => {
    const rack = [[makeRacked(1, 4, 0, 0, { depth: 35 })]];
    const [max, min, avg] = pipe.transform(rack);
    expect(max).toBe(35);
    expect(min).toBe(35);
    expect(avg).toBe(35);
  });
});

// ── TotalMissingPowerDataInRackPipe ───────────────────────────────────────────

describe('TotalMissingPowerDataInRackPipe', () => {
  const pipe = new TotalMissingPowerDataInRackPipe();

  it('returns 0 when all modules have complete power data', () => {
    expect(pipe.transform(twoRowRack)).toBe(0);
  });

  it('counts modules missing powerPos12', () => {
    const rack = [[makeRacked(1, 4, 0, 0, { powerPos12: null })]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('counts modules missing powerNeg12', () => {
    const rack = [[makeRacked(1, 4, 0, 0, { powerNeg12: null })]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('counts modules missing powerPos5', () => {
    const rack = [[makeRacked(1, 4, 0, 0, { powerPos5: null })]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('counts each unique module only once even if appearing in multiple rows', () => {
    const dupModule = makeRacked(1, 4, 0, 0, { powerPos12: null });
    const dupRow2 = { ...dupModule, rackingData: { ...dupModule.rackingData, row: 1 } };
    const rack = [[dupModule], [dupRow2]];
    expect(pipe.transform(rack)).toBe(1);
  });

  it('excludes blank modules', () => {
    const rack = [[makeRacked(BLANK_ID, 2, 0, 0, { powerPos12: null })]];
    expect(pipe.transform(rack)).toBe(0);
  });

  it('returns 0 for an empty rack', () => {
    expect(pipe.transform(emptyRack)).toBe(0);
  });
});

// ── HasUnrackedModulesListPipe ────────────────────────────────────────────────

describe('HasUnrackedModulesListPipe', () => {
  const pipe = new HasUnrackedModulesListPipe();

  it('returns false for null input', () => {
    expect(pipe.transform(null)).toBe(false);
  });

  it('returns false when all modules have row and column set', () => {
    expect(pipe.transform(twoRowRack)).toBe(false);
  });

  it('returns true when a module has null row', () => {
    const rack = [[makeRacked(1, 4, null, 0)]];
    expect(pipe.transform(rack)).toBe(true);
  });

  it('returns true when a module has null column', () => {
    const rack = [[makeRacked(1, 4, 0, null)]];
    expect(pipe.transform(rack)).toBe(true);
  });

  it('returns true when a module has undefined row', () => {
    const rack: RackedModule[][] = [[{
      module: makeModule(1, 4),
      rackingData: { id: 10, rackid: 1, moduleid: 1, row: undefined, column: 0 },
    }]];
    expect(pipe.transform(rack)).toBe(true);
  });

  it('returns false for an empty rack', () => {
    expect(pipe.transform(emptyRack)).toBe(false);
  });
});

// ── CalculateRowInformationPipe ───────────────────────────────────────────────

describe('CalculateRowInformationPipe', () => {
  const pipe = new CalculateRowInformationPipe();

  it('sums HP of all modules in the row', () => {
    const row = [makeRacked(1, 6), makeRacked(2, 4)];
    expect(pipe.transform(row)).toBe('Total HP: 10');
  });

  it('returns "Total HP: 0" for an empty row', () => {
    expect(pipe.transform([])).toBe('Total HP: 0');
  });

  it('returns correct HP for a single module', () => {
    expect(pipe.transform([makeRacked(1, 12)])).toBe('Total HP: 12');
  });

  it('includes blank modules in the HP count (it is a row-level sum)', () => {
    const row = [makeRacked(1, 4), makeRacked(BLANK_ID, 2)];
    expect(pipe.transform(row)).toBe('Total HP: 6');
  });
});
