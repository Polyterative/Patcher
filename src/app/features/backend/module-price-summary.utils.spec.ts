import { ModulePriceListing } from './supabase-queries.models';
import {
  formatEstimatedEurPrice,
  getModuleRecentMarketPrice,
  getModuleSparsePriceHistorySummary,
  normalizeModulePriceToEurMinor
} from './module-price-summary.utils';

function buildListing(
  overrides: Partial<ModulePriceListing> = {},
  snapshotOverrides: Partial<NonNullable<ModulePriceListing['latestSnapshot']>> = {}
): ModulePriceListing {
  return {
    listingId: overrides.listingId ?? 1,
    moduleId: overrides.moduleId ?? 42,
    storeId: overrides.storeId ?? 1,
    storeSlug: overrides.storeSlug ?? 'store',
    storeName: overrides.storeName ?? 'Store',
    countryCode: overrides.countryCode ?? 'DE',
    currencyHint: overrides.currencyHint ?? 'EUR',
    productUrl: overrides.productUrl ?? 'https://example.com/module',
    verificationStatus: overrides.verificationStatus ?? 'verified',
    lastCheckedAt: overrides.lastCheckedAt ?? null,
    latestSnapshot: overrides.latestSnapshot === null ? null : {
      id: snapshotOverrides.id ?? 1,
      observedAt: snapshotOverrides.observedAt ?? '2026-07-01T00:00:00.000Z',
      priceAmountMinor: 'priceAmountMinor' in snapshotOverrides ? snapshotOverrides.priceAmountMinor! : 40000,
      currency: snapshotOverrides.currency ?? 'EUR',
      availability: snapshotOverrides.availability ?? 'in_stock',
      source: snapshotOverrides.source ?? 'crawler'
    }
  };
}

function buildHistorySnapshot(overrides: {
  id?: number;
  listingId?: number;
  storeId?: number;
  observedAt?: string;
  priceAmountMinor?: number | null;
  currency?: string | null;
  availability?: string;
  source?: string;
} = {}) {
  return {
    id: overrides.id ?? 1,
    listingId: overrides.listingId ?? 1,
    storeId: overrides.storeId ?? 1,
    observedAt: overrides.observedAt ?? '2026-07-01T00:00:00.000Z',
    priceAmountMinor: overrides.priceAmountMinor ?? 40000,
    currency: overrides.currency ?? 'EUR',
    availability: overrides.availability ?? 'in_stock',
    source: overrides.source ?? 'crawler'
  };
}

describe('module price summary utils', () => {
  const referenceDate = new Date('2026-07-02T00:00:00.000Z');

  it('normalizes supported currencies to estimated EUR minor units', () => {
    expect(normalizeModulePriceToEurMinor(10000, 'EUR')).toBe(10000);
    expect(normalizeModulePriceToEurMinor(10000, 'USD')).toBe(9200);
    expect(normalizeModulePriceToEurMinor(10000, 'GBP')).toBe(11700);
    expect(normalizeModulePriceToEurMinor(10000, 'CHF')).toBe(10700);
    expect(normalizeModulePriceToEurMinor(10000, 'AUD')).toBe(6100);
    expect(normalizeModulePriceToEurMinor(10000, 'CAD')).toBe(6800);
    expect(normalizeModulePriceToEurMinor(40000, 'JPY')).toBe(24800);
    expect(normalizeModulePriceToEurMinor(10000, 'NOK')).toBe(850);
    expect(normalizeModulePriceToEurMinor(10000, 'XYZ')).toBeNull();
  });

  it('builds a weighted recent market price from recent supported snapshots', () => {
    const summary = getModuleRecentMarketPrice(42, [
      buildListing({listingId: 1, storeId: 1}, {
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: 40000,
        currency: 'EUR',
        availability: 'in_stock'
      }),
      buildListing({listingId: 2, storeId: 2}, {
        observedAt: '2026-06-10T00:00:00.000Z',
        priceAmountMinor: 50000,
        currency: 'USD',
        availability: 'backorder'
      }),
    ], referenceDate);

    expect(summary).toEqual(jasmine.objectContaining({
      moduleId: 42,
      estimatedPriceEurMinor: 42429,
      displayPrice: formatEstimatedEurPrice(42429),
      storeCount: 2,
      latestObservedAt: '2026-07-01T00:00:00.000Z'
    }));
    expect(summary?.tooltip).toContain('Estimated recent market price:');
    expect(summary?.tooltip).toContain('from 2 stores');
    expect(summary?.tooltip).toContain('latest check');
  });

  it('includes seeded non-EUR store currencies in the market rollup', () => {
    const summary = getModuleRecentMarketPrice(42, [
      buildListing({listingId: 1, storeId: 1}, {
        priceAmountMinor: 10000,
        currency: 'EUR'
      }),
      buildListing({listingId: 2, storeId: 2}, {
        priceAmountMinor: 10000,
        currency: 'AUD'
      }),
      buildListing({listingId: 3, storeId: 3}, {
        priceAmountMinor: 10000,
        currency: 'CAD'
      }),
      buildListing({listingId: 4, storeId: 4}, {
        priceAmountMinor: 40000,
        currency: 'JPY'
      }),
      buildListing({listingId: 5, storeId: 5}, {
        priceAmountMinor: 10000,
        currency: 'NOK'
      })
    ], referenceDate);

    expect(summary).toEqual(jasmine.objectContaining({
      estimatedPriceEurMinor: 9710,
      storeCount: 5
    }));
  });

  it('returns null when no recent supported price was observed', () => {
    expect(getModuleRecentMarketPrice(42, [
      buildListing({listingId: 1}, {
        observedAt: '2026-04-01T00:00:00.000Z',
        priceAmountMinor: 40000,
        currency: 'EUR'
      }),
      buildListing({listingId: 2}, {
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: 40000,
        currency: 'XYZ'
      }),
      buildListing({listingId: 3}, {
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: null,
        currency: 'EUR'
      }),
    ], referenceDate)).toBeNull();
  });

  it('builds a sparse 60-day history trend from eligible normalized snapshots', () => {
    const summary = getModuleSparsePriceHistorySummary(42, [
      buildHistorySnapshot({
        id: 1,
        storeId: 1,
        observedAt: '2026-05-15T00:00:00.000Z',
        priceAmountMinor: 40000,
        currency: 'EUR'
      }),
      buildHistorySnapshot({
        id: 2,
        storeId: 2,
        observedAt: '2026-06-15T00:00:00.000Z',
        priceAmountMinor: 50000,
        currency: 'USD'
      }),
      buildHistorySnapshot({
        id: 3,
        storeId: 1,
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: 38000,
        currency: 'EUR'
      }),
    ], referenceDate);

    expect(summary).toEqual(jasmine.objectContaining({
      moduleId: 42,
      eligiblePointCount: 3,
      storeCount: 2,
      earliestPriceEurMinor: 40000,
      latestPriceEurMinor: 38000,
      minPriceEurMinor: 38000,
      maxPriceEurMinor: 46000,
      trendPercent: -5,
      trendDirection: 'down',
      label: '↓5% 60d',
      rangeLabel: '~€380–€460'
    }));
    expect(summary?.tooltip).toContain('60-day Price Hub history');
    expect(summary?.tooltip).toContain('Estimated EUR values');
  });

  it('returns a flat sparse history label for tiny movement', () => {
    const summary = getModuleSparsePriceHistorySummary(42, [
      buildHistorySnapshot({
        id: 1,
        observedAt: '2026-06-01T00:00:00.000Z',
        priceAmountMinor: 40000
      }),
      buildHistorySnapshot({
        id: 2,
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: 40400
      }),
    ], referenceDate);

    expect(summary?.trendDirection).toBe('flat');
    expect(summary?.label).toBe('Flat 60d');
  });

  it('returns null for sparse history when fewer than two eligible points exist', () => {
    expect(getModuleSparsePriceHistorySummary(42, [
      buildHistorySnapshot({observedAt: '2026-04-01T00:00:00.000Z'}),
      buildHistorySnapshot({observedAt: '2026-07-01T00:00:00.000Z', currency: 'XYZ'}),
      buildHistorySnapshot({observedAt: '2026-07-01T00:00:00.000Z', priceAmountMinor: null}),
    ], referenceDate)).toBeNull();
  });

  it('treats an in-window collapsed segment pair as a flat axis extension without skewing the trend', () => {
    // Post-compaction a stable run is stored as exactly two rows (start +
    // floating endpoint) with identical values; the pair must widen the time
    // axis but never fabricate movement.
    const summary = getModuleSparsePriceHistorySummary(42, [
      buildHistorySnapshot({
        id: 1,
        observedAt: '2026-06-01T00:00:00.000Z',
        priceAmountMinor: 40000
      }),
      buildHistorySnapshot({
        id: 2,
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: 40000
      }),
    ], referenceDate);

    expect(summary).toEqual(jasmine.objectContaining({
      eligiblePointCount: 2,
      earliestObservedAt: '2026-06-01T00:00:00.000Z',
      latestObservedAt: '2026-07-01T00:00:00.000Z',
      minPriceEurMinor: 40000,
      maxPriceEurMinor: 40000,
      trendPercent: 0,
      trendDirection: 'flat',
      label: 'Flat 60d'
    }));
  });

  it('returns null for a single-listing module whose segment start aged past the window', () => {
    // Accepted compaction consequence: long-stable single-listing module keeps
    // only the fresh endpoint in-window (start row > 60 d old) -> no summary
    // until the price next changes.
    expect(getModuleSparsePriceHistorySummary(42, [
      buildHistorySnapshot({
        id: 1,
        observedAt: '2026-04-20T00:00:00.000Z',
        priceAmountMinor: 40000
      }),
      buildHistorySnapshot({
        id: 2,
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: 40000
      }),
    ], referenceDate)).toBeNull();
  });

  it('builds the summary from endpoints only when multi-listing segment starts aged out', () => {
    const summary = getModuleSparsePriceHistorySummary(42, [
      buildHistorySnapshot({
        id: 1,
        listingId: 1,
        storeId: 1,
        observedAt: '2026-04-20T00:00:00.000Z',
        priceAmountMinor: 40000,
        currency: 'EUR'
      }),
      buildHistorySnapshot({
        id: 2,
        listingId: 1,
        storeId: 1,
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: 40000,
        currency: 'EUR'
      }),
      buildHistorySnapshot({
        id: 3,
        listingId: 2,
        storeId: 2,
        observedAt: '2026-04-25T00:00:00.000Z',
        priceAmountMinor: 50000,
        currency: 'USD'
      }),
      buildHistorySnapshot({
        id: 4,
        listingId: 2,
        storeId: 2,
        observedAt: '2026-06-28T00:00:00.000Z',
        priceAmountMinor: 50000,
        currency: 'USD'
      }),
    ], referenceDate);

    expect(summary).toEqual(jasmine.objectContaining({
      eligiblePointCount: 2,
      storeCount: 2,
      earliestObservedAt: '2026-06-28T00:00:00.000Z',
      latestObservedAt: '2026-07-01T00:00:00.000Z',
      earliestPriceEurMinor: 46000,
      latestPriceEurMinor: 40000,
      trendPercent: -13,
      trendDirection: 'down'
    }));
  });
});
