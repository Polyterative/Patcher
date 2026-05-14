import {
  cloneRackData,
  buildRackStatistics,
  extractCreatedPatchId,
  isAnyModuleWithoutRackingId,
  buildRowedModulesArray,
  calculateBlankIdForSizeAndStandard
} from './rack-detail-data.utils';
import { RackedModule } from '../../models/module';
import { RackMinimal } from '../../models/rack';

const makeRackedModule = (id: number, hp: number, standardId: number, rackingId: number, row: number | null, col: number | null): RackedModule => ({
  module: { id, hp, standard: { id: standardId } } as any,
  rackingData: { id: rackingId, row, column: col, rackid: 1, moduleid: id } as any
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
      const rows = [[makeRackedModule(1, 4, 0, undefined as any, 0, 0)]];
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
      const rack = { rows: 2 } as RackMinimal;
      const result = buildRowedModulesArray(modules, rack);
      expect(result[0].length).toBe(2);
      expect(result[1].length).toBe(1);
    });

    it('appends unracked modules as extra row', () => {
      const modules = [makeRackedModule(1, 4, 0, 1, null, null)];
      const result = buildRowedModulesArray(modules, { rows: 1 } as RackMinimal);
      expect(result.length).toBe(2);
    });
  });

  describe('calculateBlankIdForSizeAndStandard', () => {
    it('returns correct id for 3U eurorack standard 0', () => {
      expect(calculateBlankIdForSizeAndStandard(2, 0)).toBe(4647);
    });
    it('returns correct id for Intellijel standard 1', () => {
      expect(calculateBlankIdForSizeAndStandard(1, 1)).toBe(4711);
    });
    it('returns -1 for unknown standard', () => {
      expect(calculateBlankIdForSizeAndStandard(4, 9)).toBe(-1);
    });
    it('returns -1 for unknown HP in standard 0', () => {
      expect(calculateBlankIdForSizeAndStandard(999, 0)).toBe(-1);
    });
  });
});
