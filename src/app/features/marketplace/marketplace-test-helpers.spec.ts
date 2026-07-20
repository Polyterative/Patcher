import {
  MarketplaceListing,
  MarketplaceListingMedia,
  type MarketplaceListingModuleSummary
} from 'src/app/features/marketplace/marketplace-listing.utils';

export function createMarketplaceListing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
  return {
    askingPriceAmountMinor: 120000,
    askingPriceCurrency: 'EUR',
    condition: 'excellent',
    createdAt: '2026-07-16T10:00:00.000Z',
    description: 'Clean public listing.',
    expiresAt: null,
    externalLink: null,
    id: 'listing-1',
    media: [
      createMarketplaceMedia()
    ],
    module: createMarketplaceModule(),
    moduleId: 101,
    openToOffers: true,
    publicId: 'maths-public',
    seller: {
      avatarUrl: null,
      id: 'seller-1',
      public: true,
      username: 'seller',
      website: null
    },
    sellerProfileId: 'seller-1',
    shippingNotes: 'Ships insured.',
    shippingOptions: ['Domestic shipping', 'EU shipping'],
    shipsFromCountry: 'DE',
    status: 'active',
    titleOverride: null,
    updatedAt: '2026-07-17T10:00:00.000Z',
    ...overrides
  };
}

export function createMarketplaceModule(
  overrides: Partial<MarketplaceListingModuleSummary> = {}
): MarketplaceListingModuleSummary {
  return {
    hp: 20,
    id: 101,
    manufacturer: {id: 7, logo: null, name: 'Make Noise'},
    name: 'Maths',
    panels: [{
      color: 0,
      description: 'Black panel',
      filename: 'maths-black.webp',
      id: 1,
      moduleid: 101
    }],
    public: true,
    standard: {id: 0, name: '3U Doepfer'},
    ...overrides
  };
}

export function createMarketplaceMedia(overrides: Partial<MarketplaceListingMedia> = {}): MarketplaceListingMedia {
  return {
    createdAt: '2026-07-16T10:00:00.000Z',
    id: 'media-1',
    kind: 'image',
    listingId: 'listing-1',
    mimeType: 'image/webp',
    position: 0,
    storagePath: 'seller-1/listing-1/front.webp',
    url: 'https://images.patcher.xyz/marketplace-listings/seller-1/listing-1/front.webp',
    ...overrides
  };
}
