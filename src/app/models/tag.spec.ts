import {
  FUNCTIONAL_TAG_TYPES,
  isFunctionalTagType,
  normalizeTagName,
  normalizeTagType,
  NUMERIC_TAG_TYPE_NAMES,
  TAG_TYPE_LABELS,
  TAG_TYPE_LEGACY_FUNCTIONAL,
  TagType,
} from './tag';

describe('tag model utilities', () => {

  describe('NUMERIC_TAG_TYPE_NAMES', () => {
    it('maps every TagType enum value to a lowercase label', () => {
      for (const [key, label] of Object.entries(TAG_TYPE_LABELS)) {
        expect(NUMERIC_TAG_TYPE_NAMES[Number(key)]).toBe(label.toLowerCase());
      }
    });

    it('covers all numeric TagType values', () => {
      const enumValues = Object.values(TagType).filter(v => typeof v === 'number') as number[];
      for (const v of enumValues) {
        expect(NUMERIC_TAG_TYPE_NAMES[v]).toBeDefined();
      }
    });
  });

  describe('FUNCTIONAL_TAG_TYPES', () => {
    it('includes all signal-chain role types', () => {
      for (const t of [TagType.Voice, TagType.Source, TagType.Filter, TagType.Modulation, TagType.Effect, TagType.Sequencing, TagType.Utility, TagType.Blank]) {
        expect(FUNCTIONAL_TAG_TYPES.has(TAG_TYPE_LABELS[t].toLowerCase())).toBeTrue();
      }
    });

    it('does not include aesthetic types', () => {
      expect(FUNCTIONAL_TAG_TYPES.has('nature')).toBeFalse();
      expect(FUNCTIONAL_TAG_TYPES.has('character')).toBeFalse();
    });
  });

  describe('normalizeTagType', () => {
    it('maps known numeric DB values to lowercase names', () => {
      expect(normalizeTagType(4)).toBe('source');
      expect(normalizeTagType(1)).toBe('nature');
      expect(normalizeTagType(9)).toBe('utility');
      expect(normalizeTagType(10)).toBe('blank');
    });

    it('returns null for unknown numeric types', () => {
      expect(normalizeTagType(0)).toBeNull();
      expect(normalizeTagType(99)).toBeNull();
    });

    it('lowercases and trims string types', () => {
      expect(normalizeTagType('  Source  ')).toBe('source');
      expect(normalizeTagType('NATURE')).toBe('nature');
    });

    it('returns null for null / undefined / objects', () => {
      expect(normalizeTagType(null)).toBeNull();
      expect(normalizeTagType(undefined)).toBeNull();
      expect(normalizeTagType({})).toBeNull();
    });
  });

  describe('isFunctionalTagType', () => {
    it('returns true for all current functional type names', () => {
      for (const name of ['voice', 'source', 'filter', 'modulation', 'effect', 'sequencing', 'utility', 'blank']) {
        expect(isFunctionalTagType(name)).toBeTrue();
      }
    });

    it('returns true for legacy backend strings', () => {
      for (const name of TAG_TYPE_LEGACY_FUNCTIONAL) {
        expect(isFunctionalTagType(name)).toBeTrue();
      }
    });

    it('returns false for aesthetic / unrelated types', () => {
      expect(isFunctionalTagType('nature')).toBeFalse();
      expect(isFunctionalTagType('character')).toBeFalse();
      expect(isFunctionalTagType(null)).toBeFalse();
      expect(isFunctionalTagType('unknown')).toBeFalse();
    });
  });

  describe('normalizeTagName', () => {
    it('lowercases and trims', () => {
      expect(normalizeTagName('  VCO  ')).toBe('vco');
    });

    it('expands & to and', () => {
      expect(normalizeTagName('S&H')).toBe('s and h');
    });

    it('collapses punctuation to single spaces', () => {
      expect(normalizeTagName('Env. Follow')).toBe('env follow');
      expect(normalizeTagName('Clock Gen.')).toBe('clock gen');
    });

    it('treats "Envelope Gen." and "Envelope Gen" as equal', () => {
      expect(normalizeTagName('Envelope Gen.')).toBe(normalizeTagName('Envelope Gen'));
    });
  });

});
