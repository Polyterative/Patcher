import {
  ModulePriceListing,
  ModulePriceLatestSnapshot,
  ModuleRecentMarketPrice
} from './supabase-queries.models';

const RECENT_MARKET_PRICE_CURRENCY_TO_EUR_RATE: Readonly<Record<string, number>> = {
  CHF: 1.07,
  EUR: 1,
  GBP: 1.17,
  USD: 0.92
};

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const tooltip = `Recent market price: ${ displayPrice } from ${ storeCount } ${ storeCount === 1 ? 'store' : 'stores' }, latest check ${ formatLatestCheckDate(latestObservedAt) }.`;

  return {
    moduleId,
    estimatedPriceEurMinor,
    displayPrice,
    storeCount,
    latestObservedAt,
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

  const eurRate = RECENT_MARKET_PRICE_CURRENCY_TO_EUR_RATE[normalizedCurrency];
  return eurRate === undefined ? null : Math.round(priceAmountMinor * eurRate);
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

function formatLatestCheckDate(latestObservedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium'
  }).format(new Date(latestObservedAt));
}
