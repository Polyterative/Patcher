import { toSortDirection, matchesSelectedTags, getModuleStandardId, compareModulesByCreated } from './module-browser-data.utils';
import { MinimalModule } from '../../models/module';
import { TagType } from '../../models/tag';

type ModuleWithNumericStandard = Omit<MinimalModule, 'standard'> & { standard: number };
type ModuleWithoutStandard = Omit<MinimalModule, 'standard'> & { standard: undefined };
type RuntimeStandardFixture = ModuleWithNumericStandard | ModuleWithoutStandard;

const asRuntimeModule = (module: RuntimeStandardFixture): MinimalModule => module as unknown as MinimalModule;

const makeModule = (name: string, created: string, standardId?: number, tags: number[] = []): MinimalModule => ({
  id: 1,
  name,
  description: '',
  hp: 8,
  public: true,
  manufacturer: { id: 1, name: 'Doepfer' },
  manufacturerId: 1,
  created,
  updated: created,
  standard: { id: standardId ?? 0, name: standardId === undefined ? 'Unknown' : `standard${standardId}` },
  tags: tags.map(id => ({
    id,
    tag: { id, name: `tag${id}`, type: TagType.Utility },
    voteCount: []
  })),
  panels: []
});

describe('module-browser-data.utils', () => {
  describe('toSortDirection', () => {
    it('returns asc for label with ↑', () => {
      expect(toSortDirection('Date ↑')).toBe('asc');
    });
    it('returns desc for label without ↑', () => {
      expect(toSortDirection('Name ↓')).toBe('desc');
    });
    it('returns desc for undefined', () => {
      expect(toSortDirection(undefined)).toBe('desc');
    });
  });

  describe('matchesSelectedTags', () => {
    it('returns true when module has a selected tag', () => {
      const mod = makeModule('M', '2024', 0, [1, 2]);
      expect(matchesSelectedTags(mod, [2, 3])).toBeTrue();
    });
    it('returns false when no tags match', () => {
      const mod = makeModule('M', '2024', 0, [1]);
      expect(matchesSelectedTags(mod, [5, 6])).toBeFalse();
    });
    it('returns true in AND mode when all selected tags are present', () => {
      const mod = makeModule('M', '2024', 0, [1, 2, 3]);
      expect(matchesSelectedTags(mod, [1, 3], 'AND')).toBeTrue();
    });
    it('returns false in AND mode when a selected tag is missing', () => {
      const mod = makeModule('M', '2024', 0, [1, 2]);
      expect(matchesSelectedTags(mod, [1, 4], 'AND')).toBeFalse();
    });
    it('returns false when module has no tags', () => {
      expect(matchesSelectedTags(makeModule('M', '2024'), [1])).toBeFalse();
    });
  });

  describe('getModuleStandardId', () => {
    it('returns id when standard is object', () => {
      expect(getModuleStandardId(makeModule('M', '2024', 1))).toBe(1);
    });
    it('returns number when standard is number', () => {
      const mod: ModuleWithNumericStandard = { ...makeModule('M', '2024'), standard: 2 };
      expect(getModuleStandardId(asRuntimeModule(mod))).toBe(2);
    });
    it('returns undefined when no standard', () => {
      const mod: ModuleWithoutStandard = { ...makeModule('M', '2024'), standard: undefined };
      expect(getModuleStandardId(asRuntimeModule(mod))).toBeUndefined();
    });
  });

  describe('compareModulesByCreated', () => {
    it('sorts asc by created date', () => {
      const a = makeModule('A', '2022-01-01');
      const b = makeModule('B', '2023-01-01');
      expect(compareModulesByCreated(a, b, 'asc')).toBeLessThan(0);
    });
    it('sorts desc by created date', () => {
      const a = makeModule('A', '2022-01-01');
      const b = makeModule('B', '2023-01-01');
      expect(compareModulesByCreated(a, b, 'desc')).toBeGreaterThan(0);
    });
    it('falls back to name sort when dates equal', () => {
      const a = makeModule('B', '2022-01-01');
      const b = makeModule('A', '2022-01-01');
      expect(compareModulesByCreated(a, b, 'asc')).toBeGreaterThan(0);
    });
  });
});
