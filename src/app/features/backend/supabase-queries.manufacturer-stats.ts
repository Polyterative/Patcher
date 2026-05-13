/**
 * Manufacturer statistics utilities for SupabaseQueriesService
 */
import {
  ManufacturerModuleStats,
  ModuleActivityRow
} from './supabase-queries.types';

const EMPTY_STATS: ManufacturerModuleStats = {
  moduleCount: 0,
  latestModuleUpdatedAt: null,
  latestModuleUpdatedAtMs: null,
  changedModulesLast30Days: 0
};

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
export function withManufacturerModuleStats(manufacturer: any, stats: ManufacturerModuleStats | undefined) {
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
  aManufacturer: any,
  bManufacturer: any,
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
