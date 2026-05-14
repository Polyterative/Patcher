import {
  sumActivityWindow,
  getMaxDailyTotal,
  getMaxRollingWindowTotal,
  getBucketCount,
  getTopBucket,
  getHpBandOrder,
  sortHpBuckets,
  formatPercentValue,
  mapBarWidths,
  createRateDatum
} from './application-statistics.utils';

const makePoint = (modules: number, racks: number, patches: number) => ({ modules, racks, patches } as any);

describe('application-statistics.utils', () => {
  describe('sumActivityWindow', () => {
    const series = [makePoint(1, 2, 3), makePoint(4, 5, 6), makePoint(7, 8, 9)];

    it('sums all when no end', () => {
      const r = sumActivityWindow(series, 0);
      expect(r).toEqual({ modules: 12, racks: 15, patches: 18 });
    });

    it('sums slice', () => {
      const r = sumActivityWindow(series, 0, 2);
      expect(r).toEqual({ modules: 5, racks: 7, patches: 9 });
    });

    it('returns zeros for empty', () => {
      expect(sumActivityWindow([], 0)).toEqual({ modules: 0, racks: 0, patches: 0 });
    });
  });

  describe('getMaxDailyTotal', () => {
    it('returns 1 for empty series', () => {
      expect(getMaxDailyTotal([])).toBe(1);
    });

    it('returns max daily sum', () => {
      const series = [makePoint(1, 1, 1), makePoint(10, 5, 5)];
      expect(getMaxDailyTotal(series)).toBe(20);
    });
  });

  describe('getMaxRollingWindowTotal', () => {
    it('returns 0 for empty series', () => {
      expect(getMaxRollingWindowTotal([], 3)).toBe(0);
    });

    it('returns max window sum', () => {
      const series = [makePoint(1, 1, 1), makePoint(5, 5, 5), makePoint(1, 1, 1)];
      expect(getMaxRollingWindowTotal(series, 2)).toBe(18);
    });
  });

  describe('getBucketCount', () => {
    const buckets = [{ label: 'A', count: 5 }, { label: 'B', count: 3 }];

    it('returns count for matching label', () => {
      expect(getBucketCount(buckets, 'A')).toBe(5);
    });

    it('returns 0 for unknown label', () => {
      expect(getBucketCount(buckets, 'Z')).toBe(0);
    });
  });

  describe('getTopBucket', () => {
    it('returns undefined for empty', () => {
      expect(getTopBucket([])).toBeUndefined();
    });

    it('returns highest count bucket', () => {
      const buckets = [{ label: 'A', count: 3 }, { label: 'B', count: 10 }];
      expect(getTopBucket(buckets)?.label).toBe('B');
    });
  });

  describe('getHpBandOrder', () => {
    it('returns correct index for known band', () => {
      expect(getHpBandOrder('0-2 HP')).toBe(0);
      expect(getHpBandOrder('29+ HP')).toBe(5);
    });

    it('returns 6 for unknown label', () => {
      expect(getHpBandOrder('unknown')).toBe(6);
    });
  });

  describe('sortHpBuckets', () => {
    it('sorts by HP band order', () => {
      const buckets = [{ label: '29+ HP' }, { label: '0-2 HP' }] as any;
      const sorted = sortHpBuckets(buckets);
      expect(sorted[0].label).toBe('0-2 HP');
    });
  });

  describe('formatPercentValue', () => {
    it('returns correct percent', () => {
      expect(formatPercentValue(1, 4)).toBe('25%');
    });

    it('handles zero total with max(1)', () => {
      expect(formatPercentValue(0, 0)).toBe('0%');
    });
  });

  describe('mapBarWidths', () => {
    it('maps widthPercent proportionally', () => {
      const metrics = [
        { label: 'A', rawValue: 100, valueLabel: '100', detail: '', tone: 'neutral' as any },
        { label: 'B', rawValue: 50, valueLabel: '50', detail: '', tone: 'neutral' as any }
      ];
      const result = mapBarWidths(metrics);
      expect(result[0].widthPercent).toBe(100);
      expect(result[1].widthPercent).toBe(50);
    });

    it('returns 0 widthPercent for rawValue 0', () => {
      const metrics = [
        { label: 'A', rawValue: 0, valueLabel: '0', detail: '', tone: 'neutral' as any }
      ];
      expect(mapBarWidths(metrics)[0].widthPercent).toBe(0);
    });
  });

  describe('createRateDatum', () => {
    it('returns null when numerator below minimum', () => {
      expect(createRateDatum('L', 1, 10, 'neutral' as any, { detail: '' })).toBeNull();
    });

    it('returns null when denominator below minimum', () => {
      expect(createRateDatum('L', 10, 1, 'neutral' as any, { detail: '' })).toBeNull();
    });

    it('returns datum when both above minimum', () => {
      const result = createRateDatum('Label', 100, 10, 'neutral' as any, { scale: 1, detail: 'desc' });
      expect(result).not.toBeNull();
      expect(result?.rawValue).toBe(10);
    });
  });
});
