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

const makeRackedModule = (name: string, description = '', tags: string[] = []): any => ({
  module: {
    id: 1,
    name,
    description,
    tags: tags.map(t => ({ tag: { name: t }, voteCount: [] }))
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
      expect(classifySignalFamily({ isVOCT: true, isAudio: false, isDCC: false, name: 'V/Oct' } as any)).toBe('pitch');
    });

    it('returns audio for audio cv', () => {
      expect(classifySignalFamily({ isVOCT: false, isAudio: true, isDCC: false, name: 'Audio Out' } as any)).toBe('audio');
    });

    it('returns clock for DCC cv', () => {
      expect(classifySignalFamily({ isVOCT: false, isAudio: false, isDCC: true, name: 'Clock' } as any)).toBe('clock');
    });

    it('returns other for unknown cv without flags', () => {
      expect(classifySignalFamily({ isVOCT: false, isAudio: false, isDCC: false, name: 'x' } as any)).toBe('other');
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
      const cvs = [{ name: 'Out' }, { name: 'In' }] as any[];
      expect(sortCvNames(cvs)).toEqual(['In', 'Out']);
    });
  });

  describe('flattenRackedModules', () => {
    it('returns empty array for null', () => {
      expect(flattenRackedModules(null)).toEqual([]);
    });

    it('flattens nested rows and excludes blank modules', () => {
      const mod1: any = { module: { id: 1, name: 'VCO', tags: [] } };
      const result = flattenRackedModules([[mod1]]);
      expect(result.length).toBe(1);
      expect(result[0].module.name).toBe('VCO');
    });
  });
});
