import {
  moduleContextParts,
  moduleContextMatches,
  classifySignalFamily,
  normalizedTokenOverlap,
  normalizeSignalTokens,
  sortNames,
  compareNames,
  sortCvNames,
  flattenRackedModules
} from './rack-signal-analysis.helpers';
import { CV } from 'src/app/models/cv';
import { RackedModule } from 'src/app/models/module';
import { TagType } from 'src/app/models/tag';

const makeCv = (
  name: string,
  flags: Pick<CV, 'isVOCT' | 'isAudio' | 'isDCC'>
): CV => ({
  id: 1,
  name,
  ...flags
});

const makeRackedModule = (name: string, description = '', tags: string[] = []): RackedModule => ({
  rackingData: {
    id: 1,
    row: 0,
    column: 0,
    moduleid: 1,
    rackid: 1
  },
  module: {
    id: 1,
    name,
    description,
    hp: 8,
    public: true,
    manufacturer: {id: 1, name: 'Maker'},
    manufacturerId: 1,
    standard: {id: 0, name: '3U Eurorack'},
    tags: tags.map((tagName, index) => ({
      id: index + 1,
      tag: {id: index + 1, name: tagName, type: TagType.Source},
      voteCount: []
    })),
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
    powerPos12: 0,
    powerNeg12: 0,
    powerPos5: 0,
    depth: 0,
    weight: 0,
    created: '',
    updated: ''
  }
});

describe('rack-signal-analysis.helpers', () => {
  describe('moduleContextParts', () => {
    it('returns name, description, tags lowercased', () => {
      const mod = makeRackedModule('VCO', 'Oscillator', ['Audio']);
      const parts = moduleContextParts(mod);
      expect(parts).toContain('vco');
      expect(parts).toContain('oscillator');
      expect(parts).toContain('audio');
    });

    it('filters out falsy values', () => {
      const mod = makeRackedModule('VCO', '', []);
      const parts = moduleContextParts(mod);
      expect(parts).toEqual(['vco']);
    });
  });

  describe('moduleContextMatches', () => {
    it('returns true when name matches pattern', () => {
      const mod = makeRackedModule('VCO Filter');
      expect(moduleContextMatches(mod, /filter/i)).toBe(true);
    });

    it('returns false when nothing matches', () => {
      const mod = makeRackedModule('VCO');
      expect(moduleContextMatches(mod, /drum/i)).toBe(false);
    });
  });

  describe('classifySignalFamily', () => {
    it('returns other for null', () => {
      expect(classifySignalFamily(null)).toBe('other');
    });

    it('returns pitch for V/OCT', () => {
      expect(classifySignalFamily(makeCv('V/Oct', {isVOCT: true, isAudio: false, isDCC: false}))).toBe('pitch');
    });

    it('returns audio for audio cv', () => {
      expect(classifySignalFamily(makeCv('Audio Out', {isVOCT: false, isAudio: true, isDCC: false}))).toBe('audio');
    });

    it('returns clock for DCC cv', () => {
      expect(classifySignalFamily(makeCv('Clock', {isVOCT: false, isAudio: false, isDCC: true}))).toBe('clock');
    });

    it('returns other for unknown cv without flags', () => {
      expect(classifySignalFamily(makeCv('x', {isVOCT: false, isAudio: false, isDCC: false}))).toBe('other');
    });
  });

  describe('normalizeSignalTokens', () => {
    it('lowercases and splits tokens', () => {
      expect(normalizeSignalTokens('V/OCT Out')).toEqual(jasmine.arrayContaining(['voct', 'out']));
    });

    it('normalizes v/oct to voct', () => {
      const tokens = normalizeSignalTokens('v/oct');
      expect(tokens).toContain('voct');
    });

    it('filters tokens under length 2', () => {
      expect(normalizeSignalTokens('a b long')).not.toContain('a');
    });

    it('respects ignore set', () => {
      const tokens = normalizeSignalTokens('out cv', { ignoreTokens: new Set(['out']) });
      expect(tokens).not.toContain('out');
      expect(tokens).toContain('cv');
    });
  });

  describe('normalizedTokenOverlap', () => {
    it('returns 0 for no common tokens', () => {
      expect(normalizedTokenOverlap('audio out', 'clock in')).toBe(0);
    });

    it('counts shared tokens', () => {
      expect(normalizedTokenOverlap('audio out', 'audio in')).toBe(1);
    });
  });

  describe('compareNames', () => {
    it('sorts alphabetically', () => {
      expect(compareNames('alpha', 'beta')).toBeLessThan(0);
    });

    it('handles null values', () => {
      expect(() => compareNames(null, null)).not.toThrow();
    });

    it('sorts numerically', () => {
      expect(compareNames('2', '10')).toBeLessThan(0);
    });
  });

  describe('sortNames', () => {
    it('sorts an array of names', () => {
      expect(sortNames(['Beta', 'Alpha'])).toEqual(['Alpha', 'Beta']);
    });

    it('does not mutate the original array', () => {
      const arr = ['B', 'A'];
      sortNames(arr);
      expect(arr).toEqual(['B', 'A']);
    });
  });

  describe('sortCvNames', () => {
    it('handles null cvs', () => {
      expect(sortCvNames(null)).toEqual([]);
    });

    it('sorts cv names', () => {
      const cvs: CV[] = [{id: 1, name: 'Out'}, {id: 2, name: 'In'}];
      expect(sortCvNames(cvs)).toEqual(['In', 'Out']);
    });
  });

  describe('flattenRackedModules', () => {
    it('returns empty array for null', () => {
      expect(flattenRackedModules(null)).toEqual([]);
    });

    it('flattens nested rows and excludes blank modules', () => {
      const mod1 = makeRackedModule('VCO');
      const result = flattenRackedModules([[mod1]]);
      expect(result.length).toBe(1);
      expect(result[0].module.name).toBe('VCO');
    });
  });
});
