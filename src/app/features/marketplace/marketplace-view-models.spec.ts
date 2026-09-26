import {
  createMarketplaceListing,
  createMarketplaceModule
} from './marketplace-test-helpers.spec';
import {
  buildMarketplaceBrowseFacets,
  buildMarketplaceCardViewModel,
  buildMarketplaceDetailViewModel,
  filterAndSortMarketplaceListings,
  marketplaceFilterChips
} from './marketplace-view-models';

describe('marketplace view models', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');

  it('maps public listing fields without leaking storage paths', () => {
    const vm = buildMarketplaceDetailViewModel(createMarketplaceListing(), now);

    expect(vm.title).toBe('Maths');
    expect(vm.manufacturerName).toBe('Make Noise');
    expect(vm.priceLabel).toContain('1,200');
    expect(vm.media[0]).toEqual(jasmine.objectContaining({
      id: 'maths-public-media-0',
      url: jasmine.stringContaining('https://images.patcher.xyz/')
    }));
    expect(vm.module).toEqual(jasmine.objectContaining({
      hp: 20,
      id: 101,
      name: 'Maths',
      panels: [jasmine.objectContaining({filename: 'maths-black.webp'})],
      public: true,
      standard: jasmine.objectContaining({name: '3U Doepfer'})
    }));
    expect(JSON.stringify(vm)).not.toContain('storagePath');
    expect(JSON.stringify(vm)).not.toContain('sellerProfileId');
  });

  it('filters by manufacturer, price, condition, country and shipping option', () => {
    const maths = buildMarketplaceCardViewModel(createMarketplaceListing(), now);
    const plaits = buildMarketplaceCardViewModel(createMarketplaceListing({
      askingPriceAmountMinor: 90000,
      condition: 'good',
      id: 'listing-2',
      module: createMarketplaceModule({
        hp: 12,
        id: 202,
        manufacturer: {id: 8, logo: null, name: 'Mutable Instruments'},
        name: 'Plaits',
        panels: [{
          color: 1,
          description: 'Silver panel',
          filename: 'plaits-silver.webp',
          id: 2,
          moduleid: 202
        }],
        public: true
      }),
      publicId: 'plaits-public',
      shippingOptions: ['Local pickup'],
      shipsFromCountry: 'FR',
      updatedAt: '2026-07-17T11:00:00.000Z'
    }), now);

    const filtered = filterAndSortMarketplaceListings([maths, plaits], {
      condition: 'excellent',
      currency: 'EUR',
      manufacturer: 'Make Noise',
      maxHp: '',
      maxPrice: '1300',
      minPrice: '1000',
      query: 'maths',
      shippingOption: 'EU shipping',
      shipsFromCountry: 'DE'
    }, 'newest');

    expect(filtered.map(listing => listing.publicId)).toEqual(['maths-public']);
  });

  it('builds facets, filter chips, and price sorting from loaded public listings', () => {
    const older = buildMarketplaceCardViewModel(createMarketplaceListing({
      askingPriceAmountMinor: 150000,
      id: 'listing-older',
      publicId: 'older',
      updatedAt: '2026-07-16T09:00:00.000Z'
    }), now);
    const newer = buildMarketplaceCardViewModel(createMarketplaceListing({
      askingPriceAmountMinor: 100000,
      id: 'listing-newer',
      publicId: 'newer',
      updatedAt: '2026-07-17T09:00:00.000Z'
    }), now);

    expect(buildMarketplaceBrowseFacets([older, newer]).manufacturers).toEqual(['Make Noise']);
    expect(buildMarketplaceBrowseFacets([older, newer]).currencies).toEqual(['EUR']);
    expect(marketplaceFilterChips({
      condition: 'excellent',
      currency: 'EUR',
      manufacturer: '',
      maxHp: '',
      maxPrice: '',
      minPrice: '1000',
      query: '',
      shippingOption: '',
      shipsFromCountry: 'DE'
    }).map(chip => chip.label)).toEqual(['Excellent', 'Currency: EUR', 'From DE', 'Min EUR 1000']);
    expect(filterAndSortMarketplaceListings([older, newer], {
      condition: '',
      currency: 'EUR',
      manufacturer: '',
      maxHp: '',
      maxPrice: '',
      minPrice: '',
      query: '',
      shippingOption: '',
      shipsFromCountry: ''
    }, 'price-low').map(listing => listing.publicId)).toEqual(['newer', 'older']);
  });

  it('does not compare prices across currencies without an explicit currency filter', () => {
    const eurNewer = buildMarketplaceCardViewModel(createMarketplaceListing({
      askingPriceAmountMinor: 120000,
      askingPriceCurrency: 'EUR',
      id: 'listing-eur',
      publicId: 'eur-newer',
      updatedAt: '2026-07-17T11:00:00.000Z'
    }), now);
    const usdOlder = buildMarketplaceCardViewModel(createMarketplaceListing({
      askingPriceAmountMinor: 10000,
      askingPriceCurrency: 'USD',
      id: 'listing-usd',
      publicId: 'usd-older',
      updatedAt: '2026-07-16T11:00:00.000Z'
    }), now);

    const filters = {
      condition: '',
      currency: '',
      manufacturer: '',
      maxHp: '',
      maxPrice: '200',
      minPrice: '50',
      query: '',
      shippingOption: '',
      shipsFromCountry: ''
    };

    expect(buildMarketplaceBrowseFacets([eurNewer, usdOlder]).currencies).toEqual(['EUR', 'USD']);
    expect(marketplaceFilterChips(filters)).toEqual([]);
    expect(filterAndSortMarketplaceListings([usdOlder, eurNewer], filters, 'price-low')
      .map(listing => listing.publicId)).toEqual(['eur-newer', 'usd-older']);
  });

  it('enables price filtering and sorting only within the selected currency', () => {
    const eurExpensive = buildMarketplaceCardViewModel(createMarketplaceListing({
      askingPriceAmountMinor: 150000,
      askingPriceCurrency: 'EUR',
      id: 'listing-eur-expensive',
      publicId: 'eur-expensive',
      updatedAt: '2026-07-16T10:00:00.000Z'
    }), now);
    const eurAffordable = buildMarketplaceCardViewModel(createMarketplaceListing({
      askingPriceAmountMinor: 90000,
      askingPriceCurrency: 'EUR',
      id: 'listing-eur-affordable',
      publicId: 'eur-affordable',
      updatedAt: '2026-07-17T10:00:00.000Z'
    }), now);
    const usdListing = buildMarketplaceCardViewModel(createMarketplaceListing({
      askingPriceAmountMinor: 50000,
      askingPriceCurrency: 'USD',
      id: 'listing-usd',
      publicId: 'usd-listing',
      updatedAt: '2026-07-17T11:00:00.000Z'
    }), now);

    const filtered = filterAndSortMarketplaceListings([usdListing, eurExpensive, eurAffordable], {
      condition: '',
      currency: 'EUR',
      manufacturer: '',
      maxHp: '',
      maxPrice: '1200',
      minPrice: '800',
      query: '',
      shippingOption: '',
      shipsFromCountry: ''
    }, 'price-high');

    expect(filtered.map(listing => listing.publicId)).toEqual(['eur-affordable']);
  });

  it('filters by max module width while keeping listings without a linked module', () => {
    const wide = buildMarketplaceCardViewModel(createMarketplaceListing(), now);
    const narrow = buildMarketplaceCardViewModel(createMarketplaceListing({
      id: 'listing-narrow',
      module: createMarketplaceModule({hp: 12, id: 202, name: 'Plaits'}),
      publicId: 'narrow-public'
    }), now);
    const moduleless = buildMarketplaceCardViewModel(createMarketplaceListing({
      id: 'listing-moduleless',
      moduleId: 0,
      module: null,
      publicId: 'moduleless-public'
    }), now);

    const filtered = filterAndSortMarketplaceListings([wide, narrow, moduleless], {
      condition: '',
      currency: '',
      manufacturer: '',
      maxHp: '15',
      maxPrice: '',
      minPrice: '',
      query: '',
      shippingOption: '',
      shipsFromCountry: ''
    }, 'newest');

    expect(filtered.map(listing => listing.publicId)).toEqual(['narrow-public', 'moduleless-public']);
    expect(marketplaceFilterChips({
      condition: '',
      currency: '',
      manufacturer: '',
      maxHp: '15',
      maxPrice: '',
      minPrice: '',
      query: '',
      shippingOption: '',
      shipsFromCountry: ''
    }).map(chip => chip.label)).toEqual(['Max 15 HP']);
  });
});
