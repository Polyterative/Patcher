import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TimeagoModule } from 'ngx-timeago';
import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import { SupabaseUtcTimestampPipe } from 'src/app/shared-interproject/pipes/supabase-utc-timestamp.pipe';
import {
  detectPreferredModulePriceContinent,
  filterAndOrderModulePriceListings,
  getContinentForRegionCode,
  getModulePriceAvailabilityGroup,
  ModulePriceAvailabilityFilter,
  ModulePriceListingsCardComponent
} from './module-price-listings-card.component';
import {
  getListingPriceAmount,
  getStoreHeroColor,
  isModulePriceListingStale,
  MODULE_PRICE_STALE_THRESHOLD_DAYS
} from './module-price-listings-card.utils';

interface ListingFixtureOptions {
  id: number;
  storeName: string;
  storeSlug?: string;
  priceAmountMinor?: number | null;
  availability?: string;
  countryCode?: string | null;
  currency?: string;
  lastCheckedAt?: string | null;
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
    lastCheckedAt: options.lastCheckedAt ?? '2999-01-01T00:00:00Z',
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

  it('labels stale listings with last-seen copy instead of a current price', () => {
    const staleListing = createListing({
      id: 1,
      storeName: 'Old store',
      priceAmountMinor: 20000,
      lastCheckedAt: '2000-01-01T00:00:00Z'
    });

    expect(comp.isStaleListing(staleListing)).toBeTrue();
    expect(comp.formatPrice(staleListing)).toBe('Last seen');
    expect(comp.getAvailabilityLabel(staleListing)).toBe('Stale data');
    expect(comp.getAvailabilityClass(staleListing)).toBe(
      'module-price-listing__availability--stale'
    );
    expect(comp.isAvailableNow(staleListing)).toBeFalse();
    expect(comp.getFreshnessIso(staleListing)).toBe('2000-01-01T00:00:00Z');
  });

  it('splits uncommon currency symbols into their own display part', () => {
    const listing = createListing({
      id: 1,
      storeName: 'UAH price',
      priceAmountMinor: 123456,
      currency: 'UAH'
    });
    const priceParts = comp.formatPriceParts(listing);

    expect(priceParts.map(part => part.value).join('')).toBe(comp.formatPrice(listing));
    expect(priceParts).toContain(jasmine.objectContaining({
      kind: 'currency',
      value: '₴'
    }));
    expect(priceParts.some(part => part.kind === 'amount' && part.value.includes('1,234.56')))
      .toBeTrue();
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

  it('derives deterministic muted hero colors for unlisted store slugs', () => {
    const firstColor = getStoreHeroColor('midiverse-modular');
    const secondColor = getStoreHeroColor('midiverse-modular');

    expect(firstColor).toBe(secondColor);
    expect(firstColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(firstColor).not.toBe('#536170');
    expect(comp.getStoreHeroColor(createListing({
      id: 1,
      storeName: 'Midiverse Modular',
      storeSlug: 'midiverse-modular'
    }))).toBe(firstColor);
  });

  it('spreads different unlisted store slugs across plausible subdued colors', () => {
    const colors = [
      getStoreHeroColor('midiverse-modular'),
      getStoreHeroColor('soundium'),
      getStoreHeroColor('synthshop')
    ];

    expect(new Set(colors).size).toBe(colors.length);
    colors.forEach(color => {
      const channels = color.match(/[0-9a-f]{2}/g)?.map(channel => parseInt(channel, 16)) ?? [];
      const channelSpread = Math.max(...channels) - Math.min(...channels);
      const averageChannel =
        channels.reduce((total, channel) => total + channel, 0) / channels.length;

      expect(channelSpread).toBeLessThanOrEqual(36);
      expect(averageChannel).toBeGreaterThanOrEqual(90);
      expect(averageChannel).toBeLessThanOrEqual(112);
    });
  });

  it('keeps hand-tuned store hero color overrides ahead of hash fallback', () => {
    expect(getStoreHeroColor('signal-sounds-uk')).toBe('#676976');
    expect(getStoreHeroColor(' Signal-Sounds-UK ')).toBe('#676976');
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

  it('excludes stale prices from best-current comparisons', () => {
    const staleCheap = createListing({
      id: 1,
      storeName: 'Stale cheap',
      priceAmountMinor: 10000,
      lastCheckedAt: '2000-01-01T00:00:00Z'
    });
    const currentPrice = createListing({
      id: 2,
      storeName: 'Current price',
      priceAmountMinor: 20000
    });
    comp.listings = [staleCheap, currentPrice];

    expect(comp.displayListings.map(listing => listing.storeName)).toEqual([
      'Current price',
      'Stale cheap'
    ]);
    expect(comp.isBestAvailableNowListing(currentPrice)).toBeTrue();
    expect(comp.isBestAvailableNowListing(staleCheap)).toBeFalse();
    expect(comp.getPriceInsightLabel(staleCheap)).toBe('');
    expect(comp.priceComparisonPoints).toEqual([]);
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

  it('formats zero-decimal store currencies without cents scaling', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Clockface',
      priceAmountMinor: 40000,
      currency: 'JPY'
    });

    expect(comp.formatPrice(listing)).toContain('40,000');
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

  it('keeps the preferred continent through transient empty listing states', () => {
    comp.listings = undefined;

    comp.listings = [
      createListing({id: 1, storeName: 'EU store', countryCode: 'DE'}),
      createListing({id: 2, storeName: 'US store', countryCode: 'US'})
    ];

    expect(comp.regionFilter).toBe('europe');
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

describe('ModulePriceListingsCardComponent template', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModulePriceListingsCardComponent],
      imports: [
        TimeagoModule.forRoot(),
        SupabaseUtcTimestampPipe
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  it('renders each listing row as one explicit external listing link', () => {
    const listing = createListing({
      id: 1,
      storeName: 'Signal Sounds EU',
      countryCode: 'DE',
      priceAmountMinor: 32000
    });
    const fixture = TestBed.createComponent(ModulePriceListingsCardComponent);
    fixture.componentInstance.preferredContinent = 'europe';
    fixture.componentInstance.regionFilter = 'europe';
    fixture.componentInstance.listings = [listing];

    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector(
      '.module-price-listing'
    ) as HTMLAnchorElement | null;

    expect(row).not.toBeNull();
    expect(row?.tagName).toBe('A');
    expect(row?.href).toBe(listing.productUrl);
    expect(row?.target).toBe('_blank');
    expect(row?.rel).toContain('noopener');
    expect(row?.rel).toContain('noreferrer');
    expect(row?.textContent).toContain('Open listing');
    expect(row?.querySelectorAll('a, button').length).toBe(0);
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
    expect(
      getModulePriceAvailabilityGroup(
        createListing({
          id: 6,
          storeName: 'Stale stock',
          availability: 'in_stock',
          lastCheckedAt: '2000-01-01T00:00:00Z'
        })
      )
    ).toBe('unknown');
  });

  it('treats listings older than the documented stale threshold as non-current', () => {
    const referenceDate = new Date('2026-07-20T12:00:00Z');
    const exactlyThreshold = createListing({
      id: 1,
      storeName: 'Fresh edge',
      lastCheckedAt: '2026-07-06T12:00:00Z'
    });
    const olderThanThreshold = createListing({
      id: 2,
      storeName: 'Stale edge',
      lastCheckedAt: '2026-07-06T11:59:59Z'
    });

    expect(MODULE_PRICE_STALE_THRESHOLD_DAYS).toBe(14);
    expect(isModulePriceListingStale(exactlyThreshold, referenceDate)).toBeFalse();
    expect(isModulePriceListingStale(olderThanThreshold, referenceDate)).toBeTrue();
    expect(
      getListingPriceAmount(
        createListing({
          id: 3,
          storeName: 'Long stale',
          priceAmountMinor: 10000,
          lastCheckedAt: '2000-01-01T00:00:00Z'
        })
      )
    ).toBeNull();
  });

  it('orders seeded non-EUR store currencies by estimated EUR price', () => {
    const orderedListings = filterAndOrderModulePriceListings(
      [
        createListing({
          id: 1,
          storeName: 'Found Sound AUD',
          priceAmountMinor: 10000,
          currency: 'AUD',
          countryCode: 'DE'
        }),
        createListing({
          id: 2,
          storeName: 'Nightlife CAD',
          priceAmountMinor: 10000,
          currency: 'CAD',
          countryCode: 'DE'
        }),
        createListing({
          id: 3,
          storeName: 'Clockface JPY',
          priceAmountMinor: 40000,
          currency: 'JPY',
          countryCode: 'DE'
        }),
        createListing({
          id: 4,
          storeName: 'Synthshop NOK',
          priceAmountMinor: 10000,
          currency: 'NOK',
          countryCode: 'DE'
        }),
        createListing({
          id: 5,
          storeName: 'Unknown FX',
          priceAmountMinor: 10000,
          currency: 'XYZ',
          countryCode: 'DE'
        })
      ],
      'all',
      'price_asc'
    );

    expect(orderedListings.map(listing => listing.storeName)).toEqual([
      'Synthshop NOK',
      'Found Sound AUD',
      'Nightlife CAD',
      'Clockface JPY',
      'Unknown FX'
    ]);
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

  it('keeps stale rows visible but after current known prices when ordering', () => {
    const orderedListings = filterAndOrderModulePriceListings(
      [
        createListing({
          id: 1,
          storeName: 'Stale low',
          priceAmountMinor: 10000,
          lastCheckedAt: '2000-01-01T00:00:00Z'
        }),
        createListing({id: 2, storeName: 'Current high', priceAmountMinor: 25000}),
        createListing({id: 3, storeName: 'Current low', priceAmountMinor: 20000})
      ],
      'all',
      'price_asc'
    );

    expect(orderedListings.map(listing => listing.storeName)).toEqual([
      'Current low',
      'Current high',
      'Stale low'
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
