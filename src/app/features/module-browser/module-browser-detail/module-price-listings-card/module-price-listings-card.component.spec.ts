import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import {
  detectPreferredModulePriceContinent,
  filterAndOrderModulePriceListings,
  getContinentForRegionCode,
  getModulePriceAvailabilityGroup,
  ModulePriceAvailabilityFilter,
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
    moduleId: 42,
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

function expectedFlag(countryCode: string): string {
  return [...countryCode]
    .map(letter => String.fromCodePoint(0x1F1E6 + letter.charCodeAt(0) - 65))
    .join('');
}

describe('ModulePriceListingsCardComponent', () => {
  let comp: ModulePriceListingsCardComponent;

  beforeEach(() => {
    comp = new ModulePriceListingsCardComponent();
    comp.preferredContinent = 'europe';
    comp.regionFilter = comp.preferredContinent;
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
    comp.setRegionFilter('unknown-region');

    expect(comp.availabilityFilter).toBe('all');
    expect(comp.listingOrder).toBe('price_asc');
    expect(comp.regionFilter).toBe('europe');
  });

  it('summarizes the selected price filters with compact copy', () => {
    comp.listings = [
      createListing({id: 1, storeName: 'EU stock', countryCode: 'DE'}),
      createListing({
        id: 2,
        storeName: 'EU preorder',
        availability: 'preorder',
        countryCode: 'NL'
      }),
      createListing({
        id: 3,
        storeName: 'EU unavailable',
        availability: 'out_of_stock',
        countryCode: 'FR'
      })
    ];
    const expectedLabels: ReadonlyArray<[
      ModulePriceAvailabilityFilter,
      string
    ]> = [
      ['all', 'All stores, best price first, Europe'],
      ['in_stock', 'Available now, best price first, Europe'],
      ['available_soon', 'Available soon, best price first, Europe'],
      ['unavailable', 'Unavailable, best price first, Europe']
    ];

    expectedLabels.forEach(([filter, label]) => {
      comp.setAvailabilityFilter(filter);
      comp.setListingOrder('price_asc');

      expect(comp.resultSummaryLabel).toBe(label);
    });

    comp.setAvailabilityFilter('all');
    comp.setListingOrder('price_desc');
    expect(comp.resultSummaryLabel).toBe('All stores, highest price first, Europe');

    comp.setListingOrder('availability');
    expect(comp.resultSummaryLabel).toBe('All stores, availability first, Europe');

    comp.setListingOrder('store_name');
    expect(comp.resultSummaryLabel).toBe('All stores, A-Z by store, Europe');
  });

  it('summarizes a selected region filter with compact copy', () => {
    comp.setRegionFilter('north_america');

    expect(comp.resultSummaryLabel).toBe('All stores, best price first, North America');
  });

  it('shows specific shipping origin names instead of raw country codes', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Signal Sounds EU',
      countryCode: 'PL'
    });
    expect(comp.getShippingOriginLabel(listing)).toBe('Poland');
    expect(comp.getShippingOriginFlag(listing)).toBe(expectedFlag('PL'));
  });

  it('labels United Kingdom shipping origin explicitly', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Elevator Sound',
      countryCode: 'GB'
    });
    expect(comp.getShippingOriginLabel(listing)).toBe('United Kingdom');
    expect(comp.getShippingOriginFlag(listing)).toBe(expectedFlag('GB'));
  });

  it('does not present generic regional codes as shipping origins', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Legacy EU store',
      countryCode: 'EU'
    });

    expect(comp.getShippingOriginLabel(listing)).toBe('');
    expect(comp.getShippingOriginFlag(listing)).toBe('');
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
    expect(comp.getPriceInsightLabel(unavailable)).toBe('Save 38% if available');
  });

  it('keeps price comparison on unavailable higher prices without repeating unavailable state', () => {
    const bestNow = createListing({
      id: 1,
      storeName: 'Best now',
      priceAmountMinor: 20000
    });
    const unavailable = createListing({
      id: 2,
      storeName: 'Unavailable high',
      priceAmountMinor: 25000,
      availability: 'out_of_stock'
    });
    comp.listings = [bestNow, unavailable];

    expect(comp.getAvailabilityLabel(unavailable)).toBe('Out of stock');
    expect(comp.getPriceInsightLabel(unavailable)).toBe('+25% vs best');
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

  it('puts preferred-continent listings first without changing price order inside groups', () => {
    comp.listings = [
      createListing({
        id: 1,
        storeName: 'US cheap',
        priceAmountMinor: 10000,
        countryCode: 'US'
      }),
      createListing({
        id: 2,
        storeName: 'EU premium',
        priceAmountMinor: 20000,
        countryCode: 'DE'
      }),
      createListing({
        id: 3,
        storeName: 'EU cheap',
        priceAmountMinor: 15000,
        countryCode: 'NL'
      })
    ];
    comp.setRegionFilter('all');

    expect(comp.displayListings.map(listing => listing.storeName)).toEqual([
      'EU cheap',
      'EU premium',
      'US cheap'
    ]);
    expect(comp.displayListingGroups.map(group => group.label)).toEqual([
      'Europe',
      'North America'
    ]);
  });

  it('selects the preferred continent by default when that region has listings', () => {
    comp.listings = [
      createListing({id: 1, storeName: 'EU store', countryCode: 'DE'}),
      createListing({id: 2, storeName: 'US store', countryCode: 'US'})
    ];

    expect(comp.regionFilter).toBe('europe');
    expect(comp.regionFilterOptions[0]).toEqual({value: 'europe', label: 'Europe'});
    expect(comp.displayListings.map(listing => listing.storeName)).toEqual(['EU store']);
  });

  it('keeps UK listings separate from Europe for import-sensitive shipping', () => {
    comp.listings = [
      createListing({id: 1, storeName: 'EU store', countryCode: 'DE'}),
      createListing({id: 2, storeName: 'UK store', countryCode: 'GB'}),
      createListing({id: 3, storeName: 'Legacy UK store', countryCode: 'UK'})
    ];

    expect(comp.displayListings.map(listing => listing.storeName)).toEqual(['EU store']);

    comp.setRegionFilter('all');
    expect(comp.displayListingGroups.map(group => group.label)).toEqual([
      'Europe',
      'UK'
    ]);

    comp.setRegionFilter('united_kingdom');
    expect(comp.displayListings.map(listing => listing.storeName)).toEqual([
      'Legacy UK store',
      'UK store'
    ]);
  });

  it('filters listings to a selected continent', () => {
    comp.listings = [
      createListing({id: 1, storeName: 'EU store', countryCode: 'DE'}),
      createListing({id: 2, storeName: 'US store', countryCode: 'US'})
    ];

    comp.setRegionFilter('north_america');

    expect(comp.displayListings.map(listing => listing.storeName)).toEqual(['US store']);
    expect(comp.displayListingGroups.map(group => group.label)).toEqual(['North America']);
  });

  it('clears a selected region when availability removes that region from visible options', () => {
    comp.listings = [
      createListing({id: 1, storeName: 'EU stock', countryCode: 'DE'}),
      createListing({
        id: 2,
        storeName: 'US unavailable',
        availability: 'out_of_stock',
        countryCode: 'US'
      })
    ];

    comp.setRegionFilter('north_america');
    comp.setAvailabilityFilter('in_stock');

    expect(comp.regionFilter).toBe('all');
    expect(comp.displayListings.map(listing => listing.storeName)).toEqual(['EU stock']);
  });

  it('builds visible region filter options with the preferred continent first', () => {
    comp.listings = [
      createListing({id: 1, storeName: 'US store', countryCode: 'US'}),
      createListing({id: 2, storeName: 'EU store', countryCode: 'DE'}),
      createListing({id: 3, storeName: 'Unknown region'})
    ];

    expect(comp.regionFilterOptions).toEqual([
      {value: 'europe', label: 'Europe'},
      {value: 'all', label: 'All'},
      {value: 'north_america', label: 'North America'},
      {value: 'unknown', label: 'Unknown region'}
    ]);
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

  it('detects a preferred continent from timezone before locale', () => {
    expect(
      detectPreferredModulePriceContinent({
        languages: ['en-US', 'en'],
        timeZone: 'Europe/Amsterdam'
      })
    ).toBe('europe');
    expect(
      detectPreferredModulePriceContinent({
        languages: ['en-US', 'en'],
        timeZone: 'America/Sao_Paulo'
      })
    ).toBe('south_america');
    expect(
      detectPreferredModulePriceContinent({
        languages: ['de-DE'],
        timeZone: 'Europe/London'
      })
    ).toBe('united_kingdom');
  });

  it('falls back to language region subtags when timezone is unavailable', () => {
    expect(
      detectPreferredModulePriceContinent({
        languages: ['en-US', 'en']
      })
    ).toBe('north_america');
    expect(
      detectPreferredModulePriceContinent({
        languages: ['de-DE']
      })
    ).toBe('europe');
    expect(
      detectPreferredModulePriceContinent({
        languages: ['en-GB']
      })
    ).toBe('united_kingdom');
    expect(
      detectPreferredModulePriceContinent({
        languages: ['zh-Hant-TW']
      })
    ).toBe('asia');
  });

  it('falls back to Europe when browser signals are absent', () => {
    expect(detectPreferredModulePriceContinent({})).toBe('europe');
  });

  it('maps generic EU and country regions to continents for grouping', () => {
    expect(getContinentForRegionCode('EU')).toBe('europe');
    expect(getContinentForRegionCode('GB')).toBe('united_kingdom');
    expect(getContinentForRegionCode('UK')).toBe('united_kingdom');
    expect(getContinentForRegionCode('US')).toBe('north_america');
    expect(getContinentForRegionCode(null)).toBe('unknown');
  });
});
