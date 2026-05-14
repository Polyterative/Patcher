import {
  toComparableCv,
  areCvListsEqual,
  hasInsOutsChanges,
  fileExtensionFromName,
  stripFileExtension,
  fileExtensionFromType,
  safeString,
  measurePanelAppearance,
  classifyPanelType,
  getPanelAnalysisDimensions,
  releaseDecodedPanelImage
} from './module-editor-data.utils';

const makeCV = (id: number, name: string, min: number | null = null, max: number | null = null, isApproved = false) => ({
  id, name, min, max, isApproved
} as any);

describe('module-editor-data.utils', () => {
  describe('toComparableCv', () => {
    it('extracts fields correctly', () => {
      const cv = makeCV(1, '  Pitch  ', -5, 5, true);
      const result = toComparableCv(cv);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Pitch');
      expect(result.min).toBe(-5);
      expect(result.max).toBe(5);
      expect(result.isApproved).toBeTrue();
    });

    it('uses defaults for null input fields', () => {
      const result = toComparableCv(null as any);
      expect(result.id).toBe(0);
      expect(result.name).toBe('');
    });
  });

  describe('areCvListsEqual', () => {
    it('returns true for identical lists', () => {
      const a = [makeCV(1, 'Gate')];
      const b = [makeCV(1, 'Gate')];
      expect(areCvListsEqual(a, b)).toBeTrue();
    });

    it('returns false when lengths differ', () => {
      expect(areCvListsEqual([makeCV(1, 'A')], [])).toBeFalse();
    });

    it('returns false when cv differs', () => {
      expect(areCvListsEqual([makeCV(1, 'A')], [makeCV(1, 'B')])).toBeFalse();
    });
  });

  describe('hasInsOutsChanges', () => {
    it('returns false when ins/outs match module', () => {
      const cv = makeCV(1, 'A');
      const module = { ins: [cv], outs: [] } as any;
      expect(hasInsOutsChanges([cv], [], module)).toBeFalse();
    });

    it('returns true when ins differ', () => {
      const module = { ins: [], outs: [] } as any;
      expect(hasInsOutsChanges([makeCV(1, 'X')], [], module)).toBeTrue();
    });
  });

  describe('fileExtensionFromName', () => {
    it('returns extension from filename', () => {
      expect(fileExtensionFromName('photo.jpg')).toBe('jpg');
    });
    it('returns empty for no extension', () => {
      expect(fileExtensionFromName('noext')).toBe('');
    });
    it('returns empty for undefined', () => {
      expect(fileExtensionFromName(undefined)).toBe('');
    });
  });

  describe('stripFileExtension', () => {
    it('strips extension', () => {
      expect(stripFileExtension('photo.jpg')).toBe('photo');
    });
    it('returns empty for undefined', () => {
      expect(stripFileExtension(undefined)).toBe('');
    });
  });

  describe('fileExtensionFromType', () => {
    it('returns png for image/png', () => {
      const result = fileExtensionFromType('image/png');
      expect(result).toBeTruthy();
    });
    it('returns empty for undefined', () => {
      expect(fileExtensionFromType(undefined)).toBe('');
    });
  });

  describe('safeString', () => {
    it('replaces non-alphanumeric with underscore', () => {
      expect(safeString('hello world!')).toBe('hello_world_');
    });
    it('returns empty for undefined', () => {
      expect(safeString(undefined)).toBe('');
    });
    it('preserves alphanumeric', () => {
      expect(safeString('abc123')).toBe('abc123');
    });
  });

  describe('measurePanelAppearance', () => {
    it('returns all-max for empty data (0 opaque pixels)', () => {
      const data = new Uint8ClampedArray(0);
      const result = measurePanelAppearance(data);
      expect(result.averageLuminance).toBe(1);
      expect(result.averageSaturation).toBe(0);
      expect(result.colorfulPixelRatio).toBe(0);
    });

    it('handles transparent pixels (alpha < 0.5)', () => {
      const data = new Uint8ClampedArray([255, 0, 0, 100]); // alpha 100/255 < 0.5
      const result = measurePanelAppearance(data);
      expect(result.averageLuminance).toBe(1);
    });

    it('processes opaque red pixel', () => {
      const data = new Uint8ClampedArray([255, 0, 0, 255]); // red, full alpha
      const result = measurePanelAppearance(data);
      expect(result.averageLuminance).toBeCloseTo(0.2126, 3);
      expect(result.colorfulPixelRatio).toBe(1);
    });
  });

  describe('classifyPanelType', () => {
    it('returns 3 for colorful panel', () => {
      expect(classifyPanelType({ averageLuminance: 0.5, averageSaturation: 0.5, colorfulPixelRatio: 0.5 })).toBe(3);
    });
    it('returns 2 for dark panel', () => {
      expect(classifyPanelType({ averageLuminance: 0.2, averageSaturation: 0, colorfulPixelRatio: 0 })).toBe(2);
    });
    it('returns 1 for light neutral panel', () => {
      expect(classifyPanelType({ averageLuminance: 0.8, averageSaturation: 0, colorfulPixelRatio: 0 })).toBe(1);
    });
  });

  describe('getPanelAnalysisDimensions', () => {
    it('returns original dimensions when within limit', () => {
      expect(getPanelAnalysisDimensions(100, 100)).toEqual({width: 100, height: 100});
    });
    it('scales down to max 192 on longest edge', () => {
      const result = getPanelAnalysisDimensions(384, 192);
      expect(result.width).toBe(192);
      expect(result.height).toBe(96);
    });
  });

  describe('releaseDecodedPanelImage', () => {
    it('calls close() if available', () => {
      const mockImage = { close: jasmine.createSpy('close') } as any;
      releaseDecodedPanelImage(mockImage);
      expect(mockImage.close).toHaveBeenCalled();
    });
    it('does not throw when close is not available', () => {
      expect(() => releaseDecodedPanelImage({} as any)).not.toThrow();
    });
  });
});
