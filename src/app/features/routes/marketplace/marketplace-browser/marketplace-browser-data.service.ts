import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  merge,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  exhaustMap,
  map,
  shareReplay,
  takeUntil,
  tap
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { MarketplaceListing } from 'src/app/features/marketplace/marketplace-listing.utils';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  buildMarketplaceBrowseFacets,
  buildMarketplaceCardViewModel,
  conditionLabel,
  EMPTY_MARKETPLACE_BROWSE_FILTERS,
  effectiveMarketplaceSort,
  filterAndSortMarketplaceListings,
  isMarketplacePriceSort,
  marketplaceFilterChips,
  marketplacePriceControlsEnabled,
  marketplacePriceFilterHint,
  MarketplaceBrowseFilters,
  MarketplaceSortKey
} from 'src/app/features/marketplace/marketplace-view-models';
import {
  createMarketplaceBrowserFields,
  MARKETPLACE_SORT_OPTIONS,
  marketplaceOption
} from './marketplace-browser-fields.factory';
import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';

export interface MarketplaceBrowserViewModel {
  activeChips: ReturnType<typeof marketplaceFilterChips>;
  canReset: boolean;
  error: string | null;
  facets: ReturnType<typeof buildMarketplaceBrowseFacets>;
  filters: MarketplaceBrowseFilters;
  hasMore: boolean;
  listings: ReturnType<typeof buildMarketplaceCardViewModel>[];
  loading: boolean;
  loadingMore: boolean;
  priceControlsDisabled: boolean;
  priceFilterHint: string | null;
  resultCount: number;
  sort: MarketplaceSortKey;
  totalLoaded: number;
}

interface LoadResult {
  error: string | null;
  listings: MarketplaceListing[];
  reset: boolean;
}

@Injectable()
export class MarketplaceBrowserDataService extends SubManager {
  private readonly pageSize = 24;
  private nextFrom = 0;

  private readonly _filters$ = new BehaviorSubject<MarketplaceBrowseFilters>({...EMPTY_MARKETPLACE_BROWSE_FILTERS});
  private readonly _sort$ = new BehaviorSubject<MarketplaceSortKey>('newest');
  private readonly _listings$ = new BehaviorSubject<ReturnType<typeof buildMarketplaceCardViewModel>[]>([]);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _loadingMore$ = new BehaviorSubject<boolean>(false);
  private readonly _hasMore$ = new BehaviorSubject<boolean>(true);
  private readonly _error$ = new BehaviorSubject<string | null>(null);

  readonly filters$ = this._filters$.asObservable();
  readonly sort$ = this._sort$.asObservable();
  readonly facets$ = this._listings$.pipe(
    map(listings => buildMarketplaceBrowseFacets(listings)),
    shareReplay({bufferSize: 1, refCount: true})
  );
  readonly canReset$ = combineLatest([this._filters$, this._sort$]).pipe(
    map(([filters, sort]) => marketplaceFilterChips(filters).length > 0 || sort !== 'newest'),
    distinctUntilChanged(),
    shareReplay({bufferSize: 1, refCount: true})
  );
  readonly fields = createMarketplaceBrowserFields({facets$: this.facets$});
  readonly load$ = new Subject<void>();
  readonly loadMore$ = new Subject<void>();
  readonly resetFilters$ = new Subject<void>();
  readonly setFilter$ = new Subject<{key: keyof MarketplaceBrowseFilters; value: string}>();
  readonly setSort$ = new Subject<MarketplaceSortKey>();
  readonly vm$ = merge(
    this._filters$,
    this._sort$,
    this._listings$,
    this._loading$,
    this._loadingMore$,
    this._hasMore$,
    this._error$
  ).pipe(
    map(() => this.buildVm())
  );

  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar
  ) {
    super();
    this.syncFieldsFromState();
    this.initializeFilterHandlers();
    this.initializeFieldHandlers();
    this.initializeLoadHandler();
  }

  private initializeFilterHandlers(): void {
    this.setFilter$.pipe(
      tap(({key, value}) => this.applyFilterValue(key, value)),
      takeUntil(this.destroy$)
    ).subscribe();

    this.setSort$.pipe(
      tap(sort => this.applySortValue(sort)),
      takeUntil(this.destroy$)
    ).subscribe();

    this.resetFilters$.pipe(
      tap(() => {
        this._filters$.next({...EMPTY_MARKETPLACE_BROWSE_FILTERS});
        this._sort$.next('newest');
        this.syncFieldsFromState();
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private initializeFieldHandlers(): void {
    this.fields.query.control.valueChanges.pipe(
      distinctUntilChanged(),
      tap(value => this.setFilter$.next({key: 'query', value})),
      takeUntil(this.destroy$)
    ).subscribe();

    this.fields.manufacturer.control.valueChanges.pipe(
      map(value => selectedId(value)),
      distinctUntilChanged(),
      tap(value => this.setFilter$.next({key: 'manufacturer', value})),
      takeUntil(this.destroy$)
    ).subscribe();

    this.fields.condition.control.valueChanges.pipe(
      map(value => selectedId(value)),
      distinctUntilChanged(),
      tap(value => this.setFilter$.next({key: 'condition', value})),
      takeUntil(this.destroy$)
    ).subscribe();

    this.fields.currency.control.valueChanges.pipe(
      map(value => selectedId(value)),
      distinctUntilChanged(),
      tap(value => this.setFilter$.next({key: 'currency', value})),
      takeUntil(this.destroy$)
    ).subscribe();

    this.fields.minPrice.control.valueChanges.pipe(
      distinctUntilChanged(),
      tap(value => this.setFilter$.next({key: 'minPrice', value})),
      takeUntil(this.destroy$)
    ).subscribe();

    this.fields.maxPrice.control.valueChanges.pipe(
      distinctUntilChanged(),
      tap(value => this.setFilter$.next({key: 'maxPrice', value})),
      takeUntil(this.destroy$)
    ).subscribe();

    this.fields.shipsFromCountry.control.valueChanges.pipe(
      map(value => selectedId(value)),
      distinctUntilChanged(),
      tap(value => this.setFilter$.next({key: 'shipsFromCountry', value})),
      takeUntil(this.destroy$)
    ).subscribe();

    this.fields.shippingOption.control.valueChanges.pipe(
      map(value => selectedId(value)),
      distinctUntilChanged(),
      tap(value => this.setFilter$.next({key: 'shippingOption', value})),
      takeUntil(this.destroy$)
    ).subscribe();

    this.fields.sort.control.valueChanges.pipe(
      map(value => selectedId(value) as MarketplaceSortKey),
      distinctUntilChanged(),
      tap(value => this.setSort$.next(value || 'newest')),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private initializeLoadHandler(): void {
    merge(
      this.load$.pipe(map(() => true)),
      this.loadMore$.pipe(map(() => false))
    ).pipe(
      exhaustMap(reset => {
        if (!reset && !this._hasMore$.value) {
          return EMPTY;
        }

        const from = reset ? 0 : this.nextFrom;
        const to = from + this.pageSize - 1;
        this._error$.next(null);
        this._loading$.next(reset);
        this._loadingMore$.next(!reset);

        return this.backend.GET.activeMarketplaceListings(from, to).pipe(
          map(listings => ({error: null, listings, reset}) as LoadResult),
          catchError(error => {
            const message = this.errorMessage(error);
            SharedConstants.errorCustom(this.snackBar, message);
            return of({error: message, listings: [], reset} as LoadResult);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => this.applyLoadResult(result));
  }

  private applyLoadResult(result: LoadResult): void {
    this._loading$.next(false);
    this._loadingMore$.next(false);

    if (result.error) {
      this._error$.next(result.error);
      return;
    }

    const mapped = result.listings.map(listing => buildMarketplaceCardViewModel(listing));
    const nextListings = result.reset ? mapped : [...this._listings$.value, ...mapped];
    this._listings$.next(nextListings);
    this.nextFrom = nextListings.length;
    this._hasMore$.next(result.listings.length === this.pageSize);
  }

  private buildVm(): MarketplaceBrowserViewModel {
    const filters = this._filters$.value;
    const sort = effectiveMarketplaceSort(this._sort$.value, filters);
    const allListings = this._listings$.value;
    const activeChips = marketplaceFilterChips(filters);
    const listings = filterAndSortMarketplaceListings(allListings, filters, sort);
    const priceControlsDisabled = !marketplacePriceControlsEnabled(filters);

    return {
      activeChips,
      canReset: activeChips.length > 0 || sort !== 'newest',
      error: this._error$.value,
      facets: buildMarketplaceBrowseFacets(allListings),
      filters,
      hasMore: this._hasMore$.value,
      listings,
      loading: this._loading$.value,
      loadingMore: this._loadingMore$.value,
      priceControlsDisabled,
      priceFilterHint: marketplacePriceFilterHint(filters),
      resultCount: listings.length,
      sort,
      totalLoaded: allListings.length
    };
  }

  private applyFilterValue(key: keyof MarketplaceBrowseFilters, value: string): void {
    const currentFilters = this._filters$.value;
    if ((key === 'minPrice' || key === 'maxPrice') && !marketplacePriceControlsEnabled(currentFilters)) {
      return;
    }

    const nextFilters: MarketplaceBrowseFilters = {
      ...currentFilters,
      [key]: value
    };

    if (key === 'currency' && !value) {
      nextFilters.minPrice = '';
      nextFilters.maxPrice = '';
      if (isMarketplacePriceSort(this._sort$.value)) {
        this._sort$.next('newest');
      }
    }

    this._filters$.next(nextFilters);
    this.syncFieldsFromState(nextFilters, this._sort$.value);
  }

  private applySortValue(sort: MarketplaceSortKey): void {
    const nextSort = effectiveMarketplaceSort(sort, this._filters$.value);
    this._sort$.next(nextSort);
    this.syncFieldsFromState(this._filters$.value, nextSort);
  }

  private syncFieldsFromState(
    filters: MarketplaceBrowseFilters = this._filters$.value,
    sort: MarketplaceSortKey = this._sort$.value
  ): void {
    const patchOptions = {emitEvent: false};
    this.fields.query.control.patchValue(filters.query, patchOptions);
    this.fields.manufacturer.control.patchValue(optionForFilter(filters.manufacturer, 'All manufacturers'), patchOptions);
    this.fields.condition.control.patchValue(optionForFilter(filters.condition, 'Any condition', conditionLabel(filters.condition)), patchOptions);
    this.fields.currency.control.patchValue(optionForFilter(filters.currency, 'All currencies'), patchOptions);
    this.fields.minPrice.control.patchValue(filters.minPrice, patchOptions);
    this.fields.maxPrice.control.patchValue(filters.maxPrice, patchOptions);
    this.fields.shipsFromCountry.control.patchValue(optionForFilter(filters.shipsFromCountry, 'All countries / global'), patchOptions);
    this.fields.shippingOption.control.patchValue(optionForFilter(filters.shippingOption, 'Any shipping option'), patchOptions);
    this.fields.sort.control.patchValue(
      MARKETPLACE_SORT_OPTIONS.find(option => option.id === sort) ?? MARKETPLACE_SORT_OPTIONS[0],
      patchOptions
    );

    if (marketplacePriceControlsEnabled(filters)) {
      this.fields.minPrice.control.enable(patchOptions);
      this.fields.maxPrice.control.enable(patchOptions);
    } else {
      this.fields.minPrice.control.disable(patchOptions);
      this.fields.maxPrice.control.disable(patchOptions);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error && error.message
      ? error.message
      : 'Marketplace listings could not be loaded.';
  }
}

function selectedId(value: ISelectable | null | undefined): string {
  return value?.id ?? '';
}

function optionForFilter(id: string, emptyName: string, name = id): ISelectable {
  return id ? marketplaceOption(id, name) : marketplaceOption('', emptyName);
}
