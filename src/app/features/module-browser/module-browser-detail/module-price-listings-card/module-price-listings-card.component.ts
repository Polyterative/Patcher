import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import {
  buildModulePriceRegionFilterOptions,
  detectPreferredModulePriceContinent,
  filterAndOrderModulePriceListings,
  getRegionFilterResultLabel,
  isModulePriceAvailabilityFilter,
  isModulePriceListingOrder,
  isModulePriceRegionFilter,
  MODULE_PRICE_AVAILABILITY_FILTER_OPTIONS,
  MODULE_PRICE_AVAILABILITY_RESULT_LABELS,
  MODULE_PRICE_LISTING_ORDER_OPTIONS,
  MODULE_PRICE_ORDER_RESULT_LABELS,
  type ModulePriceAvailabilityFilter,
  type ModulePriceContinentCode,
  type ModulePriceComparisonPoint,
  type ModulePriceListingGroup,
  type ModulePriceListingPricePart,
  type ModulePriceListingRowView,
  type ModulePriceListingsDerivedState,
  type ModulePriceListingOrder,
  type ModulePriceRegionFilter
} from './module-price-listings-card.utils';
import {
  buildModulePriceListingRowView,
  buildModulePriceListingsDerivedState
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
  ModulePriceListingPricePart,
  ModulePriceListingPricePartKind,
  ModulePriceRegionFilter
} from './module-price-listings-card.utils';

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
    const priceParts = this.getRowView(listing).priceParts;
    return priceParts.map(part => part.value).join('');
  }

  formatPriceParts(listing: ModulePriceListing): ReadonlyArray<ModulePriceListingPricePart> {
    return this.getRowView(listing).priceParts;
  }

  getAvailabilityLabel(listing: ModulePriceListing): string {
    return this.getRowView(listing).availabilityLabel;
  }

  getAvailabilityClass(listing: ModulePriceListing): string {
    return this.getRowView(listing).availabilityClass;
  }

  isAvailableNow(listing: ModulePriceListing): boolean {
    return this.getRowView(listing).isAvailableNow;
  }

  isStaleListing(listing: ModulePriceListing): boolean {
    return this.getRowView(listing).isStale;
  }

  getFreshnessIso(listing: ModulePriceListing): string | null {
    return this.getRowView(listing).freshnessIso;
  }

  getStoreHeroColor(listing: ModulePriceListing): string {
    return this.getRowView(listing).storeHeroColor;
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
    return this.getRowView(listing).isBestAvailableNow;
  }

  getShippingOriginLabel(listing: ModulePriceListing): string {
    return this.getRowView(listing).shippingOriginLabel;
  }

  getShippingOriginFlag(listing: ModulePriceListing): string {
    return this.getRowView(listing).shippingOriginFlag;
  }

  getPriceComparisonPoint(listing: ModulePriceListing): ModulePriceComparisonPoint | null {
    return this.getDerivedState().priceComparisonPointByListingId.get(listing.listingId) ?? null;
  }

  private getRowView(listing: ModulePriceListing): ModulePriceListingRowView {
    const derivedState = this.getDerivedState();
    // Prefer the memoized per-listing view built for the current
    // `listings` input (avoids recomputation on every CD cycle for
    // template-driven reads). Fall back to computing it directly for
    // listings outside the current input (e.g. direct/unit-test calls) so
    // these methods remain correct pure functions of any listing.
    return derivedState.rowViewByListingId.get(listing.listingId)
      ?? buildModulePriceListingRowView(listing, derivedState.bestAvailableNowListing);
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
}
