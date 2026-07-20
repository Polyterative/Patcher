import { hasMissingPowerData, hasCompletePowerData } from './rack-power-data.utils';
import { DbModule, RackedModule } from 'src/app/models/module';

const makeModule = (p12: number | null, n12: number | null, p5: number | null): DbModule => ({
  id: 1,
  created: '',
  updated: '',
  name: 'Module 1',
  description: '',
  hp: 4,
  public: true,
  manufacturer: { id: 1, name: 'Test Maker' },
  manufacturerId: 1,
  standard: { id: 0, name: 'Eurorack' },
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
  powerPos12: p12,
  powerNeg12: n12,
  powerPos5: p5,
  depth: 0,
  weight: 0
});

const make = (p12: number | null, n12: number | null, p5: number | null): RackedModule => ({
  module: makeModule(p12, n12, p5),
  rackingData: { id: 1, row: 0, column: 0, rackid: 1, moduleid: 1 }
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
