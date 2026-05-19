import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { RackMinimal } from 'src/app/models/rack';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService } from 'src/app/features/backend/supabase.service';


export type RackList = RackMinimal[] | null;

export interface RackOrderOption {
  id: string;
  name: string;
}

interface RackFilterField {
  code: string;
  flex: string;
  control: FormControl<string>;
  label: string;
  type: FormTypes;
}

interface RackOrderField {
  code: string;
  flex: string;
  control: FormControl<RackOrderOption>;
  label: string;
  type: FormTypes;
  options$: Observable<RackOrderOption[]>;
}

interface RackBrowserFields {
  search: RackFilterField;
  order: RackOrderField;
}

const RACK_ORDER_OPTIONS: RackOrderOption[] = [
  {id: 'name', name: 'Name ↑'},
  {id: 'name', name: 'Name ↓'},
  {id: 'created', name: 'Created ↑'},
  {id: 'created', name: 'Created ↓'},
  {id: 'updated', name: 'Updated ↑'},
  {id: 'updated', name: 'Updated ↓'},
];

const RACK_DEFAULT_ORDER: RackOrderOption = {id: 'updated', name: 'Updated ↓'};

@Injectable()
export class RackBrowserDataService extends SubManager {
  readonly racksList$ = new BehaviorSubject<RackList>(null);
  readonly updateRacksList$ = new Subject<void>();
  readonly resetForm$ = new Subject<void>();
  readonly loadMore$ = new Subject<void>();
  
  readonly serversideTableRequestData = {
    skip$:   new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(25),
    filter$: new BehaviorSubject<string>(''),
    sort$: new BehaviorSubject<[string, string]>(['updated', 'desc'])
  };
  
  readonly serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0)
  };

  readonly hasMoreRacks$: Observable<boolean>;
  readonly remainingRacksCount$: Observable<number>;
  
  readonly fields: RackBrowserFields;
  readonly canReset$: Observable<boolean>;

  constructor(private backend: SupabaseService) {
    super();

    this.fields = {
      search: {
        label: 'Search rack...',
        code: 'search',
        flex: '6rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.TEXT,
      },
      order: {
        label: 'Order by',
        code: 'order',
        flex: '6rem',
        control: new FormControl<RackOrderOption>(RACK_DEFAULT_ORDER, {nonNullable: true}),
        type: FormTypes.SELECT,
        options$: of(RACK_ORDER_OPTIONS),
      },
    };

    this.canReset$ = merge(
      this.fields.search.control.valueChanges,
      this.fields.order.control.valueChanges
    ).pipe(
      startWith(null),
      map(() => {
        const order = this.fields.order.control.value;
        return (
          this.fields.search.control.value !== '' ||
          (order && order.id !== RACK_DEFAULT_ORDER.id)
        );
      }),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.hasMoreRacks$ = combineLatest([
      this.racksList$,
      this.serversideAdditionalData.itemsCount$
    ]).pipe(map(([list, count]) => count > (list?.length ?? 0)));

    this.remainingRacksCount$ = combineLatest([
      this.racksList$,
      this.serversideAdditionalData.itemsCount$
    ]).pipe(map(([list, count]) => Math.max(0, count - (list?.length ?? 0))));
    
    // Load more — advance skip to current list length, then re-fetch (append mode)
    this.loadMore$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.serversideTableRequestData.skip$.next(this.racksList$.value?.length ?? 0);
        this.updateRacksList$.next();
      });

    // Single merged pipeline — debounce collapses reset burst into one fetch.
    merge(
      this.fields.search.control.valueChanges,
      this.fields.order.control.valueChanges
    ).pipe(
      debounceTime(750),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const orderVal = this.fields.order.control.value;
      const searchVal = this.fields.search.control.value ?? '';
      this.serversideTableRequestData.filter$.next(searchVal);
      this.serversideTableRequestData.sort$.next([
        orderVal?.id ?? '',
        orderVal?.name?.includes('↑') ? 'asc' : 'desc'
      ]);
      this.serversideTableRequestData.skip$.next(0);
      this.updateRacksList$.next();
    });

    this.updateRacksList$
      .pipe(
        switchMap(() => {
          const skip = this.serversideTableRequestData.skip$.value;
          const take = this.serversideTableRequestData.take$.value;
          const filter = this.serversideTableRequestData.filter$.value;
          const [sortCol, sortDir] = this.serversideTableRequestData.sort$.value;
          const previousData = this.racksList$.value ?? [];
          const previousCount = this.serversideAdditionalData.itemsCount$.value ?? previousData.length;

          return this.backend.GET.racksMinimal(
            skip,
            (skip + take) - 1,
            filter,
            sortCol || null,
            sortDir,
            skip === 0,
            'stable-rack-pagination-v2'
          )
            .pipe(
              map((response: any) => {
                if (response?.error) {
                  return {kind: 'error' as const, error: response.error, count: previousCount, data: previousData};
                }
                return {
                  kind: 'success' as const,
                  count: response?.count ?? previousCount,
                  data: Array.isArray(response?.data) ? response.data : []
                };
              }),
              catchError(error => of({
                kind: 'error' as const,
                error,
                count: previousCount,
                data: previousData
              }))
            );
        }),
        map(result => {
          if (result.kind === 'error') {
            console.error('[rack-browser] Failed to load racks list', (result as any).error);
          }
          return {count: result.count, data: result.data};
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((x: any) => {
        this.serversideAdditionalData.itemsCount$.next(x.count);
        const skip = this.serversideTableRequestData.skip$.value;
        if (skip === 0) {
          this.racksList$.next(x.data);
        } else {
          this.racksList$.next(this.appendUniqueRacks(this.racksList$.value ?? [], x.data));
        }
      });

    this.resetForm$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const silent = {emitEvent: false};
        this.fields.search.control.setValue('', silent);
        this.fields.order.control.setValue(RACK_DEFAULT_ORDER, silent);
        this.serversideTableRequestData.filter$.next('');
        this.serversideTableRequestData.sort$.next([RACK_DEFAULT_ORDER.id, 'desc']);
        this.serversideTableRequestData.skip$.next(0);
        this.updateRacksList$.next();
      });
  }

  private appendUniqueRacks(current: RackMinimal[], incoming: RackMinimal[]): RackMinimal[] {
    const seenIds = new Set(current.map(rack => rack.id));
    const uniqueIncoming = incoming.filter(rack => {
      if (seenIds.has(rack.id)) {
        return false;
      }
      seenIds.add(rack.id);
      return true;
    });

    return [...current, ...uniqueIncoming];
  }
}