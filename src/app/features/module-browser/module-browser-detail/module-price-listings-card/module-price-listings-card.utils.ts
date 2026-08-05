import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import {
  normalizeEstimatedModulePriceToEurMinor
} from 'src/app/features/backend/module-price-estimated-fx.utils';
import {
  compareModulePriceContinents,
  DEFAULT_MODULE_PRICE_CONTINENT,
  getListingContinentCode,
  MODULE_PRICE_CONTINENT_LABELS
} from './module-price-listings-card-region.utils';
import type {
  ModulePriceContinentCode,
  ModulePriceListingGroup,
  ModulePriceRegionFilter,
  ModulePriceRegionFilterOption
} from './module-price-listings-card-region.utils';

export {
  detectPreferredModulePriceContinent,
  getContinentForRegionCode,
  getRegionFilterResultLabel,
  groupModulePriceListingsByContinent,
  isModulePriceRegionFilter
} from './module-price-listings-card-region.utils';
export type {
  ModulePriceContinentCode,
  ModulePriceContinentDetectionInput,
  ModulePriceListingGroup,
  ModulePriceRegionFilter,
  ModulePriceRegionFilterOption
} from './module-price-listings-card-region.utils';

export type ModulePriceAvailabilityFilter =
  | 'all'
  | 'in_stock'
  | 'available_soon'
  | 'unavailable'
  | 'unknown';

export type ModulePriceAvailabilityGroup = Exclude<
  ModulePriceAvailabilityFilter,
  'all'
>;

export type ModulePriceListingOrder =
  | 'price_asc'
  | 'price_desc'
  | 'availability'
  | 'store_name';

export interface ModulePriceSelectOption<T extends string> {
  value: T;
  label: string;
}

export interface ModulePriceComparisonPoint {
  listing: ModulePriceListing;
  relation: 'best' | 'above' | 'below' | 'same';
  widthPercent: number;
  normalizedPriceEurMinor: number;
}

export type ModulePriceListingPricePartKind = 'amount' | 'currency' | 'text';

export interface ModulePriceListingPricePart {
  kind: ModulePriceListingPricePartKind;
  value: string;
}

/**
 * Precomputed, per-listing template view data. Built once per derived-state
 * rebuild (see buildModulePriceListingsDerivedState) instead of being
 * recomputed by template method calls on every change-detection cycle.
 */
export interface ModulePriceListingRowView {
  isStale: boolean;
  isAvailableNow: boolean;
  isBestAvailableNow: boolean;
  storeHeroColor: string;
  availabilityLabel: string;
  availabilityClass: string;
  shippingOriginLabel: string;
  shippingOriginFlag: string;
  freshnessIso: string | null;
  priceParts: ReadonlyArray<ModulePriceListingPricePart>;
}

export interface ModulePriceListingsDerivedState {
  displayListings: ModulePriceListing[];
  displayListingGroups: ModulePriceListingGroup[];
  regionFilterOptions: ReadonlyArray<ModulePriceRegionFilterOption>;
  priceComparisonPoints: ModulePriceComparisonPoint[];
  priceComparisonPointByListingId: ReadonlyMap<number, ModulePriceComparisonPoint>;
  bestAvailableNowListing: ModulePriceListing | null;
  cheapestKnownListing: ModulePriceListing | null;
  priceInsightLabelByListingId: ReadonlyMap<number, string>;
  priceInsightClassByListingId: ReadonlyMap<number, string>;
  rowViewByListingId: ReadonlyMap<number, ModulePriceListingRowView>;
}

export const MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS: ReadonlyArray<
  ModulePriceSelectOption<ModulePriceAvailabilityFilter>
> = [
  {value: 'all', label: 'All'},
  {value: 'in_stock', label: 'Available now'},
  {value: 'available_soon', label: 'Available soon'},
  {value: 'unavailable', label: 'Unavailable'}
];

export const MODULE_PRICE_LISTING_ORDER_OPTIONS: ReadonlyArray<
  ModulePriceSelectOption<ModulePriceListingOrder>
> = [
  {value: 'price_asc', label: '↓ Price'},
  {value: 'price_desc', label: '↑ Price'},
  {value: 'availability', label: 'Avail.'},
  {value: 'store_name', label: 'Store'}
];

export const MODULE_PRICE_AVAILABILITY_RESULT_LABELS: Record<ModulePriceAvailabilityFilter, string> = {
  all: 'All stores',
  in_stock: 'Available now',
  available_soon: 'Available soon',
  unavailable: 'Unavailable',
  unknown: 'Unknown availability'
};

export const MODULE_PRICE_ORDER_RESULT_LABELS: Record<ModulePriceListingOrder, string> = {
  price_asc: 'best price first',
  price_desc: 'highest price first',
  availability: 'availability first',
  store_name: 'A-Z by store'
};

export const MODULE_PRICE_STALE_THRESHOLD_DAYS = 14;

const AVAILABILITY_GROUP_ORDER: Record<ModulePriceAvailabilityGroup, number> = {
  in_stock: 0,
  available_soon: 1,
  unavailable: 2,
  unknown: 3
};

export const REGION_LABELS: Readonly<Record<string, string>> = {
  GB: 'United Kingdom',
  UK: 'United Kingdom'
};

export const STORE_HERO_COLORS: Readonly<Record<string, string>> = {
  'elevator-sound': '#6f685d',
  'new-groove': '#70685f',
  'signal-sounds-uk': '#676976',
  'signal-sounds-eu': '#647078',
  schneidersladen: '#706765'
};

const DEFAULT_STORE_HERO_COLOR = '#536170';

export function getStoreHeroColor(storeSlug: string | null | undefined): string {
  const normalizedSlug = storeSlug?.trim().toLowerCase();

  if (!normalizedSlug) {
    return DEFAULT_STORE_HERO_COLOR;
  }

  return STORE_HERO_COLORS[normalizedSlug] ?? buildStoreHeroColorFromSlug(normalizedSlug);
}

function buildStoreHeroColorFromSlug(storeSlug: string): string {
  const hash = hashStoreSlug(storeSlug);
  const hue = hash % 360;
  const saturation = 9 + (hash >>> 8) % 5;
  const lightness = 38 + (hash >>> 16) % 5;

  return hslToHex(hue, saturation / 100, lightness / 100);
}

function hashStoreSlug(storeSlug: string): number {
  let hash = 2166136261;

  for (let index = 0; index < storeSlug.length; index++) {
    hash ^= storeSlug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSegment = hue / 60;
  const secondary = chroma * (1 - Math.abs(hueSegment % 2 - 1));
  const match = lightness - chroma / 2;
  const [red, green, blue] = getRgbFromHueSegment(hueSegment, chroma, secondary)
    .map(channel => Math.round((channel + match) * 255));

  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
}

function getRgbFromHueSegment(
  hueSegment: number,
  chroma: number,
  secondary: number
): [number, number, number] {
  if (hueSegment < 1) {
    return [chroma, secondary, 0];
  }

  if (hueSegment < 2) {
    return [secondary, chroma, 0];
  }

  if (hueSegment < 3) {
    return [0, chroma, secondary];
  }

  if (hueSegment < 4) {
    return [0, secondary, chroma];
  }

  if (hueSegment < 5) {
    return [secondary, 0, chroma];
  }

  return [chroma, 0, secondary];
}

function toHexChannel(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}

export const regionDisplayNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, {type: 'region'})
    : null;

export function getModulePriceAvailabilityGroup(
  listing: ModulePriceListing
): ModulePriceAvailabilityGroup {
  if (isModulePriceListingStale(listing)) {
    return 'unknown';
  }

  switch (listing.latestSnapshot?.availability) {
    case 'in_stock':
      return 'in_stock';
    case 'preorder':
    case 'backorder':
      return 'available_soon';
    case 'out_of_stock':
    case 'discontinued':
      return 'unavailable';
    default:
      return 'unknown';
  }
}

export function filterAndOrderModulePriceListings(
  listings: ReadonlyArray<ModulePriceListing>,
  availabilityFilter: ModulePriceAvailabilityFilter,
  listingOrder: ModulePriceListingOrder,
  regionFilter: ModulePriceRegionFilter = 'all',
  preferredContinent: ModulePriceContinentCode = DEFAULT_MODULE_PRICE_CONTINENT
): ModulePriceListing[] {
  const filteredListings =
    availabilityFilter === 'all'
      ? [...listings]
      : listings.filter(
          listing => getModulePriceAvailabilityGroup(listing) === availabilityFilter
        );
  const regionFilteredListings =
    regionFilter === 'all'
      ? filteredListings
      : filteredListings.filter(
          listing => getListingContinentCode(listing) === regionFilter
        );

  return regionFilteredListings.sort((first, second) => {
    if (regionFilter === 'all') {
      const continentDelta = compareListingsByContinent(first, second, preferredContinent);
      if (continentDelta !== 0) {
        return continentDelta;
      }
    }

    switch (listingOrder) {
      case 'price_desc':
        return compareListingsByPrice(first, second, 'desc');
      case 'availability':
        return compareListingsByAvailability(first, second);
      case 'store_name':
        return compareListingsByStoreName(first, second);
      case 'price_asc':
      default:
        return compareListingsByPrice(first, second, 'asc');
    }
  });
}

export function buildModulePriceRegionFilterOptions(
  listings: ReadonlyArray<ModulePriceListing>,
  availabilityFilter: ModulePriceAvailabilityFilter,
  preferredContinent: ModulePriceContinentCode
): ReadonlyArray<ModulePriceRegionFilterOption> {
  const availableListings =
    availabilityFilter === 'all'
      ? listings
      : listings.filter(
          listing => getModulePriceAvailabilityGroup(listing) === availabilityFilter
        );
  const visibleContinents = new Set<ModulePriceContinentCode>(
    availableListings.map(getListingContinentCode)
  );
  const continentOptions = [...visibleContinents]
    .sort((first, second) => compareModulePriceContinents(first, second, preferredContinent))
    .map(continentCode => ({
      value: continentCode,
      label: MODULE_PRICE_CONTINENT_LABELS[continentCode]
    }));

  if (continentOptions.length === 0) {
    return [{value: 'all', label: 'All'}];
  }

  const [firstContinentOption, ...remainingContinentOptions] = continentOptions;

  return [
    firstContinentOption,
    {value: 'all', label: 'All'},
    ...remainingContinentOptions
  ];
}

function compareListingsByPrice(
  first: ModulePriceListing,
  second: ModulePriceListing,
  direction: 'asc' | 'desc'
): number {
  const firstPrice = getListingPriceAmount(first);
  const secondPrice = getListingPriceAmount(second);
  const firstHasPrice = firstPrice !== null && firstPrice !== undefined;
  const secondHasPrice = secondPrice !== null && secondPrice !== undefined;

  if (!firstHasPrice || !secondHasPrice) {
    if (firstHasPrice === secondHasPrice) {
      return compareListingsByStoreName(first, second);
    }

    return firstHasPrice ? -1 : 1;
  }

  const availabilityDelta =
    getAvailableNowPriority(first) - getAvailableNowPriority(second);

  if (availabilityDelta !== 0) {
    return availabilityDelta;
  }

  const priceDelta =
    direction === 'asc' ? firstPrice - secondPrice : secondPrice - firstPrice;

  return priceDelta || compareListingsByStoreName(first, second);
}

export function getAvailableNowPriority(listing: ModulePriceListing): number {
  return listing.latestSnapshot?.availability === 'in_stock' ? 0 : 1;
}

export function getListingPriceAmount(listing: ModulePriceListing): number | null {
  if (isModulePriceListingStale(listing)) {
    return null;
  }

  const snapshot = listing.latestSnapshot;
  const priceAmountMinor = snapshot?.priceAmountMinor;
  const currency = snapshot?.currency?.trim().toUpperCase();

  if (priceAmountMinor === null || priceAmountMinor === undefined || !currency) {
    return null;
  }

  return normalizeEstimatedModulePriceToEurMinor(priceAmountMinor, currency);
}

export function getModulePriceFreshnessIso(listing: ModulePriceListing): string | null {
  return listing.lastCheckedAt ?? listing.latestSnapshot?.observedAt ?? null;
}

export function isModulePriceListingStale(
  listing: ModulePriceListing,
  referenceDate: Date = new Date()
): boolean {
  const freshnessIso = getModulePriceFreshnessIso(listing);
  if (!freshnessIso) {
    return false;
  }

  const freshnessMs = Date.parse(freshnessIso);
  const referenceMs = referenceDate.getTime();
  if (!Number.isFinite(freshnessMs) || !Number.isFinite(referenceMs)) {
    return false;
  }

  return referenceMs - freshnessMs > MODULE_PRICE_STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

export function getKnownPriceListings(
  listings: ReadonlyArray<ModulePriceListing>
): ModulePriceListing[] {
  return listings.filter(listing => getListingPriceAmount(listing) !== null);
}

export function compareListingsByKnownPriceOnly(
  first: ModulePriceListing,
  second: ModulePriceListing
): number {
  return (
    (getListingPriceAmount(first) ?? Number.POSITIVE_INFINITY) -
    (getListingPriceAmount(second) ?? Number.POSITIVE_INFINITY) ||
    compareListingsByStoreName(first, second)
  );
}

export function formatPricePercentDelta(
  basePrice: number,
  comparisonPrice: number
): string {
  if (basePrice <= 0) {
    return '0%';
  }

  const rawPercent = Math.abs((comparisonPrice - basePrice) / basePrice * 100);
  const roundedPercent = rawPercent > 0 ? Math.max(1, Math.round(rawPercent)) : 0;

  return `${roundedPercent}%`;
}

export function getShippingOriginCode(listing: ModulePriceListing): string {
  const originCode = listing.countryCode?.trim().toUpperCase();

  if (!originCode || originCode === 'EU') {
    return '';
  }

  return originCode === 'UK' ? 'GB' : originCode;
}

export function countryCodeToFlag(countryCode: string): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return '';
  }

  return [...countryCode]
    .map(letter => String.fromCodePoint(0x1F1E6 + letter.charCodeAt(0) - 65))
    .join('');
}

function compareListingsByAvailability(
  first: ModulePriceListing,
  second: ModulePriceListing
): number {
  const groupDelta =
    AVAILABILITY_GROUP_ORDER[getModulePriceAvailabilityGroup(first)] -
    AVAILABILITY_GROUP_ORDER[getModulePriceAvailabilityGroup(second)];

  return groupDelta || compareListingsByPrice(first, second, 'asc');
}

function compareListingsByContinent(
  first: ModulePriceListing,
  second: ModulePriceListing,
  preferredContinent: ModulePriceContinentCode
): number {
  return compareModulePriceContinents(
    getListingContinentCode(first),
    getListingContinentCode(second),
    preferredContinent
  );
}

function compareListingsByStoreName(
  first: ModulePriceListing,
  second: ModulePriceListing
): number {
  return (
    first.storeName.localeCompare(second.storeName, undefined, {
      sensitivity: 'base'
    }) || first.listingId - second.listingId
  );
}

export function isModulePriceAvailabilityFilter(
  value: unknown
): value is ModulePriceAvailabilityFilter {
  if (typeof value !== 'string') {
    return false;
  }

  return MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS.some(
    option => option.value === value
  );
}

export function isModulePriceListingOrder(value: unknown): value is ModulePriceListingOrder {
  if (typeof value !== 'string') {
    return false;
  }

  return MODULE_PRICE_LISTING_ORDER_OPTIONS.some(option => option.value === value);
}
