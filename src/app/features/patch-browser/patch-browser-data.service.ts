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
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { PatchMinimal } from '../../models/patch';
import { FormTypes } from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { SupabaseService } from '../backend/supabase.service';


export type PatchList = PatchMinimal[] | null;

export interface PatchOrderOption {
  id: string;
  name: string;
}

interface PatchFilterField {
  code: string;
  flex: string;
  control: FormControl<string>;
  label: string;
  type: FormTypes;
}

interface PatchOrderField {
  code: string;
  flex: string;
  control: FormControl<PatchOrderOption>;
  label: string;
  type: FormTypes;
  options$: Observable<PatchOrderOption[]>;
}

interface PatchBrowserFields {
  search: PatchFilterField;
  order: PatchOrderField;
}

const PATCH_ORDER_OPTIONS: PatchOrderOption[] = [
  {id: 'name', name: 'Name ↑'},
  {id: 'name', name: 'Name ↓'},
  {id: 'created', name: 'Created ↑'},
  {id: 'created', name: 'Created ↓'},
  {id: 'updated', name: 'Updated ↑'},
  {id: 'updated', name: 'Updated ↓'},
];

const PATCH_DEFAULT_ORDER: PatchOrderOption = {id: 'updated', name: 'Updated ↓'};

@Injectable()
export class PatchBrowserDataService extends SubManager {
  readonly patchesList$ = new BehaviorSubject<PatchList>(null);
  readonly updatePatchesList$ = new Subject<void>();
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
  
  readonly fields: PatchBrowserFields;
  readonly canReset$: Observable<boolean>;

  constructor(private backend: SupabaseService) {
    super();

    this.fields = {
      search: {
        label: 'Search patch...',
        code: 'search',
        flex: '6rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.TEXT,
      },
      order: {
        label: 'Order by',
        code: 'order',
        flex: '6rem',
        control: new FormControl<PatchOrderOption>(PATCH_DEFAULT_ORDER, {nonNullable: true}),
        type: FormTypes.SELECT,
        options$: of(PATCH_ORDER_OPTIONS),
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
          (order && order.id !== PATCH_DEFAULT_ORDER.id)
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
        this.updatePatchesList$.next();
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
      this.updatePatchesList$.next();
    });

    this.updatePatchesList$
      .pipe(
        switchMap(() => {
          const skip = this.serversideTableRequestData.skip$.value;
          const take = this.serversideTableRequestData.take$.value;
          const filter = this.serversideTableRequestData.filter$.value;
          const [sortCol, sortDir] = this.serversideTableRequestData.sort$.value;
          return this.backend.GET.patches(skip, (skip + take) - 1, filter, sortCol || null, sortDir);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        this.serversideAdditionalData.itemsCount$.next(x.count);
        this.patchesList$.next(x.data);
      });

    this.resetForm$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const silent = {emitEvent: false};
        this.fields.search.control.setValue('', silent);
        this.fields.order.control.setValue(PATCH_DEFAULT_ORDER, silent);
        this.serversideTableRequestData.filter$.next('');
        this.serversideTableRequestData.sort$.next([PATCH_DEFAULT_ORDER.id, 'desc']);
        this.serversideTableRequestData.skip$.next(0);
        this.paginatorToFistPage$.next();
        this.updatePatchesList$.next();
      });
  }
}