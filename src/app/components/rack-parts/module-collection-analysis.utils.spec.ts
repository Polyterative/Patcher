import {
  getStandardName,
  filterModulesByStandard,
  calculateRequiredRows,
  groupModulesByStandard,
  buildStandardAnalysis,
  analyzeRackConfiguration,
  analyzeModuleCollection,
  suggestRackDimensions
} from './module-collection-analysis.utils';
import { MinimalModule } from 'src/app/models/module';

const makeModule = (id: number, hp: number, standardId = 0): MinimalModule => ({
  id, hp, name: `M${id}`, description: '', manufacturer_id: 1,
  standard: { id: standardId } as any
} as any);

describe('module-collection-analysis.utils', () => {
  describe('getStandardName', () => {
    it('returns 3U Eurorack for id 0', () => {
      expect(getStandardName(0)).toBe('3U Eurorack');
    });
    it('returns Intellijel 1U for id 1', () => {
      expect(getStandardName(1)).toBe('Intellijel 1U');
    });
    it('returns Unknown for unknown id', () => {
      expect(getStandardName(999)).toBe('Unknown');
    });
  });

  describe('filterModulesByStandard', () => {
    const modules = [makeModule(1, 4, 0), makeModule(2, 4, 1), makeModule(3, 4, 2)];

    it('returns empty array for null input', () => {
      expect(filterModulesByStandard(null, 0)).toEqual([]);
    });

    it('filters by single standard id', () => {
      expect(filterModulesByStandard(modules, 0).length).toBe(1);
    });

    it('filters by multiple standard ids', () => {
      expect(filterModulesByStandard(modules, [0, 1]).length).toBe(2);
    });

    it('defaults to EURORACK_3U when standard is missing', () => {
      const noStd = [{ id: 10, hp: 4 } as any];
      expect(filterModulesByStandard(noStd, 0).length).toBe(1);
    });
  });

  describe('calculateRequiredRows', () => {
    it('returns 0 for empty modules', () => {
      expect(calculateRequiredRows([], 84)).toBe(0);
    });

    it('returns 0 for hpPerRow <= 0', () => {
      expect(calculateRequiredRows([makeModule(1, 4)], 0)).toBe(0);
    });

    it('places all small modules in one row', () => {
      const modules = [makeModule(1, 4), makeModule(2, 4), makeModule(3, 4)];
      expect(calculateRequiredRows(modules, 84)).toBe(1);
    });

    it('needs more rows when modules exceed row capacity', () => {
      const modules = Array.from({length: 10}, (_, i) => makeModule(i, 10));
      expect(calculateRequiredRows(modules, 42)).toBe(3);
    });
  });

  describe('groupModulesByStandard', () => {
    it('returns empty map for empty array', () => {
      expect(groupModulesByStandard([]).size).toBe(0);
    });

    it('groups modules by standard id', () => {
      const modules = [makeModule(1, 4, 0), makeModule(2, 4, 1), makeModule(3, 4, 0)];
      const result = groupModulesByStandard(modules);
      expect(result.get(0)?.length).toBe(2);
      expect(result.get(1)?.length).toBe(1);
    });
  });

  describe('buildStandardAnalysis', () => {
    it('returns null for empty modules', () => {
      expect(buildStandardAnalysis([], 0)).toBeNull();
    });

    it('returns analysis with correct stats', () => {
      const modules = [makeModule(1, 8, 0), makeModule(2, 4, 0)];
      const result = buildStandardAnalysis(modules, 0, 84);
      expect(result?.moduleCount).toBe(2);
      expect(result?.largestModuleHp).toBe(8);
      expect(result?.totalModulesHp).toBe(12);
    });
  });

  describe('analyzeRackConfiguration', () => {
    it('returns empty config for no modules', () => {
      const result = analyzeRackConfiguration(84, 2, []);
      expect(result.moduleCount).toBe(0);
      expect(result.totalCapacity).toBe(168);
    });

    it('returns analysis with modules', () => {
      const modules = [makeModule(1, 8), makeModule(2, 4)];
      const result = analyzeRackConfiguration(84, 2, modules);
      expect(result.moduleCount).toBe(2);
      expect(result.totalModulesHp).toBe(12);
    });
  });

  describe('analyzeModuleCollection', () => {
    it('returns empty for null', () => {
      expect(analyzeModuleCollection(null)).toEqual([]);
    });

    it('returns standard analyses', () => {
      const modules = [makeModule(1, 8), makeModule(2, 4)];
      const result = analyzeModuleCollection(modules);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('suggestRackDimensions', () => {
    it('returns defaults for empty modules', () => {
      expect(suggestRackDimensions(null)).toEqual({hp: 84, rows: 2});
    });

    it('returns dimensions that fit modules', () => {
      const modules = [makeModule(1, 8), makeModule(2, 4)];
      const result = suggestRackDimensions(modules);
      expect(result.hp).toBeGreaterThanOrEqual(8);
      expect(result.rows).toBeGreaterThan(0);
    });
  });
});
