import {
  DestroyRef,
  Injectable
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  merge,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  skip,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MinimalModule,
  UserModulePossessionKind
} from '../../models/module';
import { Tag, TagSuggestionGroup } from '../../models/tag';
import { getCleanedValueId, isPendingAutocompleteValue } from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { SupabaseService } from '../backend/supabase.service';
import { UserManagementService } from '../backbone/login/user-management.service';
import {
  ModuleBrowserFields,
  ModuleList,
  ModuleOrderOption
} from './module-browser-data.models';
import {
  DEFAULT_HP_CONDITION,
  DEFAULT_STANDARD,
  OWNED_MODE_DEFAULT_ORDER
} from './module-browser-data.constants';
import {
  matchesSelectedTags,
  toSortDirection
} from './module-browser-data.utils';
import { AnalyticsService } from '../backbone/analytics-integration/analytics.service';
import { recoverBrowserListRequest } from '../browser-data-recovery';
import { ModuleRecentMarketPrice } from '../backend/supabase-queries';
import { createModuleBrowserFields } from './module-browser-fields.factory';
import type { ModulePossessionDialogResult } from 'src/app/components/module-parts/module-possession-dialog/module-possession-dialog.component';
import {
  getMeaningfulAcquisitionDraft,
  getPossessionRequestKind,
  possessionKindLabel
} from 'src/app/components/module-parts/module-detail-data.helpers';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  filterOwnedModulesForFields,
  filterWantedModulesForFields,
  getActiveFilterNames,
  getSelectedTagIdsFromFields,
  groupFilterTags,
  hasActiveModuleFiltersForFields,
  hasActivePriceFilterForFields,
  hasResettableModuleFilters,
  isOwnedPossessionForModule,
  isPriceOrderOption,
  isWantedPossessionForModule,
  matchesPriceRange,
  normalizePriceRange,
  parsePriceBoundary,
  sortModulesByBestMatchForTags,
  sortModulesByPrice,
  toggleTagSelection
} from './module-browser-filter.helpers';

export type { ModuleList, ModuleOrderOption } from './module-browser-data.models';

type BrowserUserModule = Pick<MinimalModule, 'id' | 'possessionKind'>;
type BrowserModulePossessionRequest = UserModulePossessionKind | ModulePossessionDialogResult | null;
type BrowserModulePossessionWrite = {
  module: MinimalModule;
  request: BrowserModulePossessionRequest;
};
type BrowserModulePossessionWriteResult = {
  module: MinimalModule;
  kind: UserModulePossessionKind | null;
};
type BrowserUserModulesRefreshSource = 'auth' | 'refresh';

function getSortedModuleIds(data: ReadonlyArray<MinimalModule>): number[] {
  return [...new Set(
    data
      .map(module => module.id)
      .filter(id => Number.isFinite(id) && id > 0)
  )].sort((first, second) => first - second);
}


@Injectable()
export class ModuleBrowserDataService extends SubManager {
  readonly modulesList$ = new BehaviorSubject<ModuleList>(null);
  readonly userModulesList$ = new BehaviorSubject<BrowserUserModule[]>([]);
  readonly isLoggedIn$: Observable<boolean>;
  readonly remoteTagFilterLoading$ = new BehaviorSubject<boolean>(false);
  readonly tagMatchMode$ = new BehaviorSubject<'OR' | 'AND'>('OR');
  readonly tagSearchQuery$ = new BehaviorSubject<string>('');
  readonly updateModulesList$ = new Subject<void>();
  readonly setModulePossession$ = new Subject<BrowserModulePossessionWrite>();
  readonly loadMore$ = new Subject<void>();
  readonly moduleFilterInteraction$ = new Subject<void>();
  readonly modulesLoadingTrigger$ = merge(
    this.moduleFilterInteraction$,
    this.updateModulesList$
  );
  readonly resetForm$ = new Subject<void>();
  readonly paginatorToFistPage$ = new Subject<void>();
  /**
   * Price Hub summaries keyed by module id, merged across every fetch.
   * Feeds the min/max price filter (whole-EUR bounds match against
   * `estimatedPriceEurMinor`) and the price-slider ceiling. Reads ride the
   * existing `priceHubRecentModuleMarketPrices` cache entry, so the
   * module-list display fetch for the same ids stays a cache hit.
   */
  readonly priceSummaryByModuleId$ = new BehaviorSubject<ReadonlyMap<number, ModuleRecentMarketPrice>>(new Map());
  /**
   * Emitted (debounced) when only the price bounds change. Unlike the other
   * filters this never refetches the server page — price lives outside
   * `GET.modules`, so listeners re-apply the range locally instead.
   * Deliberately separate from `moduleFilterInteraction$`: that stream drives
   * the results loading indicator, which must not spin with no fetch behind it.
   */
  readonly priceFilterChanged$ = new Subject<void>();
  /**
   * Lets embedding contexts suspend price auto-fill while the server page
   * is not the visible dataset (owned / wanted / available collection
   * modes filter fully client-side datasets — paginating the server page
   * behind them would only burn traffic and flash the loader).
   */
  readonly suspendPriceAutoFill$ = new BehaviorSubject<boolean>(false);
  /** True while a price auto-fill page is in flight (drives Load more visibility). */
  readonly priceAutoFillInFlight$ = new BehaviorSubject<boolean>(false);
  /**
   * Opts modules without Price Hub data back into a bounded price filter.
   * Meaningless (and ignored) without bounds — the matcher short-circuits
   * before consulting it — so it never counts as an active filter alone.
   */
  readonly includeUnpriced$ = new BehaviorSubject<boolean>(false);
  /** Whether any price bound is currently set (drives the toggle visibility). */
  readonly priceFilterActive$ = new BehaviorSubject<boolean>(false);

  readonly serversideTableRequestData = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(25),
    filter$: new BehaviorSubject<string>(''),
    sort$: new BehaviorSubject<[string, string]>(['updated', 'desc'])
  };

  readonly serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0)
  };

  readonly orderStartingValue: ModuleOrderOption = {id: 'updated', name: 'Updated ↓'};
  readonly ownedModeOrderStartingValue: ModuleOrderOption = OWNED_MODE_DEFAULT_ORDER;
  readonly bestMatchOrderOption: ModuleOrderOption = {id: 'best-match', name: 'Best match'};
  readonly allTags$: Observable<Tag[]>;
  readonly groupedFilterTags$: Observable<TagSuggestionGroup[]>;
  readonly fields: ModuleBrowserFields;
  readonly canReset$: Observable<boolean>;
  private readonly refreshUserModulesList$ = new Subject<void>();
  private searchPerformedPending = false;
  private hasKnownUserModulesList = false;
  private userModulesOwnerId: string | null = null;
  /**
   * Ids already asked from Price Hub (even when they came back without data).
   * Modules without listings would otherwise refetch forever: every empty
   * response merges nothing, but a naive map emission still re-triggers the
   * sync that requested them.
   */
  private readonly priceSummariesRequestedIds = new Set<number>();
  /** Number of raw (server) rows fetched so far, independent of any local AND-tag filtering. */
  private fetchedRawCount = 0;
  /** Raw rows in the most recent server response; zero stops price auto-fill (server exhausted in practice). */
  private lastResponseRawCount = 0;

  constructor(
    private backend: SupabaseService,
    private analytics: AnalyticsService,
    private snackBar: MatSnackBar,
    private userService: UserManagementService,
    destroyRef?: DestroyRef
  ) {
    super(destroyRef);
    this.backend.cacheResetter$?.next(['manufacturers']);
    this.isLoggedIn$ = this.userService.loggedUser$.pipe(
      map(user => !!user),
      distinctUntilChanged(),
      shareReplay(1),
      this.takeUntilDestroyed()
    );

    this.allTags$ = this.backend.get.allTags().pipe(
      startWith([]),
      shareReplay(1),
      this.takeUntilDestroyed()
    );

    this.groupedFilterTags$ = combineLatest([
      this.allTags$,
      this.tagSearchQuery$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(this.tagSearchQuery$.value)
      )
    ]).pipe(
      map(([tags, query]) => groupFilterTags(tags, query)),
      shareReplay(1),
      this.takeUntilDestroyed()
    );

    this.fields = createModuleBrowserFields({
      allTags$: this.allTags$,
      backend: this.backend,
      bestMatchOrderOption: this.bestMatchOrderOption,
      orderStartingValue: this.orderStartingValue,
      takeUntilDestroyed: <T>() => this.takeUntilDestroyed<T>()
    });

    // Sync tagSearch control ↔ tagSearchQuery$
    this.fields.tagSearch.control.valueChanges
      .pipe(this.takeUntilDestroyed())
      .subscribe(query => this.tagSearchQuery$.next(query));

    this.canReset$ = merge(
      this.fields.name.control.valueChanges,
      this.fields.description.control.valueChanges,
      this.fields.manufacturers.control.valueChanges,
      this.fields.hp.control.valueChanges,
      this.fields.depth.control.valueChanges,
      this.fields.priceMin.control.valueChanges,
      this.fields.priceMax.control.valueChanges,
      this.fields.hpCondition.control.valueChanges,
      this.fields.standard.control.valueChanges,
      this.fields.order.control.valueChanges,
      this.fields.tags.control.valueChanges,
      this.tagMatchMode$
    ).pipe(
      startWith(null),
      map(() => hasResettableModuleFilters(
        this.fields,
        this.orderStartingValue.id,
        this.tagMatchMode$.value
      )),
      distinctUntilChanged(),
      shareReplay(1)
    );

    merge(
      this.userService.loggedUser$.pipe(map((): BrowserUserModulesRefreshSource => 'auth')),
      this.refreshUserModulesList$.pipe(map((): BrowserUserModulesRefreshSource => 'refresh'))
    )
      .pipe(
        switchMap(refreshSource => this.userService.loggedUser$.pipe(
          take(1),
          map(user => ({refreshSource, user}))
        )),
        switchMap(({refreshSource, user}) => {
          if (!user) {
            this.userModulesOwnerId = null;
            this.hasKnownUserModulesList = false;
            return of([]);
          }

          if (this.userModulesOwnerId !== user.id) {
            this.userModulesOwnerId = user.id;
            this.hasKnownUserModulesList = false;
          }

          const preserveCurrentOnError = refreshSource === 'refresh' || this.hasKnownUserModulesList;
          return this.backend.GET.currentUserModulesPossessionOnly().pipe(
            tap(() => this.hasKnownUserModulesList = true),
            catchError(error => {
              console.error('Failed to load module collection status:', error);
              SharedConstants.errorCustom(this.snackBar, 'Failed to load your collection status.');
              return of(preserveCurrentOnError ? this.userModulesList$.value : []);
            })
          );
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(userModules => this.userModulesList$.next(userModules));

    this.setModulePossession$
      .pipe(
        concatMap(write => this.userService.loggedUser$.pipe(
          take(1),
          switchMap(user => {
            if (!user) {
              SharedConstants.errorCustom(this.snackBar, 'Log in to add modules to your collection.');
              return EMPTY;
            }
            if (!write.module?.id) {
              SharedConstants.errorCustom(this.snackBar, 'Module could not be added to your collection.');
              return EMPTY;
            }
            return this.persistModulePossession$(write).pipe(
              catchError(error => {
                console.error('Failed to update module collection status:', error);
                SharedConstants.errorCustom(this.snackBar, 'Failed to update collection status — check your connection and try again.');
                return EMPTY;
              })
            );
          })
        )),
        this.takeUntilDestroyed()
      )
      .subscribe(({module, kind}) => {
        this.updateLocalUserModulePossession(module.id, kind);
        this.analytics.capture('module.collection_toggled', {
          module_id: module.id,
          state: kind === null ? 'removed' : 'added',
        });
        const message = kind === null
          ? `"${module.name}" removed from your collection.`
          : `"${module.name}" marked as ${possessionKindLabel(kind)}.`;
        SharedConstants.successCustom(this.snackBar, message);
        this.refreshUserModulesList$.next();
      });

    const filterControlChanges$ = merge(
      this.fields.name.control.valueChanges,
      this.fields.description.control.valueChanges,
      this.fields.manufacturers.control.valueChanges,
      this.fields.hp.control.valueChanges,
      this.fields.depth.control.valueChanges,
      this.fields.hpCondition.control.valueChanges,
      this.fields.standard.control.valueChanges
    );

    // Price bounds intentionally stay out of `filterControlChanges$`: they
    // never refetch the server page (see `priceFilterChanged$`). They apply
    // instantly to loaded results through the price-summary map instead.
    merge(
      this.fields.priceMin.control.valueChanges,
      this.fields.priceMax.control.valueChanges
    ).pipe(
      tap(() => this.markSearchPerformedPending()),
      debounceTime(750),
      this.takeUntilDestroyed()
    ).subscribe(() => {
      const activeFilters = getActiveFilterNames(this.fields);
      this.analytics.capture('search.filter_changed', {
        active_filters: activeFilters,
        active_filter_count: activeFilters.length,
        order: this.fields.order.control.value?.id,
      });
      const priceActive = hasActivePriceFilterForFields(this.fields);
      this.priceFilterActive$.next(priceActive);
      if (!priceActive && this.includeUnpriced$.value) {
        // No orphaned opt-ins: the toggle only ever means something with a
        // bound set, so clearing the last bound clears it too instead of
        // leaving invisible state for the next bound to inherit.
        this.includeUnpriced$.next(false);
      }
      this.priceFilterChanged$.next();
    });

    merge(
      filterControlChanges$.pipe(tap(() => this.markSearchPerformedPending())),
      this.fields.order.control.valueChanges
    ).pipe(
      tap(() => this.moduleFilterInteraction$.next()),
      debounceTime(750),
      this.takeUntilDestroyed()
    ).subscribe(() => {
      if (isPendingAutocompleteValue(this.fields.manufacturers.control)) {
        // The manufacturer field still holds a typed string that hasn't been
        // reconciled into a real option (see `resolveAutocompleteTypedValueOnBlur`).
        // Fetching now would silently drop the manufacturer filter (parseInt(NaN)
        // via `getCleanedValueId`) and show unfiltered results while the field
        // still visibly displays the typed text. Wait for blur/selection to
        // reconcile it - that patch emits its own valueChanges, which re-enters
        // this debounce with a resolved value.
        return;
      }

      const orderVal = this.fields.order.control.value;
      const nameVal = this.fields.name.control.value ?? '';
      const isBestMatchOrder = orderVal?.id === this.bestMatchOrderOption.id;
      // Price lives outside `GET.modules` (Price Hub join), so the server
      // keeps its default sort and the root component re-sorts the loaded
      // page client-side — same pattern as best-match.
      const isClientSortedOrder = isBestMatchOrder || isPriceOrderOption(orderVal);

      const activeFilters = getActiveFilterNames(this.fields);
      this.analytics.capture('search.filter_changed', {
        active_filters: activeFilters,
        active_filter_count: activeFilters.length,
        order: orderVal?.id,
      });

      this.serversideTableRequestData.filter$.next(nameVal);
      this.serversideTableRequestData.sort$.next([
        isClientSortedOrder ? this.orderStartingValue.id : (orderVal?.id ?? ''),
        isClientSortedOrder ? 'desc' : toSortDirection(orderVal?.name)
      ]);
      this.serversideTableRequestData.skip$.next(0);
      this.paginatorToFistPage$.next();
      this.updateModulesList$.next();
    });

    this.fields.tags.control.valueChanges
      .pipe(this.takeUntilDestroyed())
      .subscribe((selectedTags) => {
        const currentOrder = this.fields.order.control.value;
        const selectedCount = selectedTags?.length ?? 0;
        const orderChanged = selectedCount > 0 && currentOrder?.id === this.orderStartingValue.id
          || selectedCount === 0 && currentOrder?.id === this.bestMatchOrderOption.id;

        this.analytics.capture('search.tags_selected', {
          selected_count: selectedCount,
          order_changed: orderChanged,
        });

        this.markSearchPerformedPending();
        if (selectedCount > 0 && currentOrder?.id === this.orderStartingValue.id) {
          this.fields.order.control.setValue(this.bestMatchOrderOption);
        } else if (selectedCount === 0 && currentOrder?.id === this.bestMatchOrderOption.id) {
          this.fields.order.control.setValue(this.orderStartingValue);
        } else {
          this.moduleFilterInteraction$.next();
          this.updateModulesList$.next();
        }

        if (this.modulesList$.value !== null) {
          this.remoteTagFilterLoading$.next(true);
        }
      });

    this.tagMatchMode$
      .pipe(
        distinctUntilChanged(),
        skip(1),
        this.takeUntilDestroyed()
      )
      .subscribe(() => {
        const activeTags = this.getSelectedTagIds().length;
        this.analytics.capture('search.tag_match_mode_changed', {
          mode: this.tagMatchMode$.value,
          active_tags_count: activeTags,
        });
        this.markSearchPerformedPending();
        if (this.modulesList$.value !== null && activeTags > 0) {
          this.remoteTagFilterLoading$.next(true);
        }
        this.serversideTableRequestData.skip$.next(0);
        this.paginatorToFistPage$.next();
        this.updateModulesList$.next();
      });

    this.updateModulesList$
      .pipe(
        // Funnel-level safety net: never fetch while the manufacturer field
        // still holds an unreconciled typed string (see the debounce-subscribe
        // guard above for the primary path; this also covers tag/pagination
        // triggers that call `updateModulesList$.next()` directly).
        filter(() => !isPendingAutocompleteValue(this.fields.manufacturers.control)),
        switchMap(() => {
          const skip = this.serversideTableRequestData.skip$.value;
          const take = this.serversideTableRequestData.take$.value;
          const filter = this.serversideTableRequestData.filter$.value;
          const [sortCol, sortDir] = this.serversideTableRequestData.sort$.value;
          const standard = this.fields.standard.control.value?.id;
          const tagIds = this.getSelectedTagIds();
          const includeCount = skip === 0;
          const previousData = this.modulesList$.value ?? [];
          const previousCount = this.serversideAdditionalData.itemsCount$.value ?? previousData.length;

          return recoverBrowserListRequest(
            () => this.backend.GET.modules(
              skip,
              (skip + take) - 1,
              filter,
              sortCol || null,
              sortDir,
              parseInt(getCleanedValueId(this.fields.manufacturers.control)),
              parseInt(this.fields.hp.control.value),
              this.fields.hpCondition.control.value?.id,
              standard,
              this.fields.description.control.value,
              true,
              tagIds.length > 0 ? tagIds : undefined,
              includeCount,
              parseInt(this.fields.depth.control.value)
            ),
            {
              data: skip === 0 ? previousData : [],
              count: previousCount
            },
            '[module-browser] Failed to load modules list',
            {beforeRetry: () => this.backend.cacheResetter$.next(['modules'])}
          ).pipe(map(response => ({
            ...response,
            requestedSkip: skip,
            rawFetchedCount: response.data?.length ?? 0
          })));
        }),
        map((response) => {
          const selectedTagIds = this.getSelectedTagIds();
          let data = response.data ?? [];

          if (this.tagMatchMode$.value === 'AND' && selectedTagIds.length > 0) {
            data = data.filter((module) => matchesSelectedTags(module, selectedTagIds, 'AND'));
          }

          if (this.fields.order.control.value?.id === this.bestMatchOrderOption.id) {
            data = this.sortModulesByBestMatch(data);
          }

          return {
            ...response,
            data,
            count: this.tagMatchMode$.value === 'AND' && selectedTagIds.length > 0 && data.length === 0
              ? data.length
              : response.count
          };
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(response => {
        this.serversideAdditionalData.itemsCount$.next(
          response.count ?? this.serversideAdditionalData.itemsCount$.value
        );
        const skip = response.requestedSkip;
        const current = this.modulesList$.value ?? [];
        this.modulesList$.next(skip === 0 ? response.data : [...current, ...response.data]);
        this.fetchedRawCount = skip === 0 ? response.rawFetchedCount : this.fetchedRawCount + response.rawFetchedCount;
        this.lastResponseRawCount = response.rawFetchedCount;
        this.remoteTagFilterLoading$.next(false);

        if (skip === 0) {
          this.capturePendingSearchPerformed(response.count ?? response.data.length);
        }

        this.priceAutoFillInFlight$.next(false);
        this.maybeAutoFillPricePage();
      });

    // Keep a merged Price Hub summary map for every loaded page. The ids are
    // identical to the module-list display fetch, so both ride the same
    // `priceHubRecentModuleMarketPrices` cache entry instead of doubling traffic.
    // Already-known and already-requested ids are skipped: listings-less
    // modules come back empty and must not refetch on every emission.
    this.modulesList$
      .pipe(
        map(list => this.missingPriceSummaryIds(getSortedModuleIds(list ?? []))),
        distinctUntilChanged((previous, next) => previous.join(',') === next.join(',')),
        switchMap(missing => missing.length === 0
          ? of([])
          : this.fetchAndMarkPriceSummaries(missing)
        ),
        this.takeUntilDestroyed()
      )
      .subscribe(summaries => this.mergePriceSummaries(summaries));

    // Re-evaluate page fullness whenever fresh price data lands or the
    // bounds change: either can turn a short page into a fillable one.
    // Termination is structural (see `maybeAutoFillPricePage`).
    this.priceSummaryByModuleId$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => this.maybeAutoFillPricePage());

    this.priceFilterChanged$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => this.maybeAutoFillPricePage());

    this.includeUnpriced$
      .pipe(
        distinctUntilChanged(),
        skip(1),
        this.takeUntilDestroyed()
      )
      .subscribe(() => this.maybeAutoFillPricePage());

    this.loadMore$
      .pipe(
        withLatestFrom(this.modulesList$),
        this.takeUntilDestroyed()
      )
      .subscribe(([_, current]) => {
        this.analytics.capture('search.load_more', { loaded_count: current?.length ?? 0 });
        // Prefer the raw (unfiltered) fetched count so AND-tag filtering that shrinks the
        // displayed list doesn't cause requests to re-fetch already-seen rows; fall back to
        // the displayed list length if no request has gone through the service's own flow yet.
        this.serversideTableRequestData.skip$.next(this.fetchedRawCount || current?.length || 0);
        this.updateModulesList$.next();
      });

    this.resetForm$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.analytics.capture('search.filters_reset', {});
        this.backend.cacheResetter$.next(['modules']);
        const shouldTriggerManualReload = this.tagMatchMode$.value === 'OR';
        const silent = {emitEvent: false};
        this.fields.name.control.setValue('', silent);
        this.fields.description.control.setValue('', silent);
        this.fields.order.control.setValue(this.orderStartingValue, silent);
        this.fields.manufacturers.control.setValue('', silent);
        this.fields.hp.control.setValue('', silent);
        this.fields.depth.control.setValue('', silent);
        this.fields.priceMin.control.setValue('', silent);
        this.fields.priceMax.control.setValue('', silent);
        this.fields.hpCondition.control.setValue(DEFAULT_HP_CONDITION, silent);
        this.fields.standard.control.setValue(DEFAULT_STANDARD, silent);
        this.fields.tags.control.setValue([], silent);
        this.fields.tagSearch.control.setValue('', silent);
        this.includeUnpriced$.next(false);
        this.priceFilterActive$.next(false);
        this.tagSearchQuery$.next('');
        this.serversideTableRequestData.filter$.next('');
        this.serversideTableRequestData.sort$.next([this.orderStartingValue.id, 'desc']);
        this.serversideTableRequestData.skip$.next(0);
        this.paginatorToFistPage$.next();
        this.tagMatchMode$.next('OR');
        if (shouldTriggerManualReload) {
          this.updateModulesList$.next();
        }
      });
  }

  applyOwnedModeDefaultOrder(): void {
    const currentOrder = this.fields.order.control.value;
    if (currentOrder?.id === this.orderStartingValue.id) {
      this.fields.order.control.setValue(this.ownedModeOrderStartingValue);
    }
  }

  hasActiveModuleFilters(): boolean {
    return hasActiveModuleFiltersForFields(this.fields);
  }

  toggleTagFilter(tag: Tag): void {
    this.fields.tags.control.setValue(toggleTagSelection(this.fields.tags.control.value ?? [], tag));
  }

  filterOwnedModules(
    modules: MinimalModule[] | undefined,
    excludedModuleIds: number[] = []
  ): MinimalModule[] | undefined {
    return filterOwnedModulesForFields(
      modules,
      this.fields,
      this.tagMatchMode$.value,
      excludedModuleIds,
      this.getPriceEurMinorMap(),
      this.includeUnpriced$.value
    );
  }

  filterWantedModules(modules: MinimalModule[] | undefined): MinimalModule[] | undefined {
    return filterWantedModulesForFields(
      modules,
      this.fields,
      this.tagMatchMode$.value,
      this.getPriceEurMinorMap(),
      this.includeUnpriced$.value
    );
  }

  isOwnedPossession(module: MinimalModule): boolean {
    return isOwnedPossessionForModule(module);
  }

  isWantedPossession(module: MinimalModule): boolean {
    return isWantedPossessionForModule(module);
  }

  sortModulesByBestMatch(modules: MinimalModule[]): MinimalModule[] {
    return sortModulesByBestMatchForTags(modules, this.getSelectedTagIds());
  }

  sortModulesByPrice(modules: MinimalModule[]): MinimalModule[] {
    return sortModulesByPrice(modules, this.getPriceEurMinorMap(), toSortDirection(this.fields.order.control.value?.name));
  }

  private persistModulePossession$(
    write: BrowserModulePossessionWrite
  ): Observable<BrowserModulePossessionWriteResult> {
    const kind = getPossessionRequestKind(write.request);
    if (kind === null) {
      return this.backend.delete.userModule(write.module.id).pipe(
        map(() => ({module: write.module, kind}))
      );
    }

    return this.backend.update.userModulePossession(write.module.id, kind).pipe(
      switchMap(() => {
        const acquisition = getMeaningfulAcquisitionDraft(write.request);
        return acquisition
          ? this.backend.add.userModuleAcquisition(write.module.id, acquisition).pipe(
            map(() => ({module: write.module, kind})),
            catchError(() => {
              this.snackBar.open('Ownership saved, but purchase history could not be recorded.', undefined, {
                duration: 5000,
                panelClass: 'snack-error'
              });
              return of({module: write.module, kind});
            })
          )
          : of({module: write.module, kind});
      })
    );
  }

  private updateLocalUserModulePossession(moduleId: number, kind: UserModulePossessionKind | null): void {
    const currentUserModules = this.userModulesList$.value.filter(module => module.id !== moduleId);
    this.hasKnownUserModulesList = true;
    this.userModulesList$.next(kind
      ? [...currentUserModules, {id: moduleId, possessionKind: kind}]
      : currentUserModules
    );

    const currentModules = this.modulesList$.value;
    if (!currentModules) {
      return;
    }
    this.modulesList$.next(currentModules.map(module => module.id === moduleId
      ? {...module, possessionKind: kind ?? undefined}
      : module
    ));
  }

  /**
   * Minor-EUR price estimates keyed by module id, derived from the merged
   * summary map. This is what the range matcher consumes.
   */
  getPriceEurMinorMap(): ReadonlyMap<number, number> {
    return new Map(
      [...this.priceSummaryByModuleId$.value.values()]
        .map(summary => [summary.moduleId, summary.estimatedPriceEurMinor] as const)
    );
  }

  /**
   * Fetches Price Hub summaries for ids missing from the map (e.g. owned /
   * wanted collection datasets, which never pass through `modulesList$`).
   * Already-known ids are skipped; failures resolve to empty and keep the
   * current map so filtering degrades to "no price data" instead of erroring.
   */
  ensurePriceSummariesForModuleIds(moduleIds: ReadonlyArray<number>): void {
    const missing = this.missingPriceSummaryIds([...new Set(
      (moduleIds ?? []).filter(id => Number.isFinite(id) && id > 0)
    )]);

    if (missing.length === 0) {
      return;
    }

    this.fetchAndMarkPriceSummaries(missing).pipe(
      take(1),
      this.takeUntilDestroyed()
    ).subscribe(summaries => this.mergePriceSummaries(summaries));
  }

  private missingPriceSummaryIds(moduleIds: ReadonlyArray<number>): number[] {
    return moduleIds.filter(id =>
      !this.priceSummaryByModuleId$.value.has(id) && !this.priceSummariesRequestedIds.has(id)
    );
  }

  private fetchAndMarkPriceSummaries(moduleIds: ReadonlyArray<number>): Observable<ModuleRecentMarketPrice[]> {
    moduleIds.forEach(id => this.priceSummariesRequestedIds.add(id));
    return this.backend.GET.recentModuleMarketPrices([...moduleIds]).pipe(
      catchError(error => {
        console.warn('[module-browser] Recent market prices could not be loaded.', error);
        return of([]);
      })
    );
  }

  /**
   * Pulls the next server page while an active price filter leaves the
   * visible page short, so the list fills before Load more is proposed.
   * Deliberately silent (no `search.load_more` event): this is automatic
   * backfill, not a user action.
   *
   * Termination is structural — every cycle either returns early or grows
   * `fetchedRawCount` toward the server total:
   * - an auto-fill is already in flight (re-entrant map/response emissions),
   * - the visible dataset is not the server page (collection modes),
   * - no price bound is set, or the page already holds `take` matches,
   * - every server row is loaded, or the last page came back empty.
   */
  private maybeAutoFillPricePage(): void {
    if (this.priceAutoFillInFlight$.value) {
      return;
    }
    if (this.suspendPriceAutoFill$.value) {
      return;
    }
    if (!hasActivePriceFilterForFields(this.fields)) {
      return;
    }
    const take = this.serversideTableRequestData.take$.value;
    if (this.countPriceMatches(this.modulesList$.value ?? []) >= take) {
      return;
    }
    const total = this.serversideAdditionalData.itemsCount$.value ?? 0;
    if (this.fetchedRawCount >= total) {
      return;
    }
    if (this.lastResponseRawCount <= 0) {
      return;
    }
    this.priceAutoFillInFlight$.next(true);
    this.serversideTableRequestData.skip$.next(this.fetchedRawCount);
    this.updateModulesList$.next();
  }

  private countPriceMatches(modules: ReadonlyArray<MinimalModule>): number {
    const {minPriceEur, maxPriceEur} = normalizePriceRange(
      parsePriceBoundary(this.fields.priceMin.control.value),
      parsePriceBoundary(this.fields.priceMax.control.value)
    );
    if (minPriceEur === null && maxPriceEur === null) {
      return modules.length;
    }
    const prices = this.getPriceEurMinorMap();
    const includeUnpriced = this.includeUnpriced$.value;
    return modules.filter(module => matchesPriceRange(prices.get(module.id) ?? null, minPriceEur, maxPriceEur, includeUnpriced)).length;
  }

  private mergePriceSummaries(summaries: ReadonlyArray<ModuleRecentMarketPrice>): void {
    const next = new Map(this.priceSummaryByModuleId$.value);
    let changed = false;
    for (const summary of summaries ?? []) {
      if (next.get(summary.moduleId)?.estimatedPriceEurMinor !== summary.estimatedPriceEurMinor) {
        next.set(summary.moduleId, summary);
        changed = true;
      }
    }
    if (changed) {
      this.priceSummaryByModuleId$.next(next);
    }
  }

  private getSelectedTagIds(): number[] {
    return getSelectedTagIdsFromFields(this.fields);
  }

  private markSearchPerformedPending(): void {
    this.searchPerformedPending = true;
  }

  private capturePendingSearchPerformed(resultCount: number): void {
    if (!this.searchPerformedPending) {
      return;
    }
    this.searchPerformedPending = false;

    const nameVal = this.fields.name.control.value.trim();
    const filtersActive = getActiveFilterNames(this.fields)
      .filter(filterName => filterName !== 'name')
      .length;
    this.analytics.capture('search.performed', {
      query_len:      nameVal.length,
      filters_active: filtersActive,
      result_count:   resultCount
    });
  }

}
