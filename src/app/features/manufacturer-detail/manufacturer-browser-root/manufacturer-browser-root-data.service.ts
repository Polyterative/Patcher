import {
  Injectable,
  OnDestroy
} from '@angular/core';
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
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { ManufacturerDetail } from '../manufacturer-detail-data.service';


const MANUFACTURER_ORDER_OPTIONS = [
  {id: 'name', name: 'Name A→Z'},
  {id: 'name', name: 'Name Z→A'},
];
const DEFAULT_ORDER = {id: 'name', name: 'Name A→Z'};
const MAX_LOADING_MS = 2_000;

@Injectable()
export class ManufacturerBrowserRootDataService implements OnDestroy {
  // ── Actions ───────────────────────────────────────────────────────────────
  updateList$ = new Subject<void>();
  resetForm$ = new Subject<void>();
  paginatorToFistPage$ = new Subject<void>();
  
  // ── Server-side pagination state (mirrors rack-browser) ───────────────────
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
      label: string;
      type: FormTypes
    };
    order: {
      control: FormControl<any>;
      label: string;
      type: FormTypes;
      options$: Observable<{
        name: string;
        id: string
      }[]>
    };
  };
  
  // ── Public state ──────────────────────────────────────────────────────────
  manufacturers$ = new BehaviorSubject<ManufacturerDetail[] | null>(null);
  canReset$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();
  
  onPageEvent(event: PageEvent): void {
    this.serversideTableRequestData.take$.next(event.pageSize);
    this.serversideTableRequestData.skip$.next(event.pageIndex * event.pageSize);
    this.updateList$.next();
  }

  constructor(
    private backend: SupabaseService,
    private snackBar: MatSnackBar
  ) {
    this.fields = {
      search: {
        label: 'Search manufacturer…',
        control: new UntypedFormControl(''),
        type: FormTypes.TEXT,
      },
      order: {
        label: 'Order by',
        control: new UntypedFormControl(DEFAULT_ORDER),
        type: FormTypes.SELECT,
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
    
    // Debounced form → reset page → trigger fetch
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
        orderVal?.id ?? 'name',
        orderVal?.name?.includes('Z→A') ? 'desc' : 'asc',
      ]);
      this.serversideTableRequestData.skip$.next(0);
      this.paginatorToFistPage$.next();
      this.updateList$.next();
    });
    
    // Main fetch pipeline
    this.updateList$.pipe(
      switchMap(() => {
        const skip = this.serversideTableRequestData.skip$.value;
        const take = this.serversideTableRequestData.take$.value;
        const filter = this.serversideTableRequestData.filter$.value;
        const [sortCol, sortDir] = this.serversideTableRequestData.sort$.value;
        const prevData = this.manufacturers$.value ?? [];
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
              data: Array.isArray(response?.data) ? response.data : [],
            };
          }),
          timeoutWith(MAX_LOADING_MS, of({kind: 'timeout' as const, count: prevCount, data: prevData})),
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
      this.manufacturers$.next(x.data as ManufacturerDetail[]);
    });

    // Reset handler
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
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}