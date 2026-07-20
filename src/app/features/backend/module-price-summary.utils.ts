import {
  ModulePriceHistorySnapshot,
  ModulePriceLatestSnapshot,
  ModuleRecentMarketPrice,
  ModuleSparsePriceHistorySummary
} from './supabase-queries.models';
import { normalizeEstimatedModulePriceToEurMinor } from './module-price-estimated-fx.utils';

const DAY_MS = 24 * 60 * 60 * 1000;
const SPARSE_HISTORY_WINDOW_DAYS = 60;
const SPARSE_HISTORY_FLAT_THRESHOLD_PERCENT = 2;

const AVAILABILITY_WEIGHTS: Readonly<Record<string, number>> = {
  in_stock: 1,
  preorder: 0.8,
  backorder: 0.8,
  out_of_stock: 0.55,
  unknown: 0.55,
  discontinued: 0.25
};

interface EligiblePricePoint {
  listing: ModuleRecentMarketPriceListing;
  observedAtMs: number;
  priceEurMinor: number;
  weight: number;
}

export interface ModuleRecentMarketPriceListing {
  moduleId: number;
  storeId: number;
  latestSnapshot: Pick<
    ModulePriceLatestSnapshot,
    'observedAt' | 'priceAmountMinor' | 'currency' | 'availability'
  > | null;
}

export function getModuleRecentMarketPrice(
  moduleId: number,
  listings: ReadonlyArray<ModuleRecentMarketPriceListing>,
  referenceDate: Date = new Date()
): ModuleRecentMarketPrice | null {
  const eligiblePoints = listings
    .map(listing => getEligiblePricePoint(listing, referenceDate))
    .filter((point): point is EligiblePricePoint => point !== null);

  if (eligiblePoints.length === 0) {
    return null;
  }

  const totalWeight = eligiblePoints.reduce((sum, point) => sum + point.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  const estimatedPriceEurMinor = Math.round(
    eligiblePoints.reduce(
      (sum, point) => sum + (point.priceEurMinor * point.weight),
      0
    ) / totalWeight
  );
  const storeCount = new Set(eligiblePoints.map(point => point.listing.storeId)).size;
  const latestObservedAt = new Date(
    Math.max(...eligiblePoints.map(point => point.observedAtMs))
  ).toISOString();
  const displayPrice = formatEstimatedEurPrice(estimatedPriceEurMinor);
  const tooltip = `Estimated recent market price: ${ displayPrice } from ${ storeCount } ${
    storeCount === 1 ? 'store' : 'stores'
  }, latest check ${ formatLatestCheckDate(latestObservedAt) }.`;

  return {
    moduleId,
    estimatedPriceEurMinor,
    displayPrice,
    storeCount,
    latestObservedAt,
    tooltip
  };
}

export function getModuleSparsePriceHistorySummary(
  moduleId: number,
  snapshots: ReadonlyArray<ModulePriceHistorySnapshot>,
  referenceDate: Date = new Date()
): ModuleSparsePriceHistorySummary | null {
  const cutoffMs = referenceDate.getTime() - (SPARSE_HISTORY_WINDOW_DAYS * DAY_MS);
  const eligiblePoints = snapshots
    .map(snapshot => getEligibleHistoryPoint(snapshot))
    .filter((point): point is EligibleHistoryPoint => point !== null)
    .filter(point => point.observedAtMs >= cutoffMs && point.observedAtMs <= referenceDate.getTime())
    .sort((first, second) => first.observedAtMs - second.observedAtMs || first.snapshot.id - second.snapshot.id);

  if (eligiblePoints.length < 2) {
    return null;
  }

  const earliest = eligiblePoints[0];
  const latest = eligiblePoints[eligiblePoints.length - 1];
  if (!earliest || !latest || earliest.priceEurMinor <= 0) {
    return null;
  }

  const prices = eligiblePoints.map(point => point.priceEurMinor);
  const minPriceEurMinor = Math.min(...prices);
  const maxPriceEurMinor = Math.max(...prices);
  const trendPercent = Math.round(((latest.priceEurMinor - earliest.priceEurMinor) / earliest.priceEurMinor) * 100);
  const trendDirection = getSparseHistoryTrendDirection(trendPercent);
  const rangeLabel = `${ formatEstimatedEurPrice(minPriceEurMinor) }–${ formatEstimatedEurPrice(maxPriceEurMinor).replace(/^~/, '') }`;
  const label = formatSparseHistoryLabel(trendDirection, trendPercent);
  const storeCount = new Set(eligiblePoints.map(point => point.snapshot.storeId)).size;
  const tooltip = [
    `${ SPARSE_HISTORY_WINDOW_DAYS }-day Price Hub history: ${ label.toLowerCase() }.`,
    `Observed range ${ rangeLabel } from ${ storeCount } ${ storeCount === 1 ? 'store' : 'stores' }.`,
    `Earliest ${ formatLatestCheckDate(earliest.snapshot.observedAt) }; latest ${ formatLatestCheckDate(latest.snapshot.observedAt) }.`,
    'Estimated EUR values; sparse store snapshots may not cover every day.'
  ].join(' ');

  return {
    moduleId,
    eligiblePointCount: eligiblePoints.length,
    storeCount,
    earliestObservedAt: earliest.snapshot.observedAt,
    latestObservedAt: latest.snapshot.observedAt,
    earliestPriceEurMinor: earliest.priceEurMinor,
    latestPriceEurMinor: latest.priceEurMinor,
    minPriceEurMinor,
    maxPriceEurMinor,
    trendPercent,
    trendDirection,
    label,
    rangeLabel,
    tooltip
  };
}

export function normalizeModulePriceToEurMinor(
  priceAmountMinor: number | null | undefined,
  currency: string | null | undefined
): number | null {
  const normalizedCurrency = currency?.trim().toUpperCase();
  if (
    priceAmountMinor === null ||
    priceAmountMinor === undefined ||
    !normalizedCurrency
  ) {
    return null;
  }

  return normalizeEstimatedModulePriceToEurMinor(priceAmountMinor, normalizedCurrency);
}

export function formatEstimatedEurPrice(priceEurMinor: number): string {
  return `~${ new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.round(priceEurMinor / 100)) }`;
}

function getEligiblePricePoint(
  listing: ModuleRecentMarketPriceListing,
  referenceDate: Date
): EligiblePricePoint | null {
  const snapshot = listing.latestSnapshot;
  if (!snapshot) {
    return null;
  }

  const observedAtMs = Date.parse(snapshot.observedAt);
  if (!Number.isFinite(observedAtMs) || !isWithinLastTwoMonths(observedAtMs, referenceDate)) {
    return null;
  }

  const priceEurMinor = normalizeModulePriceToEurMinor(
    snapshot.priceAmountMinor,
    snapshot.currency
  );
  if (priceEurMinor === null) {
    return null;
  }

  const weight = getRecencyWeight(observedAtMs, referenceDate)
    * getAvailabilityWeight(snapshot.availability);

  return {
    listing,
    observedAtMs,
    priceEurMinor,
    weight
  };
}

interface EligibleHistoryPoint {
  snapshot: ModulePriceHistorySnapshot;
  observedAtMs: number;
  priceEurMinor: number;
}

function getEligibleHistoryPoint(snapshot: ModulePriceHistorySnapshot): EligibleHistoryPoint | null {
  const observedAtMs = Date.parse(snapshot.observedAt);
  if (!Number.isFinite(observedAtMs)) {
    return null;
  }

  const priceEurMinor = normalizeModulePriceToEurMinor(
    snapshot.priceAmountMinor,
    snapshot.currency
  );
  if (priceEurMinor === null) {
    return null;
  }

  return {
    snapshot,
    observedAtMs,
    priceEurMinor
  };
}

function isWithinLastTwoMonths(observedAtMs: number, referenceDate: Date): boolean {
  const cutoff = new Date(referenceDate);
  cutoff.setMonth(cutoff.getMonth() - 2);
  return observedAtMs >= cutoff.getTime();
}

function getRecencyWeight(observedAtMs: number, referenceDate: Date): number {
  const ageDays = Math.max(0, (referenceDate.getTime() - observedAtMs) / DAY_MS);
  if (ageDays <= 14) {
    return 1;
  }
  if (ageDays <= 31) {
    return 0.85;
  }
  return 0.65;
}

function getAvailabilityWeight(availability: string | null | undefined): number {
  return AVAILABILITY_WEIGHTS[availability ?? 'unknown'] ?? AVAILABILITY_WEIGHTS.unknown;
}

function getSparseHistoryTrendDirection(trendPercent: number): ModuleSparsePriceHistorySummary['trendDirection'] {
  if (Math.abs(trendPercent) < SPARSE_HISTORY_FLAT_THRESHOLD_PERCENT) {
    return 'flat';
  }
  return trendPercent > 0 ? 'up' : 'down';
}

function formatSparseHistoryLabel(
  trendDirection: ModuleSparsePriceHistorySummary['trendDirection'],
  trendPercent: number
): string {
  if (trendDirection === 'flat') {
    return `Flat ${ SPARSE_HISTORY_WINDOW_DAYS }d`;
  }

  const arrow = trendDirection === 'up' ? '↑' : '↓';
  return `${ arrow }${ Math.abs(trendPercent) }% ${ SPARSE_HISTORY_WINDOW_DAYS }d`;
}

function formatLatestCheckDate(latestObservedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium'
  }).format(new Date(latestObservedAt));
}
