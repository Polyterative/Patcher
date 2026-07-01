import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import {
  filterAndOrderModulePriceListings,
  getModulePriceAvailabilityGroup,
  ModulePriceListingsCardComponent
} from './module-price-listings-card.component';

interface ListingFixtureOptions {
  id: number;
  storeName: string;
  storeSlug?: string;
  priceAmountMinor?: number | null;
  availability?: string;
  countryCode?: string | null;
  currency?: string;
  latestSnapshot?: ModulePriceListing['latestSnapshot'];
}

function createListing(options: ListingFixtureOptions): ModulePriceListing {
  return {
    listingId: options.id,
    storeId: options.id,
    storeSlug: options.storeSlug ?? options.storeName.toLowerCase().replace(/\s+/g, '-'),
    storeName: options.storeName,
    countryCode: options.countryCode ?? null,
    currencyHint: null,
    productUrl: `https://example.com/${options.id}`,
    verificationStatus: 'verified',
    lastCheckedAt: null,
    latestSnapshot:
      options.latestSnapshot === undefined
        ? {
            id: options.id,
            observedAt: '2026-07-02T12:00:00Z',
            priceAmountMinor: options.priceAmountMinor ?? null,
            currency: options.currency ?? 'EUR',
            availability: options.availability ?? 'in_stock',
            source: 'spec'
          }
        : options.latestSnapshot
  };
}

describe('ModulePriceListingsCardComponent', () => {
  let comp: ModulePriceListingsCardComponent;

  beforeEach(() => {
    comp = new ModulePriceListingsCardComponent();
  });

  it('orders listings by lowest available-now known price by default', () => {
    comp.listings = [
      createListing({id: 1, storeName: 'Unknown price'}),
      createListing({id: 2, storeName: 'Expensive', priceAmountMinor: 45000}),
      createListing({id: 3, storeName: 'Cheap', priceAmountMinor: 32000}),
      createListing({
        id: 4,
        storeName: 'Unavailable cheaper',
        priceAmountMinor: 25000,
        availability: 'out_of_stock'
      })
    ];

    expect(comp.displayListings.map(listing => listing.storeName)).toEqual([
      'Cheap',
      'Expensive',
      'Unavailable cheaper',
      'Unknown price'
    ]);
  });

  it('keeps the card available when the selected filter has no matches', () => {
    comp.listings = [createListing({id: 1, storeName: 'In stock'})];
    comp.setAvailabilityFilter('unavailable');

    expect(comp.hasListings).toBeTrue();
    expect(comp.displayListings).toEqual([]);
  });

  it('ignores unknown control values', () => {
    comp.setAvailabilityFilter('unknown-filter');
    comp.setListingOrder('unknown-order');

    expect(comp.availabilityFilter).toBe('all');
    expect(comp.listingOrder).toBe('price_asc');
  });

  it('shows specific shipping origin names instead of raw country codes', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Signal Sounds EU',
      countryCode: 'PL'
    });
    expect(comp.getShippingOriginLabel(listing)).toBe('Poland');
  });

  it('labels United Kingdom shipping origin explicitly', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Elevator Sound',
      countryCode: 'GB'
    });
    expect(comp.getShippingOriginLabel(listing)).toBe('United Kingdom');
  });

  it('flags generic regional codes for origin review', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Legacy EU store',
      countryCode: 'EU'
    });

    expect(comp.getShippingOriginLabel(listing)).toBe('Shipping origin needs review');
  });

  it('labels in-stock listings as available now', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Available',
      availability: 'in_stock'
    });

    expect(comp.getAvailabilityLabel(listing)).toBe('Available now');
    expect(comp.isAvailableNow(listing)).toBeTrue();
  });

  it('returns muted hero colors for known store slugs', () => {
    expect(
      comp.getStoreHeroColor(createListing({
        id: 1,
        storeName: 'Signal Sounds UK',
        storeSlug: 'signal-sounds-uk'
      }))
    ).toBe('#676976');
  });

  it('builds price comparison rails from EUR-normalized prices', () => {
    comp.listings = [
      createListing({id: 1, storeName: 'GBP price', priceAmountMinor: 10000, currency: 'GBP'}),
      createListing({id: 2, storeName: 'EUR price', priceAmountMinor: 11500, currency: 'EUR'}),
      createListing({id: 3, storeName: 'Unknown'})
    ];

    expect(comp.priceComparisonPoints.map(point => point.listing.storeName)).toEqual([
      'EUR price',
      'GBP price'
    ]);
    expect(comp.priceComparisonPoints.map(point => point.relation)).toEqual([
      'best',
      'above'
    ]);
    expect(comp.priceComparisonPoints[0].normalizedPriceEurMinor).toBe(11500);
    expect(comp.priceComparisonPoints[1].normalizedPriceEurMinor).toBe(11700);
    expect(comp.priceComparisonPoints[0].widthPercent).toBeLessThan(
      comp.priceComparisonPoints[1].widthPercent
    );
    expect(comp.getPriceComparisonPoint(comp.displayListings[0])?.relation).toBe('best');
  });

  it('labels unavailable cheaper prices as wait-for-availability savings', () => {
    const bestNow = createListing({
      id: 1,
      storeName: 'Best now',
      priceAmountMinor: 40000
    });
    const unavailable = createListing({
      id: 2,
      storeName: 'Unavailable low',
      priceAmountMinor: 25000,
      availability: 'out_of_stock'
    });
    comp.listings = [bestNow, unavailable];

    expect(comp.getPriceInsightLabel(bestNow)).toBe('');
    expect(comp.isBestAvailableNowListing(bestNow)).toBeTrue();
    expect(comp.getPriceInsightLabel(unavailable)).toBe('Could be 38% less if available');
  });

  it('labels available higher prices against the best available price', () => {
    const bestNow = createListing({
      id: 1,
      storeName: 'Best now',
      priceAmountMinor: 20000
    });
    const premium = createListing({
      id: 2,
      storeName: 'Premium',
      priceAmountMinor: 25000
    });
    comp.listings = [bestNow, premium];

    expect(comp.getPriceInsightLabel(premium)).toBe('+25% vs best');
  });

  it('calculates savings against normalized EUR prices while preserving original currencies', () => {
    const bestNow = createListing({
      id: 1,
      storeName: 'Best now',
      priceAmountMinor: 10000,
      currency: 'EUR'
    });
    const premium = createListing({
      id: 2,
      storeName: 'GBP premium',
      priceAmountMinor: 10000,
      currency: 'GBP'
    });
    comp.listings = [premium, bestNow];

    expect(comp.displayListings.map(listing => listing.storeName)).toEqual([
      'Best now',
      'GBP premium'
    ]);
    expect(comp.formatPrice(premium)).toContain('100');
    expect(comp.getPriceInsightLabel(premium)).toBe('+17% vs best');
  });
});

describe('module price listing helpers', () => {
  it('maps availability values into filter groups', () => {
    expect(
      getModulePriceAvailabilityGroup(
        createListing({id: 1, storeName: 'Stock', availability: 'in_stock'})
      )
    ).toBe('in_stock');
    expect(
      getModulePriceAvailabilityGroup(
        createListing({id: 2, storeName: 'Preorder', availability: 'preorder'})
      )
    ).toBe('available_soon');
    expect(
      getModulePriceAvailabilityGroup(
        createListing({id: 3, storeName: 'Backorder', availability: 'backorder'})
      )
    ).toBe('available_soon');
    expect(
      getModulePriceAvailabilityGroup(
        createListing({
          id: 4,
          storeName: 'Discontinued',
          availability: 'discontinued'
        })
      )
    ).toBe('unavailable');
    expect(
      getModulePriceAvailabilityGroup(
        createListing({id: 5, storeName: 'Missing snapshot', latestSnapshot: null})
      )
    ).toBe('unknown');
  });

  it('orders by highest known price without putting unknown prices first', () => {
    const orderedListings = filterAndOrderModulePriceListings(
      [
        createListing({id: 1, storeName: 'Unknown'}),
        createListing({id: 2, storeName: 'Low', priceAmountMinor: 10000}),
        createListing({id: 3, storeName: 'High', priceAmountMinor: 25000}),
        createListing({
          id: 4,
          storeName: 'Unavailable highest',
          priceAmountMinor: 30000,
          availability: 'out_of_stock'
        })
      ],
      'all',
      'price_desc'
    );

    expect(orderedListings.map(listing => listing.storeName)).toEqual([
      'High',
      'Low',
      'Unavailable highest',
      'Unknown'
    ]);
  });

  it('filters available soon listings across preorder and backorder', () => {
    const filteredListings = filterAndOrderModulePriceListings(
      [
        createListing({id: 1, storeName: 'Stock', availability: 'in_stock'}),
        createListing({id: 2, storeName: 'Preorder', availability: 'preorder'}),
        createListing({id: 3, storeName: 'Backorder', availability: 'backorder'})
      ],
      'available_soon',
      'store_name'
    );

    expect(filteredListings.map(listing => listing.storeName)).toEqual([
      'Backorder',
      'Preorder'
    ]);
  });

  it('orders by availability before price', () => {
    const orderedListings = filterAndOrderModulePriceListings(
      [
        createListing({
          id: 1,
          storeName: 'Unavailable',
          priceAmountMinor: 100,
          availability: 'out_of_stock'
        }),
        createListing({
          id: 2,
          storeName: 'In stock',
          priceAmountMinor: 300,
          availability: 'in_stock'
        }),
        createListing({
          id: 3,
          storeName: 'Soon',
          priceAmountMinor: 200,
          availability: 'preorder'
        })
      ],
      'all',
      'availability'
    );

    expect(orderedListings.map(listing => listing.storeName)).toEqual([
      'In stock',
      'Soon',
      'Unavailable'
    ]);
  });
});
