import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  merge,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from '../backend/supabase.service';
import {
  ModuleCollectionPage,
  ModuleCollectionSummary
} from 'src/app/models/module-collection';
import {
  FormTypes,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export type CollectionOrderKey = 'updated_desc' | 'created_desc' | 'name_asc';

export interface CollectionOrderOption extends ISelectable {
  id: CollectionOrderKey;
}

export interface ModuleCollectionDiscoveryOpenEvent {
  collection: ModuleCollectionSummary;
  index: number;
}

export const COLLECTION_ORDER_OPTIONS: CollectionOrderOption[] = [
  { id: 'updated_desc', name: 'Recently updated' },
  { id: 'created_desc', name: 'Newest first' },
  { id: 'name_asc', name: 'Name A-Z' }
];

export interface ModuleCollectionsBrowserFields {
  search: {
    code: string;
    flex: string;
    control: FormControl<string>;
    label: string;
    type: FormTypes;
  };
  order: {
    code: string;
    flex: string;
    control: FormControl<CollectionOrderOption>;
    label: string;
    type: FormTypes;
    options$: Observable<CollectionOrderOption[]>;
  };
}

const PAGE_SIZE = 24;

interface CollectionPageResult extends ModuleCollectionPage {
  from: number;
  failed: boolean;
}

@Injectable()
export class ModuleCollectionsBrowserDataService extends SubManager {
  private readonly _collections$ = new BehaviorSubject<ModuleCollectionSummary[] | undefined>(undefined);
  readonly collections$ = this._collections$.asObservable();
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading$.asObservable();
  private readonly _hasMore$ = new BehaviorSubject<boolean>(false);
  readonly hasMore$ = this._hasMore$.asObservable();
  private readonly _remainingCount$ = new BehaviorSubject<number>(0);
  readonly remainingCount$ = this._remainingCount$.asObservable();

  readonly fields: ModuleCollectionsBrowserFields = {
    search: {
      label: 'Search collections',
      code: 'search',
      flex: '6rem',
      control: new FormControl<string>('', { nonNullable: true }),
      type: FormTypes.TEXT
    },
    order: {
      label: 'Order by',
      code: 'order',
      flex: '6rem',
      control: new FormControl<CollectionOrderOption>(COLLECTION_ORDER_OPTIONS[0], { nonNullable: true }),
      type: FormTypes.SELECT,
      options$: of(COLLECTION_ORDER_OPTIONS)
    }
  };

  readonly loadMore$ = new Subject<void>();
  readonly resetForm$ = new Subject<void>();
  readonly collectionOpened$ = new Subject<ModuleCollectionDiscoveryOpenEvent>();
  readonly canReset$: Observable<boolean>;

  private readonly _skip$ = new BehaviorSubject<number>(0);
  private activeSearch = '';
  private activeOrder = COLLECTION_ORDER_OPTIONS[0];
  private filterVersion = 0;

  constructor(
    private backend: SupabaseService,
    private analytics: AnalyticsService
  ) {
    super();

    this.canReset$ = merge(
      this.fields.search.control.valueChanges,
      this.fields.order.control.valueChanges,
      this.resetForm$
    ).pipe(
      startWith(null),
      map(() => (
        this.fields.search.control.value !== '' ||
        this.fields.order.control.value.id !== COLLECTION_ORDER_OPTIONS[0].id
      )),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    const filters$: Observable<[string, CollectionOrderOption]> = merge(
      of([this.fields.search.control.value, this.fields.order.control.value] as [string, CollectionOrderOption]),
      this.fields.search.control.valueChanges.pipe(
        debounceTime(300),
        filter(search => search === this.fields.search.control.value),
        map(search => [search, this.fields.order.control.value] as [string, CollectionOrderOption])
      ),
      this.fields.order.control.valueChanges.pipe(
        map(order => [this.fields.search.control.value, order] as [string, CollectionOrderOption])
      ),
      this.resetForm$.pipe(
        tap(() => {
          this.analytics.capture('module_collection.discovery_filters_reset', {});
          this.fields.search.control.setValue('', { emitEvent: false });
          this.fields.order.control.setValue(COLLECTION_ORDER_OPTIONS[0], { emitEvent: false });
        }),
        map(() => ['', COLLECTION_ORDER_OPTIONS[0]] as [string, CollectionOrderOption])
      )
    ).pipe(
      distinctUntilChanged(([previousSearch, previousOrder], [nextSearch, nextOrder]) => (
        previousSearch === nextSearch && previousOrder.id === nextOrder.id
      ))
    );

    filters$.pipe(
      tap(([search, order]) => {
        if (this.filterVersion > 0) {
          this.analytics.capture('module_collection.discovery_filter_changed', {
            search_active: search.trim().length > 0,
            search_length: search.trim().length,
            order: order.id
          });
        }
        this.filterVersion++;
        this.activeSearch = search;
        this.activeOrder = order;
        this._skip$.next(0);
        this._collections$.next(undefined);
        this._hasMore$.next(false);
        this._remainingCount$.next(0);
        this._loading$.next(true);
      }),
      switchMap(([search, order]) => this.fetchPage(0, search, order.id).pipe(
        map(page => ({page, search, order}))
      )),
      takeUntil(this.destroy$)
    ).subscribe(({page, search, order}) => {
      this.applyFirstPage(page);
      this.analytics.capture('module_collection.browser_viewed', { view: 'public' });
      this.analytics.capture('module_collection.discovery_search_performed', {
        search_active: search.trim().length > 0,
        search_length: search.trim().length,
        order: order.id,
        result_count: page.items.length,
        total: page.total,
        remaining: page.remaining,
        failed: page.failed
      });
    });

    this.loadMore$.pipe(
      tap(() => {
        this._loading$.next(true);
        this.analytics.capture('module_collection.discovery_load_more', {
          loaded_count: this._collections$.getValue()?.length ?? 0,
          remaining: this._remainingCount$.getValue(),
          order: this.activeOrder.id,
          search_active: this.activeSearch.trim().length > 0
        });
      }),
      switchMap(() => {
        const nextSkip = this._skip$.getValue() + PAGE_SIZE;
        const filterVersion = this.filterVersion;
        return this.fetchPage(nextSkip, this.activeSearch, this.activeOrder.id).pipe(
          map(page => ({ page, filterVersion }))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(({ page, filterVersion }) => {
      if (filterVersion !== this.filterVersion) {
        return;
      }
      this._loading$.next(false);
      if (!page.failed) {
        this._skip$.next(page.from);
      }
      const current = this._collections$.getValue() ?? [];
      this._collections$.next(this.appendUniqueCollections(current, page.items));
      this._hasMore$.next(page.remaining > 0);
      this._remainingCount$.next(page.remaining);
    });

    this.collectionOpened$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({collection, index}) => {
        this.analytics.capture('module_collection.discovery_collection_clicked', {
          collection_id: collection.id,
          public_id: collection.public_id,
          rank: index + 1,
          module_count: collection.module_count ?? 0
        });
      });

  }

  private fetchPage(from: number, search: string, order: CollectionOrderKey): Observable<CollectionPageResult> {
    const previousItems = this._collections$.getValue() ?? [];
    const previousRemaining = this._remainingCount$.getValue();
    return this.backend.GET.publicModuleCollectionsPage(from, from + PAGE_SIZE - 1, search, order).pipe(
      map(page => ({
        ...page,
        from,
        failed: false
      })),
      catchError(error => {
        console.error('[module-collections-browser] Failed to load public collections', error);
        return of({
          items: from === 0 ? [] : previousItems,
          total: from === 0 ? 0 : previousItems.length + previousRemaining,
          remaining: from === 0 ? 0 : previousRemaining,
          from,
          failed: true
        });
      })
    );
  }

  private applyFirstPage(page: {items: ModuleCollectionSummary[]; remaining: number}): void {
    this._loading$.next(false);
    this._collections$.next(page.items);
    this._hasMore$.next(page.remaining > 0);
    this._remainingCount$.next(page.remaining);
  }

  private appendUniqueCollections(
    current: ModuleCollectionSummary[],
    incoming: ModuleCollectionSummary[]
  ): ModuleCollectionSummary[] {
    const seenIds = new Set(current.map(collection => collection.id));
    const uniqueIncoming = incoming.filter(collection => {
      if (seenIds.has(collection.id)) {
        return false;
      }
      seenIds.add(collection.id);
      return true;
    });

    return [...current, ...uniqueIncoming];
  }
}
