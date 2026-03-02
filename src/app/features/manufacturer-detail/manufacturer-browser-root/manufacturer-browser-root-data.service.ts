import {
  Injectable,
  OnDestroy
} from '@angular/core';
import {
  FormControl,
  UntypedFormControl
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  merge,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap
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

@Injectable()
export class ManufacturerBrowserRootDataService implements OnDestroy {
  // ── Actions ──────────────────────────────────────────────────────────────
  updateList$ = new Subject<void>();
  resetForm$ = new Subject<void>();
  
  // ── Server-side state ─────────────────────────────────────────────────────
  private _allManufacturers$ = new BehaviorSubject<ManufacturerDetail[] | null>(null);
  private _isLoading$ = new BehaviorSubject<boolean>(false);
  
  // ── Fields (mirrors rack/module pattern) ─────────────────────────────────
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
  
  // ── Derived public streams ─────────────────────────────────────────────────
  /** Filtered + sorted manufacturer list; null while first load is in flight. */
  readonly manufacturers$: Observable<ManufacturerDetail[] | null>;
  readonly isLoading$ = this._isLoading$.asObservable();
  readonly canReset$: Observable<boolean>;
  
  private readonly destroy$ = new Subject<void>();

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
    
    // canReset$ — true when any control differs from default
    this.canReset$ = merge(
      this.fields.search.control.valueChanges,
      this.fields.order.control.valueChanges,
    ).pipe(
      startWith(null),
      map(() =>
        this.fields.search.control.value !== '' ||
        this.fields.order.control.value?.name !== DEFAULT_ORDER.name
      ),
      distinctUntilChanged(),
      shareReplay(1)
    );
    
    // Derived filtered list reacts to _allManufacturers$ + form changes
    this.manufacturers$ = merge(
      this._allManufacturers$,
      this.fields.search.control.valueChanges.pipe(map(() => this._allManufacturers$.value)),
      this.fields.order.control.valueChanges.pipe(map(() => this._allManufacturers$.value)),
    ).pipe(
      map(list => {
        if (list === null) return null;
        const search = (this.fields.search.control.value ?? '').toLowerCase().trim();
        const order = this.fields.order.control.value;
        let filtered = search
          ? list.filter(m => m.name?.toLowerCase().includes(search))
          : [...list];
        const asc = order?.name?.includes('A→Z') ?? true;
        filtered.sort((a, b) => {
          const cmp = (a.name ?? '').localeCompare(b.name ?? '');
          return asc ? cmp : -cmp;
        });
        return filtered;
      }),
      shareReplay(1)
    );
    
    // Load pipeline
    this.updateList$.pipe(
      tap(() => {
        this._isLoading$.next(true);
        this._allManufacturers$.next(null);
      }),
      switchMap(() =>
        this.backend.GET.manufacturers(0, 999, 'id,name,logo,websiteURL,adminUser').pipe(
          map(result => (result.data ?? []) as ManufacturerDetail[]),
          tap(list => {
            this._allManufacturers$.next(list);
            this._isLoading$.next(false);
          }),
          catchError(err => {
            console.error('ManufacturerBrowserRootDataService error:', err);
            SharedConstants.errorCustom(this.snackBar, 'Failed to load manufacturers');
            this._isLoading$.next(false);
            return of([] as ManufacturerDetail[]);
          })
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe();
    
    // Reset handler
    this.resetForm$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.fields.search.control.setValue('');
      this.fields.order.control.setValue(DEFAULT_ORDER);
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}