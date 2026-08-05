import { type MarketplaceListing } from 'src/app/features/marketplace/marketplace-listing.utils';
import { formatMarketplaceMinorUnits } from 'src/app/features/marketplace/marketplace-money.utils';
import { type MinimalModule } from 'src/app/models/module';
import { matchesSearchQuery } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';

export type MarketplaceSortKey = 'newest' | 'price-low' | 'price-high';

export interface MarketplaceBrowseFilters {
  condition: string;
  currency: string;
  manufacturer: string;
  maxPrice: string;
  minPrice: string;
  query: string;
  shippingOption: string;
  shipsFromCountry: string;
}

export interface MarketplaceFilterChip {
  key: keyof MarketplaceBrowseFilters;
  label: string;
}

export interface MarketplaceBrowseFacets {
  conditions: string[];
  currencies: string[];
  manufacturers: string[];
  shippingOptions: string[];
  shipsFromCountries: string[];
}

export interface MarketplaceListingMediaViewModel {
  alt: string;
  id: string;
  url: string;
}

export interface MarketplaceListingCardViewModel {
  ageLabel: string;
  condition: string;
  conditionLabel: string;
  detailUrl: string;
  manufacturerName: string;
  media: MarketplaceListingMediaViewModel[];
  module: MinimalModule | null;
  openToOffers: boolean;
  originSummary: string;
  priceCurrency: string;
  priceLabel: string;
  priceMajor: number;
  publicId: string;
  sellerLabel: string;
  shippingOptions: string[];
  shippingSummary: string;
  shipsFromCountry: string;
  sortTimestamp: number;
  title: string;
}

export interface MarketplaceListingDetailViewModel extends MarketplaceListingCardViewModel {
  description: string | null;
  externalLink: string | null;
  sellerProfileUrl: string | null;
  shippingNotes: string | null;
  statusLabel: string;
  updatedLabel: string;
}

export const EMPTY_MARKETPLACE_BROWSE_FILTERS: MarketplaceBrowseFilters = {
  condition: '',
  currency: '',
  manufacturer: '',
  maxPrice: '',
  minPrice: '',
  query: '',
  shippingOption: '',
  shipsFromCountry: ''
};

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  fair: 'Fair',
  for_parts: 'For parts',
  good: 'Good',
  new: 'New'
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  reserved: 'Reserved'
};
const DEFAULT_MARKETPLACE_MODULE_HP = 1;
const DEFAULT_MARKETPLACE_MODULE_STANDARD = {id: 0, name: '3U Doepfer'};

export function buildMarketplaceCardViewModel(
  listing: MarketplaceListing,
  now: Date = new Date()
): MarketplaceListingCardViewModel {
  const title = listing.titleOverride?.trim()
    || listing.module?.name?.trim()
    || 'Marketplace listing';
  const manufacturerName = listing.module?.manufacturer?.name?.trim() || 'Unknown maker';
  const sellerLabel = listing.seller?.username?.trim()
    ? `@${ listing.seller.username.trim() }`
    : 'Public seller';
  const media = listing.media
    .filter(item => !!item.url)
    .map((item, index) => ({
      alt: `${ title } listing image ${ index + 1 }`,
      id: `${ listing.publicId }-media-${ index }`,
      url: item.url
    }));

  return {
    ageLabel: formatListingAge(listing.createdAt, now),
    condition: listing.condition,
    conditionLabel: conditionLabel(listing.condition),
    detailUrl: `/marketplace/${ listing.publicId }`,
    manufacturerName,
    media,
    module: buildMarketplaceModuleViewModel(listing),
    openToOffers: listing.openToOffers,
    originSummary: listing.shipsFromCountry ? `Ships from ${ listing.shipsFromCountry }` : 'Origin not listed',
    priceCurrency: listing.askingPriceCurrency,
    priceLabel: formatMarketplaceMinorUnits(listing.askingPriceAmountMinor, listing.askingPriceCurrency, 'en-US'),
    priceMajor: listing.askingPriceAmountMinor / 10 ** fractionDigitsFor(listing.askingPriceCurrency),
    publicId: listing.publicId,
    sellerLabel,
    shippingOptions: [...listing.shippingOptions],
    shippingSummary: shippingSummary(listing.shippingOptions),
    shipsFromCountry: listing.shipsFromCountry,
    sortTimestamp: Date.parse(listing.updatedAt || listing.createdAt) || 0,
    title
  };
}

function buildMarketplaceModuleViewModel(listing: MarketplaceListing): MinimalModule | null {
  const module = listing.module;
  if (!module) {
    return null;
  }
  const manufacturer = module.manufacturer ?? {id: 0, logo: null, name: 'Unknown maker'};
  const manufacturerViewModel = manufacturer.logo
    ? {id: manufacturer.id, logo: manufacturer.logo, name: manufacturer.name}
    : {id: manufacturer.id, name: manufacturer.name};

  return {
    created: listing.createdAt,
    description: '',
    hp: module.hp ?? DEFAULT_MARKETPLACE_MODULE_HP,
    id: module.id,
    manufacturer: manufacturerViewModel,
    manufacturerId: manufacturer.id,
    name: module.name?.trim() || 'Marketplace module',
    panels: module.panels ?? [],
    public: module.public,
    standard: module.standard ?? DEFAULT_MARKETPLACE_MODULE_STANDARD,
    tags: [],
    updated: listing.updatedAt
  };
}

export function buildMarketplaceDetailViewModel(
  listing: MarketplaceListing,
  now: Date = new Date()
): MarketplaceListingDetailViewModel {
  const card = buildMarketplaceCardViewModel(listing, now);
  const sellerUsername = listing.seller?.username?.trim();

  return {
    ...card,
    description: listing.description?.trim() || null,
    externalLink: listing.externalLink?.trim() || null,
    sellerProfileUrl: sellerUsername ? `/u/${ sellerUsername }` : null,
    shippingNotes: listing.shippingNotes?.trim() || null,
    statusLabel: STATUS_LABELS[listing.status] ?? listing.status,
    updatedLabel: `Updated ${ formatListingAge(listing.updatedAt, now) }`
  };
}

export function buildMarketplaceBrowseFacets(listings: MarketplaceListingCardViewModel[]): MarketplaceBrowseFacets {
  return {
    conditions: uniqueSorted(listings.map(listing => listing.condition)),
    currencies: uniqueSorted(listings.map(listing => listing.priceCurrency)),
    manufacturers: uniqueSorted(listings.map(listing => listing.manufacturerName)),
    shippingOptions: uniqueSorted(listings.flatMap(listing => listing.shippingOptions)),
    shipsFromCountries: uniqueSorted(listings.map(listing => listing.shipsFromCountry))
  };
}

export function filterAndSortMarketplaceListings(
  listings: MarketplaceListingCardViewModel[],
  filters: MarketplaceBrowseFilters,
  sort: MarketplaceSortKey
): MarketplaceListingCardViewModel[] {
  const priceControlsEnabled = marketplacePriceControlsEnabled(filters);
  const minPrice = priceControlsEnabled ? parsePriceBoundary(filters.minPrice) : null;
  const maxPrice = priceControlsEnabled ? parsePriceBoundary(filters.maxPrice) : null;
  const effectiveSort = effectiveMarketplaceSort(sort, filters);

  const filtered = listings.filter(listing => {
    if (!matchesSearchQuery(filters.query, listing.title, listing.manufacturerName, listing.sellerLabel)) {
      return false;
    }
    if (filters.currency && listing.priceCurrency !== filters.currency) {
      return false;
    }
    if (filters.manufacturer && listing.manufacturerName !== filters.manufacturer) {
      return false;
    }
    if (filters.condition && listing.condition !== filters.condition) {
      return false;
    }
    if (filters.shipsFromCountry && listing.shipsFromCountry !== filters.shipsFromCountry) {
      return false;
    }
    if (filters.shippingOption && !listing.shippingOptions.includes(filters.shippingOption)) {
      return false;
    }
    if (minPrice !== null && listing.priceMajor < minPrice) {
      return false;
    }
    if (maxPrice !== null && listing.priceMajor > maxPrice) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((first, second) => sortMarketplaceListings(first, second, effectiveSort));
}

export function marketplaceFilterChips(filters: MarketplaceBrowseFilters): MarketplaceFilterChip[] {
  const chips: MarketplaceFilterChip[] = [];
  if (filters.query.trim()) {
    chips.push({key: 'query', label: `Search: ${ filters.query.trim() }`});
  }
  if (filters.manufacturer) {
    chips.push({key: 'manufacturer', label: filters.manufacturer});
  }
  if (filters.condition) {
    chips.push({key: 'condition', label: conditionLabel(filters.condition)});
  }
  if (filters.currency) {
    chips.push({key: 'currency', label: `Currency: ${ filters.currency }`});
  }
  if (filters.shipsFromCountry) {
    chips.push({key: 'shipsFromCountry', label: `From ${ filters.shipsFromCountry }`});
  }
  if (filters.shippingOption) {
    chips.push({key: 'shippingOption', label: filters.shippingOption});
  }
  if (filters.currency && filters.minPrice.trim()) {
    chips.push({key: 'minPrice', label: `Min ${ filters.currency } ${ filters.minPrice.trim() }`});
  }
  if (filters.currency && filters.maxPrice.trim()) {
    chips.push({key: 'maxPrice', label: `Max ${ filters.currency } ${ filters.maxPrice.trim() }`});
  }
  return chips;
}

export function marketplacePriceControlsEnabled(filters: MarketplaceBrowseFilters): boolean {
  return !!filters.currency;
}

export function marketplacePriceFilterHint(filters: MarketplaceBrowseFilters): string | null {
  return marketplacePriceControlsEnabled(filters)
    ? null
    : 'Select a currency to enable price range and price sorting.';
}

export function effectiveMarketplaceSort(
  sort: MarketplaceSortKey,
  filters: MarketplaceBrowseFilters
): MarketplaceSortKey {
  return isMarketplacePriceSort(sort) && !marketplacePriceControlsEnabled(filters) ? 'newest' : sort;
}

export function isMarketplacePriceSort(sort: MarketplaceSortKey): boolean {
  return sort === 'price-low' || sort === 'price-high';
}

export function conditionLabel(condition: string): string {
  return CONDITION_LABELS[condition] ?? condition;
}

function sortMarketplaceListings(
  first: MarketplaceListingCardViewModel,
  second: MarketplaceListingCardViewModel,
  sort: MarketplaceSortKey
): number {
  if (sort === 'price-low') {
    return first.priceMajor - second.priceMajor || second.sortTimestamp - first.sortTimestamp;
  }
  if (sort === 'price-high') {
    return second.priceMajor - first.priceMajor || second.sortTimestamp - first.sortTimestamp;
  }
  return second.sortTimestamp - first.sortTimestamp;
}

function formatListingAge(value: string, now: Date): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 'date unknown';
  }

  const elapsedMs = Math.max(0, now.getTime() - timestamp);
  const elapsedHours = Math.floor(elapsedMs / 3_600_000);
  if (elapsedHours < 1) {
    return 'just listed';
  }
  if (elapsedHours < 24) {
    return `${ elapsedHours }h ago`;
  }
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) {
    return `${ elapsedDays }d ago`;
  }
  const elapsedMonths = Math.floor(elapsedDays / 30);
  return `${ elapsedMonths }mo ago`;
}

function shippingSummary(options: string[]): string {
  if (options.length === 0) {
    return 'Shipping not listed';
  }
  if (options.length === 1) {
    return options[0];
  }
  return `${ options[0] } +${ options.length - 1 }`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));
}

function parsePriceBoundary(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const fractionDigitsFormatterCache = new Map<string, Intl.NumberFormat>();

function fractionDigitsFor(currency: string): number {
  try {
    let formatter = fractionDigitsFormatterCache.get(currency);
    if (!formatter) {
      formatter = new Intl.NumberFormat('en', {currency, style: 'currency'});
      fractionDigitsFormatterCache.set(currency, formatter);
    }
    return formatter.resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}
