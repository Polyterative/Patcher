import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import {
  formatEstimatedModulePriceMinorUnits,
  getEstimatedModulePriceCurrencyFractionDigits
} from 'src/app/features/backend/module-price-estimated-fx.utils';
import {
  buildModulePriceRegionFilterOptions,
  compareListingsByKnownPriceOnly,
  countryCodeToFlag,
  filterAndOrderModulePriceListings,
  formatPricePercentDelta,
  getAvailableNowPriority,
  getKnownPriceListings,
  getListingPriceAmount,
  getModulePriceFreshnessIso,
  isModulePriceListingStale,
  getShippingOriginCode,
  getStoreHeroColor,
  groupModulePriceListingsByContinent,
  REGION_LABELS,
  regionDisplayNames
} from './module-price-listings-card.utils';
import type {
  ModulePriceAvailabilityFilter,
  ModulePriceComparisonPoint,
  ModulePriceListingsDerivedState,
  ModulePriceListingOrder,
  ModulePriceListingPricePart,
  ModulePriceListingRowView,
  ModulePriceRegionFilter,
  ModulePriceContinentCode
} from './module-price-listings-card.utils';

export interface BuildModulePriceListingsDerivedStateInput {
  listings: ReadonlyArray<ModulePriceListing>;
  availabilityFilter: ModulePriceAvailabilityFilter;
  listingOrder: ModulePriceListingOrder;
  regionFilter: ModulePriceRegionFilter;
  preferredContinent: ModulePriceContinentCode;
}

export function buildModulePriceListingsDerivedState(
  input: BuildModulePriceListingsDerivedStateInput
): ModulePriceListingsDerivedState {
  const displayListings = filterAndOrderModulePriceListings(
    input.listings,
    input.availabilityFilter,
    input.listingOrder,
    input.regionFilter,
    input.preferredContinent
  );
  const displayListingGroups = groupModulePriceListingsByContinent(displayListings);
  const regionFilterOptions = buildModulePriceRegionFilterOptions(
    input.listings,
    input.availabilityFilter,
    input.preferredContinent
  );
  const knownPriceListings = getKnownPriceListings(displayListings)
    .sort(compareListingsByKnownPriceOnly);
  const bestAvailableNowListing = knownPriceListings
    .filter(isModulePriceListingAvailableNow)[0] ?? null;
  const cheapestKnownListing = knownPriceListings[0] ?? null;
  const priceComparisonPoints = buildPriceComparisonPoints(
    knownPriceListings,
    bestAvailableNowListing
  );
  const priceComparisonPointByListingId = new Map(
    priceComparisonPoints.map(point => [point.listing.listingId, point])
  );
  const priceInsightLabelByListingId = new Map(
    displayListings.map(listing => [
      listing.listingId,
      buildPriceInsightLabel(listing, bestAvailableNowListing, cheapestKnownListing)
    ])
  );
  const priceInsightClassByListingId = new Map(
    displayListings.map(listing => [
      listing.listingId,
      getPriceInsightClassForLabel(
        priceInsightLabelByListingId.get(listing.listingId) ?? ''
      )
    ])
  );
  const rowViewByListingId = new Map(
    displayListings.map(listing => [
      listing.listingId,
      buildModulePriceListingRowView(listing, bestAvailableNowListing)
    ])
  );

  return {
    displayListings,
    displayListingGroups,
    regionFilterOptions,
    priceComparisonPoints,
    priceComparisonPointByListingId,
    bestAvailableNowListing,
    cheapestKnownListing,
    priceInsightLabelByListingId,
    priceInsightClassByListingId,
    rowViewByListingId
  };
}

const pricePartFormatterByCurrency = new Map<string, Intl.NumberFormat>();

function getPricePartFormatter(normalizedCurrency: string): Intl.NumberFormat | null {
  const cachedFormatter = pricePartFormatterByCurrency.get(normalizedCurrency);
  if (cachedFormatter) {
    return cachedFormatter;
  }

  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'narrowSymbol'
    });
    pricePartFormatterByCurrency.set(normalizedCurrency, formatter);
    return formatter;
  } catch {
    return null;
  }
}

function mergeAdjacentPriceParts(
  parts: ReadonlyArray<ModulePriceListingPricePart>
): ReadonlyArray<ModulePriceListingPricePart> {
  return parts.reduce<ModulePriceListingPricePart[]>((mergedParts, part) => {
    const previousPart = mergedParts[mergedParts.length - 1];

    if (previousPart?.kind === part.kind) {
      previousPart.value += part.value;
    } else {
      mergedParts.push({...part});
    }

    return mergedParts;
  }, []);
}

function buildModulePriceListingPriceParts(
  listing: ModulePriceListing,
  isStale: boolean
): ReadonlyArray<ModulePriceListingPricePart> {
  const displayPrice = buildModulePriceListingPriceLabel(listing, isStale);
  const snapshot = listing.latestSnapshot;

  if (
    displayPrice === 'Last seen' ||
    displayPrice === 'Price unknown' ||
    !snapshot?.currency ||
    snapshot.priceAmountMinor === null
  ) {
    return [{kind: 'text', value: displayPrice}];
  }

  const normalizedCurrency = snapshot.currency.trim().toUpperCase();
  const fractionDigits = getEstimatedModulePriceCurrencyFractionDigits(normalizedCurrency);
  const sourceMajorAmount = snapshot.priceAmountMinor / 10 ** fractionDigits;

  const formatter = getPricePartFormatter(normalizedCurrency);
  if (!formatter) {
    return [{kind: 'text', value: displayPrice}];
  }

  const parts = formatter
    .formatToParts(sourceMajorAmount)
    .map(part => ({
      kind: part.type === 'currency' ? 'currency' : 'amount',
      value: part.value
    } satisfies ModulePriceListingPricePart));

  return mergeAdjacentPriceParts(parts);
}

function buildModulePriceListingPriceLabel(listing: ModulePriceListing, isStale: boolean): string {
  if (isStale) {
    return 'Last seen';
  }

  const snapshot = listing.latestSnapshot;
  if (!snapshot?.currency || snapshot.priceAmountMinor === null) {
    return 'Price unknown';
  }

  return formatEstimatedModulePriceMinorUnits(
    snapshot.priceAmountMinor,
    snapshot.currency
  ) ?? 'Price unknown';
}

export function buildModulePriceListingRowView(
  listing: ModulePriceListing,
  bestAvailableNowListing: ModulePriceListing | null
): ModulePriceListingRowView {
  const isStale = isModulePriceListingStale(listing);
  const isAvailableNow = isModulePriceListingAvailableNow(listing);

  return {
    isStale,
    isAvailableNow,
    isBestAvailableNow: bestAvailableNowListing?.listingId === listing.listingId,
    storeHeroColor: getStoreHeroColor(listing.storeSlug),
    availabilityLabel: isStale ? 'Stale data' : getModulePriceAvailabilityLabel(listing),
    availabilityClass: isStale
      ? 'module-price-listing__availability--stale'
      : getModulePriceAvailabilityClass(listing),
    shippingOriginLabel: getModulePriceShippingOriginLabel(listing),
    shippingOriginFlag: getModulePriceShippingOriginFlag(listing),
    freshnessIso: getModulePriceFreshnessIso(listing),
    priceParts: buildModulePriceListingPriceParts(listing, isStale)
  };
}

export function formatModulePriceListingPrice(listing: ModulePriceListing): string {
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

export function getModulePriceAvailabilityLabel(listing: ModulePriceListing): string {
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

export function getModulePriceAvailabilityClass(listing: ModulePriceListing): string {
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

export function isModulePriceListingAvailableNow(listing: ModulePriceListing): boolean {
  return !isModulePriceListingStale(listing) && getAvailableNowPriority(listing) === 0;
}

export function getModulePriceShippingOriginLabel(listing: ModulePriceListing): string {
  const originCode = getShippingOriginCode(listing);
  if (!originCode) {
    return '';
  }

  return REGION_LABELS[originCode] ?? regionDisplayNames?.of(originCode) ?? originCode;
}

export function getModulePriceShippingOriginFlag(listing: ModulePriceListing): string {
  const originCode = getShippingOriginCode(listing);
  return originCode ? countryCodeToFlag(originCode) : '';
}

function buildPriceInsightLabel(
  listing: ModulePriceListing,
  bestAvailableNow: ModulePriceListing | null,
  cheapestKnown: ModulePriceListing | null
): string {
  const price = getListingPriceAmount(listing);
  if (price === null) {
    return '';
  }

  const bestAvailablePrice =
    bestAvailableNow ? getListingPriceAmount(bestAvailableNow) : null;

  if (bestAvailableNow && bestAvailablePrice !== null) {
    if (bestAvailableNow.listingId === listing.listingId) {
      return '';
    }

    if (!isModulePriceListingAvailableNow(listing) && price < bestAvailablePrice) {
      return `Save ${formatPricePercentDelta(bestAvailablePrice, price)} if available`;
    }

    if (isModulePriceListingAvailableNow(listing)) {
      return `+${formatPricePercentDelta(bestAvailablePrice, price)} vs best`;
    }

    return `+${formatPricePercentDelta(bestAvailablePrice, price)} vs best`;
  }

  const cheapestKnownPrice = cheapestKnown ? getListingPriceAmount(cheapestKnown) : null;

  if (!cheapestKnown || cheapestKnownPrice === null) {
    return '';
  }

  return cheapestKnown.listingId === listing.listingId
    ? 'Lowest listed'
    : `+${formatPricePercentDelta(cheapestKnownPrice, price)} vs low`;
}

function getPriceInsightClassForLabel(label: string): string {
  if (label === 'Best now' || label === 'Lowest listed') {
    return 'module-price-listing__insight--best';
  }

  if (label.startsWith('Save ')) {
    return 'module-price-listing__insight--opportunity';
  }

  if (label.startsWith('+')) {
    return 'module-price-listing__insight--premium';
  }

  return 'module-price-listing__insight--muted';
}

function buildPriceComparisonPoints(
  pricedListings: ModulePriceListing[],
  bestAvailableNowListing: ModulePriceListing | null
): ModulePriceComparisonPoint[] {
  if (pricedListings.length < 2) {
    return [];
  }

  const benchmarkListing = bestAvailableNowListing ?? pricedListings[0];
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

  return pricedListings.map(listing => {
    const normalizedPriceEurMinor = getListingPriceAmount(listing) ?? benchmarkPrice;

    return {
      listing,
      relation: getComparisonRelation(listing, benchmarkListing, benchmarkPrice),
      normalizedPriceEurMinor,
      widthPercent: getComparisonRailWidthPercent(normalizedPriceEurMinor, axisMin, axisMax)
    };
  });
}

function getComparisonRelation(
  listing: ModulePriceListing,
  benchmarkListing: ModulePriceListing,
  benchmarkPrice: number
): ModulePriceComparisonPoint['relation'] {
  if (listing.listingId === benchmarkListing.listingId) {
    return isModulePriceListingAvailableNow(listing) ? 'best' : 'same';
  }

  const price = getListingPriceAmount(listing);

  if (price === null || price === benchmarkPrice) {
    return 'same';
  }

  return price > benchmarkPrice ? 'above' : 'below';
}

function getComparisonRailWidthPercent(
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
