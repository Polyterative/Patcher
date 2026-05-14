import { getModuleFormatGeometry, MODULE_FORMAT_GEOMETRY } from './module-format-geometry.constants';

describe('module-format-geometry.constants', () => {
  describe('getModuleFormatGeometry', () => {
    it('returns EURORACK_3U for undefined standard', () => {
      expect(getModuleFormatGeometry(undefined)).toBe(MODULE_FORMAT_GEOMETRY.EURORACK_3U);
    });

    it('returns EURORACK_3U for standard id 0', () => {
      expect(getModuleFormatGeometry({ id: 0 } as any)).toBe(MODULE_FORMAT_GEOMETRY.EURORACK_3U);
    });

    it('returns INTELLIJEL_1U for standard id 1', () => {
      expect(getModuleFormatGeometry({ id: 1 } as any)).toBe(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U);
    });

    it('returns PULP_LOGIC_1U for standard id 2', () => {
      expect(getModuleFormatGeometry({ id: 2 } as any)).toBe(MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U);
    });

    it('falls back to INTELLIJEL_1U for unknown standard id', () => {
      expect(getModuleFormatGeometry({ id: 999 } as any)).toBe(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U);
    });
  });

  describe('MODULE_FORMAT_GEOMETRY constants', () => {
    it('EURORACK_3U has expected height', () => {
      expect(MODULE_FORMAT_GEOMETRY.EURORACK_3U.heightMm).toBeCloseTo(128.5, 1);
    });

    it('INTELLIJEL_1U has id 1', () => {
      expect(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.id).toBe(1);
    });

    it('PULP_LOGIC_1U has correct height', () => {
      expect(MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightMm).toBeCloseTo(43.18, 1);
    });

    it('all formats share the same hpWidthMm (5.08)', () => {
      const formats = Object.values(MODULE_FORMAT_GEOMETRY);
      formats.forEach(f => expect(f.hpWidthMm).toBeCloseTo(5.08, 2));
    });
  });
});
