import { Component, Input } from '@angular/core';
import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';

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

interface ModulePriceSelectOption<T extends string> {
  value: T;
  label: string;
}

export interface ModulePriceComparisonPoint {
  listing: ModulePriceListing;
  relation: 'best' | 'above' | 'below' | 'same';
  widthPercent: number;
  normalizedPriceEurMinor: number;
}

export const MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS: ReadonlyArray<
  ModulePriceSelectOption<ModulePriceAvailabilityFilter>
> = [
  {value: 'all', label: 'All'},
  {value: 'in_stock', label: 'Available now'},
  {value: 'available_soon', label: 'Available soon'},
  {value: 'unavailable', label: 'Unavailable'},
  {value: 'unknown', label: 'Unknown'}
];

export const MODULE_PRICE_LISTING_ORDER_OPTIONS: ReadonlyArray<
  ModulePriceSelectOption<ModulePriceListingOrder>
> = [
  {value: 'price_asc', label: '↓ Price'},
  {value: 'price_desc', label: '↑ Price'},
  {value: 'availability', label: 'Avail.'},
  {value: 'store_name', label: 'Store'}
];

const AVAILABILITY_GROUP_ORDER: Record<ModulePriceAvailabilityGroup, number> = {
  in_stock: 0,
  available_soon: 1,
  unavailable: 2,
  unknown: 3
};

const REGION_LABELS: Readonly<Record<string, string>> = {
  GB: 'United Kingdom',
  UK: 'United Kingdom'
};

const SHIPPING_ORIGIN_NEEDS_REVIEW_LABEL = 'Shipping origin needs review';
const SHIPPING_ORIGIN_NEEDS_REVIEW_CODES = new Set(['EU']);

const STORE_HERO_COLORS: Readonly<Record<string, string>> = {
  'elevator-sound': '#6f685d',
  'new-groove': '#70685f',
  'signal-sounds-uk': '#676976',
  'signal-sounds-eu': '#647078',
  schneidersladen: '#706765'
};

const CURRENCY_TO_EUR_RATE: Readonly<Record<string, number>> = {
  CHF: 1.07,
  EUR: 1,
  GBP: 1.17,
  USD: 0.92
};

const regionDisplayNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, {type: 'region'})
    : null;

export function getModulePriceAvailabilityGroup(
  listing: ModulePriceListing
): ModulePriceAvailabilityGroup {
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
  listingOrder: ModulePriceListingOrder
): ModulePriceListing[] {
  const filteredListings =
    availabilityFilter === 'all'
      ? [...listings]
      : listings.filter(
          listing => getModulePriceAvailabilityGroup(listing) === availabilityFilter
        );

  return filteredListings.sort((first, second) => {
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

function getAvailableNowPriority(listing: ModulePriceListing): number {
  return listing.latestSnapshot?.availability === 'in_stock' ? 0 : 1;
}

function getListingPriceAmount(listing: ModulePriceListing): number | null {
  const snapshot = listing.latestSnapshot;
  const priceAmountMinor = snapshot?.priceAmountMinor;
  const currency = snapshot?.currency?.trim().toUpperCase();

  if (priceAmountMinor === null || priceAmountMinor === undefined || !currency) {
    return null;
  }

  const eurRate = CURRENCY_TO_EUR_RATE[currency];
  return eurRate === undefined ? null : Math.round(priceAmountMinor * eurRate);
}

function getKnownPriceListings(
  listings: ReadonlyArray<ModulePriceListing>
): ModulePriceListing[] {
  return listings.filter(listing => getListingPriceAmount(listing) !== null);
}

function compareListingsByKnownPriceOnly(
  first: ModulePriceListing,
  second: ModulePriceListing
): number {
  return (
    (getListingPriceAmount(first) ?? Number.POSITIVE_INFINITY) -
    (getListingPriceAmount(second) ?? Number.POSITIVE_INFINITY) ||
    compareListingsByStoreName(first, second)
  );
}

function formatPricePercentDelta(
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

function getShippingOriginCode(listing: ModulePriceListing): string {
  const originCode = listing.countryCode?.trim().toUpperCase();

  if (!originCode) {
    return '';
  }

  return originCode === 'UK' ? 'GB' : originCode;
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

function isModulePriceAvailabilityFilter(
  value: unknown
): value is ModulePriceAvailabilityFilter {
  if (typeof value !== 'string') {
    return false;
  }

  return MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS.some(
    option => option.value === value
  );
}

function isModulePriceListingOrder(value: unknown): value is ModulePriceListingOrder {
  if (typeof value !== 'string') {
    return false;
  }

  return MODULE_PRICE_LISTING_ORDER_OPTIONS.some(option => option.value === value);
}

@Component({
  selector: 'app-module-price-listings-card',
  templateUrl: './module-price-listings-card.component.html',
  styleUrls: ['./module-price-listings-card.component.scss'],
  standalone: false
})
export class ModulePriceListingsCardComponent {
  @Input() listings: ModulePriceListing[] | null | undefined;

  availabilityFilter: ModulePriceAvailabilityFilter = 'all';
  listingOrder: ModulePriceListingOrder = 'price_asc';

  readonly availabilityFilterOptions = MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS;
  readonly listingOrderOptions = MODULE_PRICE_LISTING_ORDER_OPTIONS;

  get hasListings(): boolean {
    return (this.listings?.length ?? 0) > 0;
  }

  get displayListings(): ModulePriceListing[] {
    return filterAndOrderModulePriceListings(
      this.listings ?? [],
      this.availabilityFilter,
      this.listingOrder
    );
  }

  get priceComparisonPoints(): ModulePriceComparisonPoint[] {
    const pricedListings = getKnownPriceListings(this.displayListings)
      .sort(compareListingsByKnownPriceOnly);

    if (pricedListings.length < 2) {
      return [];
    }

    const benchmarkListing = this.getBestAvailableNowListing() ?? pricedListings[0];
    const benchmarkPrice = getListingPriceAmount(benchmarkListing);

    if (benchmarkPrice === null || benchmarkPrice <= 0) {
      return [];
    }

    const normalizedPrices = pricedListings.map(
      listing => getListingPriceAmount(listing) ?? benchmarkPrice
    );
    const minPrice = Math.min(...normalizedPrices);
    const maxPrice = Math.max(...normalizedPrices);
    const spread = maxPrice - minPrice;
    const rangePadding = Math.max(Math.round(spread * 0.14), Math.round(minPrice * 0.015), 100);
    const axisMin = Math.max(0, minPrice - rangePadding);
    const axisMax = maxPrice + rangePadding;

    return pricedListings.map(listing => ({
      listing,
      relation: this.getComparisonRelation(listing, benchmarkListing, benchmarkPrice),
      normalizedPriceEurMinor: getListingPriceAmount(listing) ?? benchmarkPrice,
      widthPercent: this.getComparisonRailWidthPercent(
        getListingPriceAmount(listing) ?? benchmarkPrice,
        axisMin,
        axisMax
      )
    }));
  }

  setAvailabilityFilter(value: unknown): void {
    if (isModulePriceAvailabilityFilter(value)) {
      this.availabilityFilter = value;
    }
  }

  setListingOrder(value: unknown): void {
    if (isModulePriceListingOrder(value)) {
      this.listingOrder = value;
    }
  }

  formatPrice(listing: ModulePriceListing): string {
    const snapshot = listing.latestSnapshot;
    if (!snapshot?.currency || snapshot.priceAmountMinor === null) {
      return 'Price unknown';
    }

    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: snapshot.currency,
      currencyDisplay: 'narrowSymbol'
    }).format(snapshot.priceAmountMinor / 100);
  }

  getAvailabilityLabel(listing: ModulePriceListing): string {
    switch (listing.latestSnapshot?.availability) {
      case 'in_stock':
        return 'Available now';
      case 'out_of_stock':
        return 'Out of stock';
      case 'preorder':
        return 'Preorder';
      case 'backorder':
        return 'Backorder';
      case 'discontinued':
        return 'Discontinued';
      default:
        return 'Availability unknown';
    }
  }

  getAvailabilityClass(listing: ModulePriceListing): string {
    switch (listing.latestSnapshot?.availability) {
      case 'in_stock':
        return 'module-price-listing__availability--available';
      case 'out_of_stock':
        return 'module-price-listing__availability--unavailable';
      case 'discontinued':
        return 'module-price-listing__availability--discontinued';
      case 'preorder':
      case 'backorder':
        return 'module-price-listing__availability--pending';
      default:
        return 'module-price-listing__availability--unknown';
    }
  }

  isAvailableNow(listing: ModulePriceListing): boolean {
    return getAvailableNowPriority(listing) === 0;
  }

  getStoreHeroColor(listing: ModulePriceListing): string {
    return STORE_HERO_COLORS[listing.storeSlug] ?? '#536170';
  }

  getBestAvailableNowListing(): ModulePriceListing | null {
    return getKnownPriceListings(this.displayListings)
      .filter(listing => this.isAvailableNow(listing))
      .sort(compareListingsByKnownPriceOnly)[0] ?? null;
  }

  getPriceInsightLabel(listing: ModulePriceListing): string {
    const price = getListingPriceAmount(listing);
    if (price === null) {
      return '';
    }

    const bestAvailableNow = this.getBestAvailableNowListing();
    const bestAvailablePrice =
      bestAvailableNow ? getListingPriceAmount(bestAvailableNow) : null;

    if (bestAvailableNow && bestAvailablePrice !== null) {
      if (bestAvailableNow.listingId === listing.listingId) {
        return '';
      }

      if (!this.isAvailableNow(listing) && price < bestAvailablePrice) {
        return `Could be ${formatPricePercentDelta(bestAvailablePrice, price)} less if available`;
      }

      if (this.isAvailableNow(listing)) {
        return `+${formatPricePercentDelta(bestAvailablePrice, price)} vs best`;
      }

      return 'Not available';
    }

    const cheapestKnown = getKnownPriceListings(this.displayListings)
      .sort(compareListingsByKnownPriceOnly)[0];
    const cheapestKnownPrice = cheapestKnown ? getListingPriceAmount(cheapestKnown) : null;

    if (!cheapestKnown || cheapestKnownPrice === null) {
      return '';
    }

    return cheapestKnown.listingId === listing.listingId
      ? 'Lowest listed'
      : `+${formatPricePercentDelta(cheapestKnownPrice, price)} vs low`;
  }

  getPriceInsightClass(listing: ModulePriceListing): string {
    const label = this.getPriceInsightLabel(listing);

    if (label === 'Best now' || label === 'Lowest listed') {
      return 'module-price-listing__insight--best';
    }

    if (label.startsWith('Could be ')) {
      return 'module-price-listing__insight--opportunity';
    }

    if (label.startsWith('+')) {
      return 'module-price-listing__insight--premium';
    }

    return 'module-price-listing__insight--muted';
  }

  isBestAvailableNowListing(listing: ModulePriceListing): boolean {
    return this.getBestAvailableNowListing()?.listingId === listing.listingId;
  }

  getShippingOriginLabel(listing: ModulePriceListing): string {
    const originCode = getShippingOriginCode(listing);
    if (!originCode) {
      return '';
    }

    if (SHIPPING_ORIGIN_NEEDS_REVIEW_CODES.has(originCode)) {
      return SHIPPING_ORIGIN_NEEDS_REVIEW_LABEL;
    }

    const originName =
      REGION_LABELS[originCode] ?? regionDisplayNames?.of(originCode) ?? originCode;

    return originName;
  }

  private getComparisonRelation(
    listing: ModulePriceListing,
    benchmarkListing: ModulePriceListing,
    benchmarkPrice: number
  ): ModulePriceComparisonPoint['relation'] {
    if (listing.listingId === benchmarkListing.listingId) {
      return this.isAvailableNow(listing) ? 'best' : 'same';
    }

    const price = getListingPriceAmount(listing);

    if (price === null || price === benchmarkPrice) {
      return 'same';
    }

    return price > benchmarkPrice ? 'above' : 'below';
  }

  private getComparisonRailWidthPercent(
    price: number,
    axisMin: number,
    axisMax: number
  ): number {
    const range = axisMax - axisMin;
    if (range <= 0) {
      return 100;
    }

    return Math.round((price - axisMin) / range * 100);
  }

  getPriceComparisonPoint(listing: ModulePriceListing): ModulePriceComparisonPoint | null {
    return this.priceComparisonPoints.find(
      point => point.listing.listingId === listing.listingId
    ) ?? null;
  }
}
