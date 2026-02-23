import {
  Injectable,
  OnDestroy
} from '@angular/core';
import {
  FormControl,
  UntypedFormControl
} from '@angular/forms';
import { PageEvent } from "@angular/material/paginator";
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
import { SupabaseService } from 'src/app/features/backend/supabase.service';


export type RackList = RackMinimal[] | null;

const RACK_ORDER_OPTIONS = [
  {id: 'name', name: 'Name ↑'},
  {id: 'name', name: 'Name ↓'},
  {id: 'created', name: 'Created ↑'},
  {id: 'created', name: 'Created ↓'},
  {id: 'updated', name: 'Updated ↑'},
  {id: 'updated', name: 'Updated ↓'},
];

const RACK_DEFAULT_ORDER = {id: 'updated', name: 'Updated ↓'};

@Injectable()
export class RackBrowserDataService implements OnDestroy {
  private static readonly MAX_LOADING_MS = 2_000;
  
  racksList$ = new BehaviorSubject<RackList>(null);
  updateRacksList$ = new Subject<void>();
  resetForm$ = new Subject<void>();

  serversideTableRequestData = {
    skip$:   new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(20),
    filter$: new BehaviorSubject<string>(''),
    sort$: new BehaviorSubject<[string, string]>(['updated', 'desc'])
  };
  serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0)
  };

  fields: {
    search: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    order: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes;
      options$: Observable<{
        name: string;
        id: string
      }[]>
    };
  };

  paginatorToFistPage$ = new Subject<void>();
  canReset$: Observable<boolean>;
  protected destroyEvent$ = new Subject<void>();

  onPageEvent($event: PageEvent) {
    this.serversideTableRequestData.take$.next($event.pageSize);
    this.serversideTableRequestData.skip$.next(($event.pageIndex) * $event.pageSize);
    this.updateRacksList$.next();
  }
  
  constructor(private backend: SupabaseService) {
    this.fields = {
      search: {
        label: 'Search rack...',
        code: 'search',
        flex: '6rem',
        control: new UntypedFormControl(''),
        type: FormTypes.TEXT,
      },
      order: {
        label: 'Order by',
        code: 'order',
        flex: '6rem',
        control: new UntypedFormControl(RACK_DEFAULT_ORDER),
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
          (order && order.id !== 'updated')
        );
      }),
      distinctUntilChanged(),
      shareReplay(1)
    );
    
    // Single merged pipeline — debounce collapses reset burst into one fetch.
    merge(
      this.fields.search.control.valueChanges,
      this.fields.order.control.valueChanges
    ).pipe(
      debounceTime(750),
      takeUntil(this.destroyEvent$)
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
                  return {
                    kind: 'error' as const,
                    error: response.error,
                    count: previousCount,
                    data: previousData
                  };
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
            console.error('[rack-browser] Failed to load racks list', result.error);
          }
          
          return {
            count: result.count,
            data: result.data
          };
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe((x: any) => {
        this.serversideAdditionalData.itemsCount$.next(x.count);
        this.racksList$.next(x.data);
      });

    this.resetForm$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(() => {
        this.fields.search.control.setValue('');
        this.fields.order.control.setValue(RACK_DEFAULT_ORDER);
        this.serversideTableRequestData.filter$.next('');
        this.serversideTableRequestData.sort$.next(['updated', 'desc']);
        this.serversideTableRequestData.skip$.next(0);
        this.paginatorToFistPage$.next();
        this.updateRacksList$.next();
      });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
}
