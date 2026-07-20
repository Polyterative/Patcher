/**
 * Manufacturer statistics utilities for SupabaseQueriesService
 */
import {
  ManufacturerModuleStats,
  ModuleActivityRow
} from './supabase-queries.types';
import { normalizeSupabaseUtcTimestamp } from 'src/app/shared-interproject/pipes/supabase-utc-timestamp.pipe';

const EMPTY_STATS: ManufacturerModuleStats = {
  moduleCount: 0,
  latestModuleUpdatedAt: null,
  latestModuleUpdatedAtMs: null,
  changedModulesLast30Days: 0
};


export type ManufacturerAnalyticsMetricKey =
  | 'views'
  | 'outboundClicks'
  | 'collectionAdds'
  | 'publicRackUses'
  | 'publicPatchUses';

export interface ManufacturerAnalyticsMaskedMetric {
  key: ManufacturerAnalyticsMetricKey;
  state: 'visible' | 'hidden';
  label: string;
  copy: string;
  value?: number;
}

export interface ManufacturerAnalyticsSummary {
  metrics: ManufacturerAnalyticsMaskedMetric[];
  visibleMetricCount: number;
  privacyCopy: string;
}

export const MANUFACTURER_ANALYTICS_THRESHOLDS: Record<ManufacturerAnalyticsMetricKey, number> = {
  collectionAdds: 5,
  outboundClicks: 5,
  publicPatchUses: 3,
  publicRackUses: 3,
  views: 10
};

const MANUFACTURER_ANALYTICS_LABELS: Record<ManufacturerAnalyticsMetricKey, string> = {
  collectionAdds: 'Collection saves',
  outboundClicks: 'Outbound clicks',
  publicPatchUses: 'Public patch mentions',
  publicRackUses: 'Public rack appearances',
  views: 'Profile views'
};

const MANUFACTURER_ANALYTICS_PRIVACY_COPY =
  'Only aggregate activity is shown. User-level ownership and private rack or patch detail stays hidden.';

interface ManufacturerStatsTarget {
  id: number;
  name?: string | null;
  [key: string]: unknown;
}

/**
 * Build a rank map for manufacturers based on module activity order
 */
export function buildManufacturerActivityRank(rows: ModuleActivityRow[]): Map<number, number> {
  const rankByManufacturerId = new Map<number, number>();
  let rank = 0;

  for (const row of rows) {
    if (typeof row?.manufacturerId !== 'number') {
      continue;
    }
    if (!rankByManufacturerId.has(row.manufacturerId)) {
      rankByManufacturerId.set(row.manufacturerId, rank);
      rank += 1;
    }
  }

  return rankByManufacturerId;
}

/**
 * Parse a PostgreSQL timestamp string into milliseconds
 */
export function parseModuleUpdatedTimestampMs(rawUpdated: unknown): number | null {
  if (typeof rawUpdated !== 'string' || rawUpdated.trim().length === 0) { return null; }
  let s = rawUpdated.trim();
  // Normalise Postgres variants so Date.parse can handle them:
  // 1. Space separator → T  (e.g. "2026-03-01 10:00:00" → "2026-03-01T10:00:00")
  s = s.replace(' ', 'T');
  // 2. Truncate microseconds to milliseconds  (.123456 → .123)
  s = s.replace(/(\.\d{3})\d+/, '$1');
  // 3. Short UTC offset without minutes: +00 / -05 → +00:00 / -05:00
  s = s.replace(/([+-]\d{2})$/, '$1:00');
  // 4. Four-digit offset without colon: +0000 → +00:00
  s = s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  s = normalizeSupabaseUtcTimestamp(s);
  const ms = Date.parse(s);
  return isNaN(ms) ? null : ms;
}

/**
 * Build manufacturer module statistics from activity rows
 */
export function buildManufacturerModuleStats(rows: ModuleActivityRow[]): Map<number, ManufacturerModuleStats> {
  const stats = new Map<number, ManufacturerModuleStats>();
  const thresholdMs = Date.now() - (30 * 24 * 60 * 60 * 1000);

  for (const row of rows) {
    if (typeof row?.manufacturerId !== 'number') {
      continue;
    }
    const current = stats.get(row.manufacturerId) ?? {...EMPTY_STATS};
    current.moduleCount += 1;

    const updatedMs = parseModuleUpdatedTimestampMs(row.updated);
    if (updatedMs !== null) {
      if (current.latestModuleUpdatedAtMs === null || updatedMs > current.latestModuleUpdatedAtMs) {
        current.latestModuleUpdatedAtMs = updatedMs;
        current.latestModuleUpdatedAt = row.updated;
      }
      if (updatedMs >= thresholdMs) {
        current.changedModulesLast30Days += 1;
      }
    }

    stats.set(row.manufacturerId, current);
  }

  return stats;
}

/**
 * Enrich manufacturer object with module statistics
 */
export function withManufacturerModuleStats<T extends ManufacturerStatsTarget>(
  manufacturer: T,
  stats: ManufacturerModuleStats | undefined
) {
  return {
    ...manufacturer,
    moduleCount: stats?.moduleCount ?? 0,
    latestModuleUpdatedAt: stats?.latestModuleUpdatedAt ?? null,
    changedModulesLast30Days: stats?.changedModulesLast30Days ?? 0
  };
}

/**
 * Comparator for sorting manufacturers by latest module activity
 */
export function compareManufacturersByLatestModuleActivity(
  aManufacturer: ManufacturerStatsTarget,
  bManufacturer: ManufacturerStatsTarget,
  activityRankByManufacturerId: Map<number, number>
): number {
  const aRank = activityRankByManufacturerId.get(aManufacturer.id);
  const bRank = activityRankByManufacturerId.get(bManufacturer.id);
  const aHasModules = typeof aRank === 'number';
  const bHasModules = typeof bRank === 'number';
  const aName = (aManufacturer?.name ?? '').toString();
  const bName = (bManufacturer?.name ?? '').toString();

  // Keep manufacturers with modules before empty ones in both directions.
  if (aHasModules !== bHasModules) {
    return aHasModules ? -1 : 1;
  }

  if (!aHasModules || !bHasModules) {
    return aName.localeCompare(bName);
  }

  if (aRank !== bRank) {
    return (aRank as number) - (bRank as number);
  }

  return aName.localeCompare(bName);
}

export function maskManufacturerAnalyticsMetric(
  key: ManufacturerAnalyticsMetricKey,
  value: number | null | undefined
): ManufacturerAnalyticsMaskedMetric {
  const threshold = MANUFACTURER_ANALYTICS_THRESHOLDS[key];
  const label = MANUFACTURER_ANALYTICS_LABELS[key];
  const normalizedValue = typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;

  if (normalizedValue < threshold) {
    return {
      copy: `Hidden until at least ${threshold} aggregate events are available.`,
      key,
      label,
      state: 'hidden'
    };
  }

  return {
    copy: 'Aggregate total only; no user-level detail is exposed.',
    key,
    label,
    state: 'visible',
    value: normalizedValue
  };
}

export function buildManufacturerAnalyticsSummary(
  metrics: Partial<Record<ManufacturerAnalyticsMetricKey, number | null | undefined>>
): ManufacturerAnalyticsSummary {
  const maskedMetrics = (Object.keys(MANUFACTURER_ANALYTICS_THRESHOLDS) as ManufacturerAnalyticsMetricKey[])
    .map(key => maskManufacturerAnalyticsMetric(key, metrics[key]));

  return {
    metrics: maskedMetrics,
    privacyCopy: MANUFACTURER_ANALYTICS_PRIVACY_COPY,
    visibleMetricCount: maskedMetrics.filter(metric => metric.state === 'visible').length
  };
}
