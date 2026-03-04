import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  takeUntil
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { ManufacturerDetail } from '../manufacturer-detail-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


type ManufacturerOrderOption = {
  id: string;
  name: string;
  sortColumn: 'name' | 'module_updated';
  sortDirection: 'asc' | 'desc';
};

interface ManufacturerSearchField {
  control: FormControl<string>;
  label: string;
}

interface ManufacturerOrderField {
  control: FormControl<ManufacturerOrderOption>;
  label: string;
  options$: Observable<ManufacturerOrderOption[]>;
}

interface ManufacturerBrowserFields {
  search: ManufacturerSearchField;
  order: ManufacturerOrderField;
}

const MANUFACTURER_ORDER_OPTIONS: ManufacturerOrderOption[] = [
  {id: 'name', name: 'Name A→Z', sortColumn: 'name', sortDirection: 'asc'},
  {id: 'name_desc', name: 'Name Z→A', sortColumn: 'name', sortDirection: 'desc'},
  {id: 'module_updated_desc', name: 'Recently changed modules', sortColumn: 'module_updated', sortDirection: 'desc'},
  {id: 'module_updated_asc', name: 'Least recently changed modules', sortColumn: 'module_updated', sortDirection: 'asc'},
];
const DEFAULT_ORDER = MANUFACTURER_ORDER_OPTIONS[2];

@Injectable()
export class ManufacturerBrowserRootDataService extends SubManager {
  // ── Actions ───────────────────────────────────────────────────────────────
  readonly updateList$ = new Subject<void>();
  readonly resetForm$ = new Subject<void>();
  readonly paginatorToFistPage$ = new Subject<void>();
  readonly pageEvent$ = new Subject<PageEvent>();

  // ── Server-side pagination state ──────────────────────────────────────────
  readonly serversideTableRequestData = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(10),
    filter$: new BehaviorSubject<string>(''),
    sort$: new BehaviorSubject<[string, string]>([DEFAULT_ORDER.sortColumn, DEFAULT_ORDER.sortDirection]),
  };
  
  readonly serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0),
  };

  // ── Fields ────────────────────────────────────────────────────────────────
  readonly fields: ManufacturerBrowserFields;

  // ── Public state ──────────────────────────────────────────────────────────
  private readonly _manufacturers$ = new BehaviorSubject<ManufacturerDetail[] | null>(null);
  readonly manufacturers$ = this._manufacturers$.asObservable();
  readonly canReset$: Observable<boolean>;

  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar
  ) {
    super();

    this.fields = {
      search: {
        label: 'Search manufacturer…',
        control: new FormControl<string>('', {nonNullable: true}),
      },
      order: {
        label: 'Order by',
        control: new FormControl<ManufacturerOrderOption>(DEFAULT_ORDER, {nonNullable: true}),
        options$: of(MANUFACTURER_ORDER_OPTIONS),
      },
    };

    this.canReset$ = merge(
      this.fields.search.control.valueChanges,
      this.fields.order.control.valueChanges,
    ).pipe(
      startWith(null),
      map(() => {
        const order = this.fields.order.control.value;
        return (
          this.fields.search.control.value !== '' ||
          (order && order.id !== DEFAULT_ORDER.id)
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
        this.updateList$.next();
      });

    this.initializeFormChangeHandler();
    this.initializeFetchHandler();
    this.initializeResetHandler();
  }

  private initializeFormChangeHandler(): void {
    merge(
      this.fields.search.control.valueChanges,
      this.fields.order.control.valueChanges,
    ).pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const orderVal = this.fields.order.control.value ?? DEFAULT_ORDER;
      const searchVal = this.fields.search.control.value ?? '';
      this.serversideTableRequestData.filter$.next(searchVal);
      this.serversideTableRequestData.sort$.next([
        orderVal.sortColumn,
        orderVal.sortDirection,
      ]);
      this.serversideTableRequestData.skip$.next(0);
      this.paginatorToFistPage$.next();
      this.updateList$.next();
    });
  }

  private initializeFetchHandler(): void {
    this.updateList$.pipe(
      switchMap(() => {
        const skip = this.serversideTableRequestData.skip$.value;
        const take = this.serversideTableRequestData.take$.value;
        const filter = this.serversideTableRequestData.filter$.value;
        const [sortCol, sortDir] = this.serversideTableRequestData.sort$.value;
        const prevData = this._manufacturers$.value ?? [];
        const prevCount = this.serversideAdditionalData.itemsCount$.value ?? prevData.length;

        return this.backend.GET.manufacturersPaginated(
          skip, (skip + take) - 1, filter, sortCol, sortDir
        ).pipe(
          map((response: any) => {
            if (response?.error) {
              return {kind: 'error' as const, error: response.error, count: prevCount, data: prevData};
            }
            return {
              kind: 'success' as const,
              count: response?.count ?? 0,
              data: Array.isArray(response?.data) ? response.data : [] as ManufacturerDetail[],
            };
          }),
          catchError(err => {
            SharedConstants.errorCustom(this.snackBar, 'Failed to load manufacturers');
            return of({kind: 'error' as const, error: err, count: prevCount, data: prevData});
          })
        );
      }),
      map(result => {
        if (result.kind !== 'success') {
          console.error('[manufacturer-browser] load failed', (result as any).error);
        }
        return {count: result.count, data: result.data};
      }),
      takeUntil(this.destroy$)
    ).subscribe(x => {
      this.serversideAdditionalData.itemsCount$.next(x.count);
      this._manufacturers$.next(x.data as ManufacturerDetail[]);
    });
  }
  
  private initializeResetHandler(): void {
    this.resetForm$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const silent = {emitEvent: false};
      this.fields.search.control.setValue('', silent);
      this.fields.order.control.setValue(DEFAULT_ORDER, silent);
      this.serversideTableRequestData.filter$.next('');
      this.serversideTableRequestData.sort$.next([DEFAULT_ORDER.sortColumn, DEFAULT_ORDER.sortDirection]);
      this.serversideTableRequestData.skip$.next(0);
      this.paginatorToFistPage$.next();
      this.updateList$.next();
    });
  }
}