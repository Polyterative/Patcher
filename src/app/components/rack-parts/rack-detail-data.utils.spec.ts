import {
  cloneRackData,
  buildRackStatistics,
  extractCreatedPatchId,
  isAnyModuleWithoutRackingId,
  buildRowedModulesArray,
  mergeRefreshedModules,
  calculateBlankIdForSizeAndStandard,
  resolveQuickBlankStandardForRow
} from './rack-detail-data.utils';
import {
  DbModule,
  RackedModule
} from '../../models/module';
import {
  RackMinimal,
  RackingData
} from '../../models/rack';

type TestDbModule = DbModule & {functions: unknown[]};

const makeDbModule = (id: number, hp: number, standardId: number): TestDbModule => ({
  id,
  name: `Module ${ id }`,
  description: '',
  hp,
  public: true,
  manufacturer: {id: 1, name: 'Fixture Maker'},
  manufacturerId: 1,
  standard: {id: standardId, name: `Standard ${ standardId }`},
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
  updated: '2026-01-01T00:00:00.000Z',
  functions: []
});

const makeRackMinimal = (rows: number): RackMinimal => ({
  id: 1,
  name: 'Fixture Rack',
  hp: 84,
  rows,
  public: true,
  locked: false,
  author: {id: 'user-1', username: 'alice'},
  created: '2026-01-01T00:00:00.000Z',
  updated: '2026-01-01T00:00:00.000Z'
});

const makeRackedModule = (
  id: number,
  hp: number,
  standardId: number,
  rackingId: number | undefined,
  row: number | null,
  col: number | null
): RackedModule => ({
  module: makeDbModule(id, hp, standardId),
  rackingData: {id: rackingId, row, column: col, rackid: 1, moduleid: id} satisfies RackingData
});

describe('rack-detail-data.utils', () => {
  describe('cloneRackData', () => {
    it('returns deep clone', () => {
      const obj = { a: { b: 1 } };
      const clone = cloneRackData(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
      clone.a.b = 99;
      expect(obj.a.b).toBe(1);
    });
  });

  describe('buildRackStatistics', () => {
    it('returns empty for empty rack', () => {
      expect(buildRackStatistics([])).toEqual([]);
    });

    it('counts modules by HP for standard 0', () => {
      const rows = [[makeRackedModule(1, 4, 0, 1, 0, 0), makeRackedModule(2, 4, 0, 2, 0, 1), makeRackedModule(3, 8, 0, 3, 0, 2)]];
      const stats = buildRackStatistics(rows);
      const hp4 = stats.find(s => s.name === '4HP count');
      const hp8 = stats.find(s => s.name === '8HP count');
      expect(hp4?.value).toBe('2');
      expect(hp8?.value).toBe('1');
    });

    it('ignores non-standard-0 modules', () => {
      const rows = [[makeRackedModule(1, 4, 1, 1, 0, 0)]];
      expect(buildRackStatistics(rows)).toEqual([]);
    });
  });

  describe('extractCreatedPatchId', () => {
    it('throws when no id found', () => {
      expect(() => extractCreatedPatchId(undefined)).toThrow();
    });
    it('extracts id from response.id', () => {
      expect(extractCreatedPatchId({ id: 42 })).toBe(42);
    });
    it('extracts id from response.data[0].id', () => {
      expect(extractCreatedPatchId({ data: [{ id: 7 }] })).toBe(7);
    });
  });

  describe('isAnyModuleWithoutRackingId', () => {
    it('returns false when all modules have rackingData.id', () => {
      const rows = [[makeRackedModule(1, 4, 0, 5, 0, 0)]];
      expect(isAnyModuleWithoutRackingId(rows)).toBeFalse();
    });
    it('returns true when any module has undefined rackingData.id', () => {
      const rows = [[makeRackedModule(1, 4, 0, undefined, 0, 0)]];
      expect(isAnyModuleWithoutRackingId(rows)).toBeTrue();
    });
  });

  describe('buildRowedModulesArray', () => {
    it('builds rows by rackingData.row', () => {
      const modules = [
        makeRackedModule(1, 4, 0, 1, 0, 0),
        makeRackedModule(2, 4, 0, 2, 1, 0),
        makeRackedModule(3, 4, 0, 3, 0, 1)
      ];
      const rack = makeRackMinimal(2);
      const result = buildRowedModulesArray(modules, rack);
      expect(result[0].length).toBe(2);
      expect(result[1].length).toBe(1);
    });

    it('appends unracked modules as extra row', () => {
      const modules = [makeRackedModule(1, 4, 0, 1, null, null)];
      const result = buildRowedModulesArray(modules, makeRackMinimal(1));
      expect(result.length).toBe(2);
    });
  });

  describe('mergeRefreshedModules', () => {
    it('preserves references for known ids and drops removed modules', () => {
      const preservedA = makeRackedModule(1, 4, 0, 11, 0, 0);
      const preservedB = makeRackedModule(2, 6, 0, 12, 0, 1);
      const removed = makeRackedModule(3, 8, 0, 13, 1, 0);
      const freshA = makeRackedModule(1, 10, 0, 11, 0, 0);
      const freshB = makeRackedModule(2, 6, 0, 12, 0, 1);
      const freshD = makeRackedModule(4, 12, 0, 24, 1, 0);

      const merged = mergeRefreshedModules(
        [[preservedA, preservedB], [removed]],
        [freshA, freshB, freshD],
        makeRackMinimal(2)
      );

      expect(merged[0][0]).toBe(preservedA);
      expect(merged[0][1]).toBe(preservedB);
      expect(merged[0][0].module.hp).toBe(10);
      expect(merged[1][0]).toBe(freshD);
      expect(merged.flat().some(module => module.rackingData.id === 13)).toBeFalse();
    });

    it('backfills optimistic ids by row and column', () => {
      const optimistic = makeRackedModule(1, 4, 0, undefined, 0, 0);
      const refreshed = makeRackedModule(1, 4, 0, 55, 0, 0);

      const merged = mergeRefreshedModules(
        [[optimistic]],
        [refreshed],
        makeRackMinimal(1)
      );

      expect(merged[0][0]).toBe(optimistic);
      expect(merged[0][0].rackingData.id).toBe(55);
    });

    it('builds from scratch when there is no current state', () => {
      const refreshed = makeRackedModule(1, 4, 0, 101, 0, 0);
      const rack = makeRackMinimal(1);

      expect(mergeRefreshedModules(null, [refreshed], rack)).toEqual(
        buildRowedModulesArray([refreshed], rack)
      );
    });
  });

  describe('resolveQuickBlankStandardForRow', () => {
    it('chooses Intellijel 1U when it is more than half the row', () => {
      const row = [
        makeRackedModule(1, 4, 1, 1, 0, 0),
        makeRackedModule(2, 6, 1, 2, 0, 1),
        makeRackedModule(3, 8, 0, 3, 0, 2)
      ];

      expect(resolveQuickBlankStandardForRow(row)).toBe(1);
    });

    it('chooses 3U when it is more than half the row', () => {
      const row = [
        makeRackedModule(1, 4, 0, 1, 0, 0),
        makeRackedModule(2, 6, 0, 2, 0, 1),
        makeRackedModule(3, 8, 1, 3, 0, 2)
      ];

      expect(resolveQuickBlankStandardForRow(row)).toBe(0);
    });

    it('chooses Pulp Logic 1U when it is more than half the row', () => {
      const row = [
        makeRackedModule(1, 4, 2, 1, 0, 0),
        makeRackedModule(2, 6, 2, 2, 0, 1),
        makeRackedModule(3, 8, 0, 3, 0, 2)
      ];

      expect(resolveQuickBlankStandardForRow(row)).toBe(2);
    });

    it('falls back to the leftmost module standard when no row standard is a majority', () => {
      const row = [
        makeRackedModule(1, 4, 1, 1, 0, 0),
        makeRackedModule(2, 6, 0, 2, 0, 1)
      ];

      expect(resolveQuickBlankStandardForRow(row)).toBe(1);
    });

    it('falls back to 3U for an empty row', () => {
      expect(resolveQuickBlankStandardForRow([])).toBe(0);
    });
  });

  describe('calculateBlankIdForSizeAndStandard', () => {
    it('returns correct id for 3U eurorack standard 0', () => {
      expect(calculateBlankIdForSizeAndStandard(2, 0)).toBe(4647);
    });
    it('returns correct id for Intellijel standard 1', () => {
      expect(calculateBlankIdForSizeAndStandard(1, 1)).toBe(4711);
    });
    it('returns -1 for unsupported standards that do not have blank ids yet', () => {
      expect(calculateBlankIdForSizeAndStandard(4, 2)).toBe(-1);
      expect(calculateBlankIdForSizeAndStandard(4, 9)).toBe(-1);
    });
    it('returns -1 for unknown HP in standard 0', () => {
      expect(calculateBlankIdForSizeAndStandard(999, 0)).toBe(-1);
    });
  });
});
