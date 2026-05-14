import { hasMissingPowerData, hasCompletePowerData } from './rack-power-data.utils';
import { RackedModule } from 'src/app/models/module';

const make = (p12: number | null, n12: number | null, p5: number | null): RackedModule => ({
  module: { id: 1, hp: 4, powerPos12: p12, powerNeg12: n12, powerPos5: p5 } as any,
  rackingData: { id: 1, row: 0, column: 0, rackid: 1, moduleid: 1 } as any
});

describe('rack-power-data.utils', () => {
  describe('hasMissingPowerData', () => {
    it('returns false when all power fields are present', () => {
      expect(hasMissingPowerData(make(200, 100, 0))).toBeFalse();
    });
    it('returns true when powerPos12 is null', () => {
      expect(hasMissingPowerData(make(null, 100, 0))).toBeTrue();
    });
    it('returns true when powerNeg12 is null', () => {
      expect(hasMissingPowerData(make(200, null, 0))).toBeTrue();
    });
    it('returns true when powerPos5 is null', () => {
      expect(hasMissingPowerData(make(200, 100, null))).toBeTrue();
    });
  });

  describe('hasCompletePowerData', () => {
    it('returns true when all power fields are present', () => {
      expect(hasCompletePowerData(make(200, 100, 0))).toBeTrue();
    });
    it('returns false when any power field is null', () => {
      expect(hasCompletePowerData(make(null, 100, 0))).toBeFalse();
    });
    it('returns false when all power fields are null', () => {
      expect(hasCompletePowerData(make(null, null, null))).toBeFalse();
    });
  });
});
