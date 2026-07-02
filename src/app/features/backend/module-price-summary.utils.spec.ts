import { ModulePriceListing } from './supabase-queries.models';
import {
  formatEstimatedEurPrice,
  getModuleRecentMarketPrice,
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

describe('module price summary utils', () => {
  const referenceDate = new Date('2026-07-02T00:00:00.000Z');

  it('normalizes supported currencies to estimated EUR minor units', () => {
    expect(normalizeModulePriceToEurMinor(10000, 'EUR')).toBe(10000);
    expect(normalizeModulePriceToEurMinor(10000, 'USD')).toBe(9200);
    expect(normalizeModulePriceToEurMinor(10000, 'GBP')).toBe(11700);
    expect(normalizeModulePriceToEurMinor(10000, 'CHF')).toBe(10700);
    expect(normalizeModulePriceToEurMinor(10000, 'JPY')).toBeNull();
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
    expect(summary?.tooltip).toContain('Recent market price:');
    expect(summary?.tooltip).toContain('from 2 stores');
    expect(summary?.tooltip).toContain('latest check');
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
        currency: 'JPY'
      }),
      buildListing({listingId: 3}, {
        observedAt: '2026-07-01T00:00:00.000Z',
        priceAmountMinor: null,
        currency: 'EUR'
      }),
    ], referenceDate)).toBeNull();
  });
});
