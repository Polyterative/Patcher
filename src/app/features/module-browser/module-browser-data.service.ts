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
  hasResettableModuleFilters,
  isOwnedPossessionForModule,
  isWantedPossessionForModule,
  sortModulesByBestMatchForTags,
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
  /** Number of raw (server) rows fetched so far, independent of any local AND-tag filtering. */
  private fetchedRawCount = 0;

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

      const activeFilters = getActiveFilterNames(this.fields);
      this.analytics.capture('search.filter_changed', {
        active_filters: activeFilters,
        active_filter_count: activeFilters.length,
        order: orderVal?.id,
      });

      this.serversideTableRequestData.filter$.next(nameVal);
      this.serversideTableRequestData.sort$.next([
        isBestMatchOrder ? this.orderStartingValue.id : (orderVal?.id ?? ''),
        isBestMatchOrder ? 'desc' : toSortDirection(orderVal?.name)
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
        this.remoteTagFilterLoading$.next(false);

        if (skip === 0) {
          this.capturePendingSearchPerformed(response.count ?? response.data.length);
        }
      });

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
        this.fields.hpCondition.control.setValue(DEFAULT_HP_CONDITION, silent);
        this.fields.standard.control.setValue(DEFAULT_STANDARD, silent);
        this.fields.tags.control.setValue([], silent);
        this.fields.tagSearch.control.setValue('', silent);
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
    return filterOwnedModulesForFields(modules, this.fields, this.tagMatchMode$.value, excludedModuleIds);
  }

  filterWantedModules(modules: MinimalModule[] | undefined): MinimalModule[] | undefined {
    return filterWantedModulesForFields(modules, this.fields, this.tagMatchMode$.value);
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
