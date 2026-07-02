import { Component, Input } from '@angular/core';
import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import {
  buildModulePriceRegionFilterOptions,
  compareListingsByKnownPriceOnly,
  countryCodeToFlag,
  detectPreferredModulePriceContinent,
  filterAndOrderModulePriceListings,
  formatPricePercentDelta,
  getAvailableNowPriority,
  getKnownPriceListings,
  getListingPriceAmount,
  getRegionFilterResultLabel,
  getShippingOriginCode,
  groupModulePriceListingsByContinent,
  isModulePriceAvailabilityFilter,
  isModulePriceListingOrder,
  isModulePriceRegionFilter,
  MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS,
  MODULE_PRICE_AVAILABILITY_RESULT_LABELS,
  MODULE_PRICE_LISTING_ORDER_OPTIONS,
  MODULE_PRICE_ORDER_RESULT_LABELS,
  REGION_LABELS,
  regionDisplayNames,
  STORE_HERO_COLORS
} from './module-price-listings-card.utils';
import type {
  ModulePriceAvailabilityFilter,
  ModulePriceContinentCode,
  ModulePriceComparisonPoint,
  ModulePriceListingGroup,
  ModulePriceListingsDerivedState,
  ModulePriceListingOrder,
  ModulePriceRegionFilter
} from './module-price-listings-card.utils';

export {
  detectPreferredModulePriceContinent,
  filterAndOrderModulePriceListings,
  getContinentForRegionCode,
  getModulePriceAvailabilityGroup
} from './module-price-listings-card.utils';
export type {
  ModulePriceAvailabilityFilter,
  ModulePriceAvailabilityGroup,
  ModulePriceContinentCode,
  ModulePriceComparisonPoint,
  ModulePriceListingGroup,
  ModulePriceListingOrder,
  ModulePriceRegionFilter
} from './module-price-listings-card.utils';

@Component({
  selector: 'app-module-price-listings-card',
  templateUrl: './module-price-listings-card.component.html',
  styleUrls: ['./module-price-listings-card.component.scss'],
  standalone: false
})
export class ModulePriceListingsCardComponent {
  private _listings: ModulePriceListing[] | null | undefined;
  private derivedState: ModulePriceListingsDerivedState | null = null;

  @Input()
  set listings(value: ModulePriceListing[] | null | undefined) {
    this._listings = value;
    this.syncRegionFilterWithAvailableOptions();
    this.invalidateDerivedState();
  }

  get listings(): ModulePriceListing[] | null | undefined {
    return this._listings;
  }

  availabilityFilter: ModulePriceAvailabilityFilter = 'all';
  listingOrder: ModulePriceListingOrder = 'price_asc';
  preferredContinent: ModulePriceContinentCode = detectPreferredModulePriceContinent();
  regionFilter: ModulePriceRegionFilter = this.preferredContinent;

  readonly availabilityFilterOptions = MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS;
  readonly listingOrderOptions = MODULE_PRICE_LISTING_ORDER_OPTIONS;

  get hasListings(): boolean {
    return (this.listings?.length ?? 0) > 0;
  }

  get displayListings(): ModulePriceListing[] {
    return this.getDerivedState().displayListings;
  }

  get displayListingGroups(): ModulePriceListingGroup[] {
    return this.getDerivedState().displayListingGroups;
  }

  get regionFilterOptions(): ReadonlyArray<{value: ModulePriceRegionFilter; label: string}> {
    return this.getDerivedState().regionFilterOptions;
  }

  get priceComparisonPoints(): ModulePriceComparisonPoint[] {
    return this.getDerivedState().priceComparisonPoints;
  }

  get resultSummaryLabel(): string {
    return [
      MODULE_PRICE_AVAILABILITY_RESULT_LABELS[this.availabilityFilter],
      MODULE_PRICE_ORDER_RESULT_LABELS[this.listingOrder],
      getRegionFilterResultLabel(this.regionFilter, this.preferredContinent)
    ].join(', ');
  }

  setAvailabilityFilter(value: unknown): void {
    if (isModulePriceAvailabilityFilter(value) && this.availabilityFilter !== value) {
      this.availabilityFilter = value;
      this.syncRegionFilterWithAvailableOptions();
      this.invalidateDerivedState();
    }
  }

  setListingOrder(value: unknown): void {
    if (isModulePriceListingOrder(value) && this.listingOrder !== value) {
      this.listingOrder = value;
      this.invalidateDerivedState();
    }
  }

  setRegionFilter(value: unknown): void {
    if (isModulePriceRegionFilter(value) && this.regionFilter !== value) {
      this.regionFilter = value;
      this.invalidateDerivedState();
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
    return this.getDerivedState().bestAvailableNowListing;
  }

  getPriceInsightLabel(listing: ModulePriceListing): string {
    return this.getDerivedState().priceInsightLabelByListingId.get(listing.listingId) ?? '';
  }

  private buildPriceInsightLabel(
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

      if (!this.isAvailableNow(listing) && price < bestAvailablePrice) {
        return `Save ${formatPricePercentDelta(bestAvailablePrice, price)} if available`;
      }

      if (this.isAvailableNow(listing)) {
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

  getPriceInsightClass(listing: ModulePriceListing): string {
    return this.getDerivedState().priceInsightClassByListingId.get(listing.listingId)
      ?? 'module-price-listing__insight--muted';
  }

  private getPriceInsightClassForLabel(label: string): string {
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

  isBestAvailableNowListing(listing: ModulePriceListing): boolean {
    return this.getDerivedState().bestAvailableNowListing?.listingId === listing.listingId;
  }

  getShippingOriginLabel(listing: ModulePriceListing): string {
    const originCode = getShippingOriginCode(listing);
    if (!originCode) {
      return '';
    }

    const originName =
      REGION_LABELS[originCode] ?? regionDisplayNames?.of(originCode) ?? originCode;

    return originName;
  }

  getShippingOriginFlag(listing: ModulePriceListing): string {
    const originCode = getShippingOriginCode(listing);
    return originCode ? countryCodeToFlag(originCode) : '';
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
    return this.getDerivedState().priceComparisonPointByListingId.get(listing.listingId) ?? null;
  }

  private getDerivedState(): ModulePriceListingsDerivedState {
    if (this.derivedState) {
      return this.derivedState;
    }

    const displayListings = filterAndOrderModulePriceListings(
      this.listings ?? [],
      this.availabilityFilter,
      this.listingOrder,
      this.regionFilter,
      this.preferredContinent
    );
    const displayListingGroups = groupModulePriceListingsByContinent(displayListings);
    const regionFilterOptions = buildModulePriceRegionFilterOptions(
      this.listings ?? [],
      this.availabilityFilter,
      this.preferredContinent
    );
    const knownPriceListings = getKnownPriceListings(displayListings)
      .sort(compareListingsByKnownPriceOnly);
    const bestAvailableNowListing = knownPriceListings
      .filter(listing => this.isAvailableNow(listing))[0] ?? null;
    const cheapestKnownListing = knownPriceListings[0] ?? null;
    const priceComparisonPoints = this.buildPriceComparisonPoints(
      knownPriceListings,
      bestAvailableNowListing
    );
    const priceComparisonPointByListingId = new Map(
      priceComparisonPoints.map(point => [point.listing.listingId, point])
    );
    const priceInsightLabelByListingId = new Map(
      displayListings.map(listing => [
        listing.listingId,
        this.buildPriceInsightLabel(
          listing,
          bestAvailableNowListing,
          cheapestKnownListing
        )
      ])
    );
    const priceInsightClassByListingId = new Map(
      displayListings.map(listing => [
        listing.listingId,
        this.getPriceInsightClassForLabel(
          priceInsightLabelByListingId.get(listing.listingId) ?? ''
        )
      ])
    );

    this.derivedState = {
      displayListings,
      displayListingGroups,
      regionFilterOptions,
      priceComparisonPoints,
      priceComparisonPointByListingId,
      bestAvailableNowListing,
      cheapestKnownListing,
      priceInsightLabelByListingId,
      priceInsightClassByListingId
    };

    return this.derivedState;
  }

  private buildPriceComparisonPoints(
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
        relation: this.getComparisonRelation(listing, benchmarkListing, benchmarkPrice),
        normalizedPriceEurMinor,
        widthPercent: this.getComparisonRailWidthPercent(
          normalizedPriceEurMinor,
          axisMin,
          axisMax
        )
      };
    });
  }

  private invalidateDerivedState(): void {
    this.derivedState = null;
  }

  private syncRegionFilterWithAvailableOptions(): void {
    if (this.regionFilter === 'all') {
      return;
    }

    const hasSelectedRegion = buildModulePriceRegionFilterOptions(
      this.listings ?? [],
      this.availabilityFilter,
      this.preferredContinent
    ).some(option => option.value === this.regionFilter);

    if (!hasSelectedRegion) {
      this.regionFilter = 'all';
    }
  }
}
