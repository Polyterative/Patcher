import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  formatEstimatedModulePriceMinorUnits,
  getEstimatedModulePriceCurrencyFractionDigits
} from 'src/app/features/backend/module-price-estimated-fx.utils';
import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import {
  buildModulePriceRegionFilterOptions,
  detectPreferredModulePriceContinent,
  filterAndOrderModulePriceListings,
  getModulePriceFreshnessIso,
  getRegionFilterResultLabel,
  getStoreHeroColor,
  isModulePriceAvailabilityFilter,
  isModulePriceListingOrder,
  isModulePriceListingStale,
  isModulePriceRegionFilter,
  MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS,
  MODULE_PRICE_AVAILABILITY_RESULT_LABELS,
  MODULE_PRICE_LISTING_ORDER_OPTIONS,
  MODULE_PRICE_ORDER_RESULT_LABELS,
  type ModulePriceAvailabilityFilter,
  type ModulePriceContinentCode,
  type ModulePriceComparisonPoint,
  type ModulePriceListingGroup,
  type ModulePriceListingsDerivedState,
  type ModulePriceListingOrder,
  type ModulePriceRegionFilter
} from './module-price-listings-card.utils';
import {
  buildModulePriceListingsDerivedState,
  getModulePriceAvailabilityClass,
  getModulePriceAvailabilityLabel,
  getModulePriceShippingOriginFlag,
  getModulePriceShippingOriginLabel,
  isModulePriceListingAvailableNow
} from './module-price-listings-card-display.utils';

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

export type ModulePriceListingPricePartKind = 'amount' | 'currency' | 'text';

export interface ModulePriceListingPricePart {
  kind: ModulePriceListingPricePartKind;
  value: string;
}

@Component({
  selector: 'app-module-price-listings-card',
  templateUrl: './module-price-listings-card.component.html',
  styleUrls: ['./module-price-listings-card.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePriceListingsCardComponent {
  private _listings: ModulePriceListing[] | null | undefined;
  private derivedState: ModulePriceListingsDerivedState | null = null;
  private readonly pricePartFormatterByCurrency = new Map<string, Intl.NumberFormat>();

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
    if (this.isStaleListing(listing)) {
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

  formatPriceParts(listing: ModulePriceListing): ReadonlyArray<ModulePriceListingPricePart> {
    const displayPrice = this.formatPrice(listing);
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

    const formatter = this.getPricePartFormatter(normalizedCurrency);
    if (!formatter) {
      return [{kind: 'text', value: displayPrice}];
    }

    const parts = formatter
      .formatToParts(sourceMajorAmount)
      .map(part => ({
        kind: part.type === 'currency' ? 'currency' : 'amount',
        value: part.value
      } satisfies ModulePriceListingPricePart));

    return this.mergeAdjacentPriceParts(parts);
  }

  getAvailabilityLabel(listing: ModulePriceListing): string {
    if (this.isStaleListing(listing)) {
      return 'Stale data';
    }

    return getModulePriceAvailabilityLabel(listing);
  }

  getAvailabilityClass(listing: ModulePriceListing): string {
    if (this.isStaleListing(listing)) {
      return 'module-price-listing__availability--stale';
    }

    return getModulePriceAvailabilityClass(listing);
  }

  isAvailableNow(listing: ModulePriceListing): boolean {
    return isModulePriceListingAvailableNow(listing);
  }

  isStaleListing(listing: ModulePriceListing): boolean {
    return isModulePriceListingStale(listing);
  }

  getFreshnessIso(listing: ModulePriceListing): string | null {
    return getModulePriceFreshnessIso(listing);
  }

  getStoreHeroColor(listing: ModulePriceListing): string {
    return getStoreHeroColor(listing.storeSlug);
  }

  getBestAvailableNowListing(): ModulePriceListing | null {
    return this.getDerivedState().bestAvailableNowListing;
  }

  getPriceInsightLabel(listing: ModulePriceListing): string {
    return this.getDerivedState().priceInsightLabelByListingId.get(listing.listingId) ?? '';
  }

  getPriceInsightClass(listing: ModulePriceListing): string {
    return this.getDerivedState().priceInsightClassByListingId.get(listing.listingId)
      ?? 'module-price-listing__insight--muted';
  }

  isBestAvailableNowListing(listing: ModulePriceListing): boolean {
    return this.getDerivedState().bestAvailableNowListing?.listingId === listing.listingId;
  }

  getShippingOriginLabel(listing: ModulePriceListing): string {
    return getModulePriceShippingOriginLabel(listing);
  }

  getShippingOriginFlag(listing: ModulePriceListing): string {
    return getModulePriceShippingOriginFlag(listing);
  }

  getPriceComparisonPoint(listing: ModulePriceListing): ModulePriceComparisonPoint | null {
    return this.getDerivedState().priceComparisonPointByListingId.get(listing.listingId) ?? null;
  }

  private getDerivedState(): ModulePriceListingsDerivedState {
    if (this.derivedState) {
      return this.derivedState;
    }

    this.derivedState = buildModulePriceListingsDerivedState({
      listings: this.listings ?? [],
      availabilityFilter: this.availabilityFilter,
      listingOrder: this.listingOrder,
      regionFilter: this.regionFilter,
      preferredContinent: this.preferredContinent
    });

    return this.derivedState;
  }

  private invalidateDerivedState(): void {
    this.derivedState = null;
  }

  private syncRegionFilterWithAvailableOptions(): void {
    if (this.regionFilter === 'all') {
      return;
    }

    const listings = this.listings ?? [];
    if (listings.length === 0) {
      return;
    }

    const hasSelectedRegion = buildModulePriceRegionFilterOptions(
      listings,
      this.availabilityFilter,
      this.preferredContinent
    ).some(option => option.value === this.regionFilter);

    if (!hasSelectedRegion) {
      this.regionFilter = 'all';
    }
  }

  private mergeAdjacentPriceParts(
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

  private getPricePartFormatter(normalizedCurrency: string): Intl.NumberFormat | null {
    const cachedFormatter = this.pricePartFormatterByCurrency.get(normalizedCurrency);
    if (cachedFormatter) {
      return cachedFormatter;
    }

    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: normalizedCurrency,
        currencyDisplay: 'narrowSymbol'
      });
      this.pricePartFormatterByCurrency.set(normalizedCurrency, formatter);
      return formatter;
    } catch {
      return null;
    }
  }
}
