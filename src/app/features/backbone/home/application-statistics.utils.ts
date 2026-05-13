import { PublicApplicationActivityPoint } from '../../backend/supabase-queries';
import {
  ApplicationInsightsBar,
  MetricTone,
} from './application-statistics.models';

export interface ActivityWindowTotals {
  modules: number;
  racks: number;
  patches: number;
}

const HP_BAND_ORDER = ['0-2 HP', '3-5 HP', '6-8 HP', '9-16 HP', '17-28 HP', '29+ HP'];

export function sumActivityWindow(
  series: PublicApplicationActivityPoint[],
  start: number,
  end?: number
): ActivityWindowTotals {
  const window = series.slice(start, end);
  return {
    modules: window.reduce((sum, p) => sum + p.modules, 0),
    racks: window.reduce((sum, p) => sum + p.racks, 0),
    patches: window.reduce((sum, p) => sum + p.patches, 0),
  };
}

export function getMaxDailyTotal(activitySeries: PublicApplicationActivityPoint[]): number {
  return Math.max(
    1,
    ...activitySeries.map((point) => point.modules + point.racks + point.patches)
  );
}

export function getMaxRollingWindowTotal(activitySeries: PublicApplicationActivityPoint[], windowSize: number): number {
  if (activitySeries.length === 0) {
    return 0;
  }

  return activitySeries.reduce((maxTotal, _, startIndex) => {
    const total = activitySeries
      .slice(startIndex, startIndex + windowSize)
      .reduce((sum, point) => sum + point.modules + point.racks + point.patches, 0);
    return Math.max(maxTotal, total);
  }, 0);
}

export function getBucketCount(buckets: {label: string; count: number}[], label: string): number {
  return buckets.find((bucket) => bucket.label === label)?.count ?? 0;
}

export function getTopBucket<T extends {label: string; count: number}>(buckets: T[]): T | undefined {
  return [...buckets].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.label.localeCompare(b.label);
  })[0];
}

export function getHpBandOrder(label: string): number {
  const index = HP_BAND_ORDER.indexOf(label);
  return index === -1 ? HP_BAND_ORDER.length : index;
}

export function sortHpBuckets<T extends {label: string}>(buckets: T[]): T[] {
  return [...buckets].sort((a, b) => getHpBandOrder(a.label) - getHpBandOrder(b.label));
}

export function formatPercentValue(part: number, total: number): string {
  return `${ Math.round((part / Math.max(total, 1)) * 100) }%`;
}

export function mapBarWidths(
  metrics: {
    label: string;
    rawValue: number;
    valueLabel: string;
    detail: string;
    tone: MetricTone;
  }[]
): ApplicationInsightsBar[] {
  const maxValue = Math.max(1, ...metrics.map((metric) => metric.rawValue));

  return metrics.map((metric) => ({
    label: metric.label,
    valueLabel: metric.valueLabel,
    detail: metric.detail,
    widthPercent: metric.rawValue > 0
      ? Math.max(14, Math.round((metric.rawValue / maxValue) * 100))
      : 0,
    tone: metric.tone
  }));
}

export function createRateDatum(
  label: string,
  numerator: number,
  denominator: number,
  tone: MetricTone,
  options?: {
    scale?: number;
    valueSuffix?: string;
    detail: string;
    minimumNumerator?: number;
    minimumDenominator?: number;
  }
) {
  const scale = options?.scale ?? 1;
  const minimumNumerator = options?.minimumNumerator ?? 3;
  const minimumDenominator = options?.minimumDenominator ?? 3;

  if (numerator < minimumNumerator || denominator < minimumDenominator) {
    return null;
  }

  const rawValue = Math.round((numerator * scale) / denominator);
  return {
    label,
    rawValue,
    valueLabel: `${ rawValue }${ options?.valueSuffix ? ` ${ options.valueSuffix }` : '' }`.trim(),
    detail: options?.detail ?? '',
    tone
  };
}
