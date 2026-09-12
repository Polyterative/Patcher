import {
  getModuleSparsePriceHistorySummary,
  formatEstimatedEurPrice
} from './module-price-summary.utils';
import type {
  ModulePriceHistorySnapshot,
  ModuleSparsePriceHistorySummary
} from './supabase-queries.models';

export const PRICE_DROP_WINDOW_DAYS = 60;
export const PRICE_DROP_MIN_PERCENT = 5;
export const PRICE_DROP_MAX_PERCENT = 60;
export const PRICE_DROP_MIN_PRICE_EUR_MINOR = 2000;
export const PRICE_DROP_MIN_SPAN_DAYS = 7;
export const PRICE_DROP_MAX_RANGE_RATIO = 3;

export interface PriceDropHistorySnapshot extends ModulePriceHistorySnapshot {
  moduleId: number;
}

export interface ReliablePriceDrop {
  summary: ModuleSparsePriceHistorySummary;
}

export function groupPriceDropSnapshotsByModule(
  snapshots: ReadonlyArray<PriceDropHistorySnapshot>
): Map<number, ModulePriceHistorySnapshot[]> {
  const grouped = new Map<number, ModulePriceHistorySnapshot[]>();
  for (const snapshot of snapshots) {
    if (!Number.isFinite(snapshot.moduleId) || snapshot.moduleId <= 0) {
      continue;
    }
    const list = grouped.get(snapshot.moduleId) ?? [];
    list.push(snapshot);
    grouped.set(snapshot.moduleId, list);
  }
  return grouped;
}

export function buildPriceDropSummaries(
  grouped: ReadonlyMap<number, ReadonlyArray<ModulePriceHistorySnapshot>>,
  referenceDate: Date = new Date()
): ModuleSparsePriceHistorySummary[] {
  const summaries: ModuleSparsePriceHistorySummary[] = [];
  for (const [moduleId, snapshots] of grouped) {
    const summary = getModuleSparsePriceHistorySummary(moduleId, snapshots, referenceDate);
    if (summary) {
      summaries.push(summary);
    }
  }
  return summaries;
}

export function isReliablePriceDropSummary(
  summary: ModuleSparsePriceHistorySummary
): boolean {
  if (summary.trendDirection !== 'down') {
    return false;
  }
  const dropPercent = Math.abs(summary.trendPercent);
  if (dropPercent < PRICE_DROP_MIN_PERCENT || dropPercent > PRICE_DROP_MAX_PERCENT) {
    return false;
  }
  if (
    summary.earliestPriceEurMinor < PRICE_DROP_MIN_PRICE_EUR_MINOR ||
    summary.latestPriceEurMinor < PRICE_DROP_MIN_PRICE_EUR_MINOR ||
    summary.minPriceEurMinor <= 0
  ) {
    return false;
  }
  const hasEnoughEvidence =
    summary.eligiblePointCount >= 3 ||
    (summary.eligiblePointCount >= 2 && summary.storeCount >= 2);
  if (!hasEnoughEvidence) {
    return false;
  }
  const earliestMs = Date.parse(summary.earliestObservedAt);
  const latestMs = Date.parse(summary.latestObservedAt);
  if (!Number.isFinite(earliestMs) || !Number.isFinite(latestMs)) {
    return false;
  }
  if (latestMs - earliestMs < PRICE_DROP_MIN_SPAN_DAYS * 24 * 60 * 60 * 1000) {
    return false;
  }
  if (summary.maxPriceEurMinor > summary.minPriceEurMinor * PRICE_DROP_MAX_RANGE_RATIO) {
    return false;
  }
  return true;
}

export function getReliablePriceDrops(
  summaries: ReadonlyArray<ModuleSparsePriceHistorySummary>
): ReliablePriceDrop[] {
  return summaries
    .filter(isReliablePriceDropSummary)
    .map((summary) => ({summary}))
    .sort((first, second) => first.summary.trendPercent - second.summary.trendPercent);
}

export function formatPriceDropPercent(trendPercent: number): string {
  return `↓${ Math.abs(Math.round(trendPercent)) }%`;
}

export function formatPriceDropRange(summary: ModuleSparsePriceHistorySummary): string {
  return `${ formatEstimatedEurPrice(summary.earliestPriceEurMinor) } → ${ formatEstimatedEurPrice(summary.latestPriceEurMinor).replace(/^~/, '~') }`;
}
