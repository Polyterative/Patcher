import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
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
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  timeoutWith
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
  private static readonly MAX_LOADING_MS = 2_000;
  
  readonly racksList$ = new BehaviorSubject<RackList>(null);
  readonly updateRacksList$ = new Subject<void>();
  readonly resetForm$ = new Subject<void>();
  readonly pageEvent$ = new Subject<PageEvent>();
  readonly paginatorToFistPage$ = new Subject<void>();
  
  readonly serversideTableRequestData = {
    skip$:   new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(20),
    filter$: new BehaviorSubject<string>(''),
    sort$: new BehaviorSubject<[string, string]>(['updated', 'desc'])
  };
  
  readonly serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0)
  };
  
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
    
    // Page navigation — update skip/take then re-fetch
    this.pageEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.serversideTableRequestData.take$.next(event.pageSize);
        this.serversideTableRequestData.skip$.next(event.pageIndex * event.pageSize);
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
      this.paginatorToFistPage$.next();
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

          return this.backend.GET.racksMinimal(skip, (skip + take) - 1, filter, sortCol || null, sortDir)
            .pipe(
              map((response: any) => {
                if (response?.error) {
                  return {kind: 'error' as const, error: response.error, count: previousCount, data: previousData};
                }
                return {
                  kind: 'success' as const,
                  count: response?.count ?? 0,
                  data: Array.isArray(response?.data) ? response.data : []
                };
              }),
              timeoutWith(RackBrowserDataService.MAX_LOADING_MS, of({
                kind: 'timeout' as const,
                count: previousCount,
                data: previousData
              })),
              catchError(error => of({
                kind: 'error' as const,
                error,
                count: previousCount,
                data: previousData
              }))
            );
        }),
        map(result => {
          if (result.kind === 'timeout') {
            console.error('[rack-browser] Racks list request timed out after 2 seconds');
          } else if (result.kind === 'error') {
            console.error('[rack-browser] Failed to load racks list', (result as any).error);
          }
          return {count: result.count, data: result.data};
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((x: any) => {
        this.serversideAdditionalData.itemsCount$.next(x.count);
        this.racksList$.next(x.data);
      });

    this.resetForm$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fields.search.control.setValue('');
        this.fields.order.control.setValue(RACK_DEFAULT_ORDER);
        this.serversideTableRequestData.filter$.next('');
        this.serversideTableRequestData.sort$.next([RACK_DEFAULT_ORDER.id, 'desc']);
        this.serversideTableRequestData.skip$.next(0);
        this.paginatorToFistPage$.next();
        this.updateRacksList$.next();
      });
  }
}