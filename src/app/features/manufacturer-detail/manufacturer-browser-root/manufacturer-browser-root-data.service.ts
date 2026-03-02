import { Injectable } from '@angular/core';
import {
  FormControl,
  UntypedFormControl
} from '@angular/forms';
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
  takeUntil,
  timeoutWith
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { ManufacturerDetail } from '../manufacturer-detail-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


const MANUFACTURER_ORDER_OPTIONS = [
  {id: 'name', name: 'Name A→Z'},
  {id: 'name_desc', name: 'Name Z→A'},
];
const DEFAULT_ORDER = MANUFACTURER_ORDER_OPTIONS[0];

@Injectable()
export class ManufacturerBrowserRootDataService extends SubManager {
  private static readonly MAX_LOADING_MS = 2_000;

  // ── Actions ───────────────────────────────────────────────────────────────
  readonly updateList$ = new Subject<void>();
  readonly resetForm$ = new Subject<void>();
  readonly paginatorToFistPage$ = new Subject<void>();
  
  // ── Server-side pagination state ──────────────────────────────────────────
  serversideTableRequestData = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(20),
    filter$: new BehaviorSubject<string>(''),
    sort$: new BehaviorSubject<[string, string]>(['name', 'asc']),
  };
  serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0),
  };

  // ── Fields ────────────────────────────────────────────────────────────────
  fields: {
    search: {
      control: FormControl<any>;
      label: string
    };
    order: {
      control: FormControl<any>;
      label: string;
      options$: Observable<{
        name: string;
        id: string
      }[]>
    };
  };

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
        control: new UntypedFormControl(''),
      },
      order: {
        label: 'Order by',
        control: new UntypedFormControl(DEFAULT_ORDER),
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
          (order && order.name !== DEFAULT_ORDER.name)
        );
      }),
      distinctUntilChanged(),
      shareReplay(1)
    );
    
    this.initializeFormChangeHandler();
    this.initializeFetchHandler();
    this.initializeResetHandler();
  }
  
  onPageEvent(event: PageEvent): void {
    this.serversideTableRequestData.take$.next(event.pageSize);
    this.serversideTableRequestData.skip$.next(event.pageIndex * event.pageSize);
    this.updateList$.next();
  }
  
  private initializeFormChangeHandler(): void {
    merge(
      this.fields.search.control.valueChanges,
      this.fields.order.control.valueChanges,
    ).pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const orderVal = this.fields.order.control.value;
      const searchVal = this.fields.search.control.value ?? '';
      this.serversideTableRequestData.filter$.next(searchVal);
      this.serversideTableRequestData.sort$.next([
        'name',
        orderVal?.name?.includes('Z→A') ? 'desc' : 'asc',
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
          timeoutWith(ManufacturerBrowserRootDataService.MAX_LOADING_MS, of({
            kind: 'timeout' as const,
            count: prevCount,
            data: prevData,
          })),
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
      this.fields.search.control.setValue('');
      this.fields.order.control.setValue(DEFAULT_ORDER);
      this.serversideTableRequestData.filter$.next('');
      this.serversideTableRequestData.sort$.next(['name', 'asc']);
      this.serversideTableRequestData.skip$.next(0);
      this.paginatorToFistPage$.next();
      this.updateList$.next();
    });
  }
}