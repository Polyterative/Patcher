import { Injectable } from '@angular/core';
import {
  FormControl,
  Validators
} from '@angular/forms';
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
  share,
  shareReplay,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { MinimalModule } from '../../models/module';
import {
  FormTypes,
  getCleanedValueId,
  isOption
} from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { SupabaseService } from '../backend/supabase.service';


export type ModuleList = MinimalModule[] | null;

export interface ModuleOrderOption {
  id: string;
  name: string;
}

interface IdNameOption {
  id: string;
  name: string;
}

type HpConditionOperator =
  '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<=';

interface HpConditionOption {
  id: HpConditionOperator;
  name: string;
}

interface IdNumberOption {
  id: number | undefined;
  name: string;
}

interface ModuleTextField {
  code: string;
  flex: string;
  control: FormControl<string>;
  label: string;
  type: FormTypes;
}

interface ModuleSelectField<T> {
  code: string;
  flex: string;
  control: FormControl<T>;
  label: string;
  type: FormTypes;
  options$: Observable<T[]>;
}

interface ModuleAutocompleteField {
  code: string;
  flex: string;
  control: FormControl<string>;
  label: string;
  type: FormTypes;
  options$: Observable<IdNameOption[]>;
}

interface ModuleBrowserFields {
  name: ModuleTextField;
  description: ModuleTextField;
  hp: ModuleTextField;
  manufacturers: ModuleAutocompleteField;
  hpCondition: ModuleSelectField<HpConditionOption>;
  order: ModuleSelectField<ModuleOrderOption>;
  standard: ModuleSelectField<IdNumberOption>;
}

const DEFAULT_HP_CONDITION: HpConditionOption = {id: '=', name: 'exactly'};
const DEFAULT_STANDARD: IdNumberOption = {id: undefined, name: 'All'};

const MODULE_ORDER_OPTIONS: ModuleOrderOption[] = [
  {id: 'name', name: 'Name ↑'},
  {id: 'name', name: 'Name ↓'},
  {id: 'hp', name: 'HP ↑'},
  {id: 'hp', name: 'HP ↓'},
  {id: 'manufacturerId', name: 'Manufacturer ↑'},
  {id: 'manufacturerId', name: 'Manufacturer ↓'},
  {id: 'created', name: 'Created ↑'},
  {id: 'created', name: 'Created ↓'},
  {id: 'updated', name: 'Updated ↑'},
  {id: 'updated', name: 'Updated ↓'},
  {id: 'isComplete', name: 'Data Complete ↓'},
];

@Injectable()
export class ModuleBrowserDataService extends SubManager {
  readonly modulesList$ = new BehaviorSubject<ModuleList>(null);
  readonly updateModulesList$ = new Subject<void>();
  readonly resetForm$ = new Subject<void>();
  readonly pageEvent$ = new Subject<PageEvent>();
  readonly paginatorToFistPage$ = new Subject<void>();
  
  readonly serversideTableRequestData = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(20),
    filter$: new BehaviorSubject<string>(''),
    sort$: new BehaviorSubject<[string, string]>(['updated', 'desc'])
  };
  
  readonly serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0)
  };
  
  readonly orderStartingValue: ModuleOrderOption = {id: 'updated', name: 'Updated ↓'};
  readonly fields: ModuleBrowserFields;
  readonly canReset$: Observable<boolean>;
  
  constructor(private backend: SupabaseService) {
    super();

    this.fields = {
      name: {
        label: 'Search module...',
        code: 'search',
        flex: '14rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.TEXT
      },
      description: {
        label: 'Description',
        code: 'description',
        flex: '14rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.TEXT
      },
      order: {
        label: 'Order by',
        code: 'order',
        flex: '10rem',
        control: new FormControl<ModuleOrderOption>(this.orderStartingValue, {nonNullable: true}),
        type: FormTypes.SELECT,
        options$: of(MODULE_ORDER_OPTIONS)
      },
      manufacturers: {
        label: 'Made by...',
        code: 'manufacturers',
        flex: '12rem',
        control: new FormControl<string>('', {nonNullable: true}),
        type: FormTypes.AUTOCOMPLETE,
        options$: this.backend.GET.manufacturers(0, 9999, 'id,name')
          .pipe(
            map(x => x.data.map(z => ({id: z.id.toString(), name: z.name}))),
            startWith([]),
            takeUntil(this.destroy$),
            share()
          )
      },
      hp: {
        label: 'HP',
        code: 'hp',
        flex: '6rem',
        control: new FormControl<string>('', {
          nonNullable: true,
          validators: Validators.compose([
            Validators.min(1),
            Validators.pattern(/^-?\d+$/),
          ])
        }),
        type: FormTypes.NUMBER
      },
      hpCondition: {
        label: 'HP must be...',
        code: 'hpCondition',
        flex: '8rem',
        control: new FormControl<HpConditionOption>(DEFAULT_HP_CONDITION, {nonNullable: true}),
        type: FormTypes.SELECT,
        options$: of([
          {id: '=' as HpConditionOperator, name: 'exactly'},
          {id: '!=' as HpConditionOperator, name: 'different than'},
          {id: '>' as HpConditionOperator, name: 'more than'},
          {id: '<' as HpConditionOperator, name: 'less than'},
          {id: '>=' as HpConditionOperator, name: 'more or exactly'},
          {id: '<=' as HpConditionOperator, name: 'less or exactly'},
        ])
      },
      standard: {
        label: 'Standard',
        code: 'standard',
        flex: '8rem',
        control: new FormControl<IdNumberOption>(DEFAULT_STANDARD, {nonNullable: true}),
        type: FormTypes.SELECT,
        options$: of([
          {id: undefined, name: 'All'},
          {id: 0, name: '3U Doepfer'},
          {id: 1, name: '1U Intellijel'},
          {id: 2, name: '1U Pulp Logic'},
        ])
      }
    };

    this.canReset$ = merge(
      this.fields.name.control.valueChanges,
      this.fields.description.control.valueChanges,
      this.fields.manufacturers.control.valueChanges,
      this.fields.hp.control.valueChanges,
      this.fields.hpCondition.control.valueChanges,
      this.fields.standard.control.valueChanges,
      this.fields.order.control.valueChanges
    ).pipe(
      startWith(null),
      map(() => {
        const hp = this.fields.hp.control.value;
        const hpCondition = this.fields.hpCondition.control.value;
        const standard = this.fields.standard.control.value;
        const order = this.fields.order.control.value;
        return (
          this.fields.name.control.value !== '' ||
          this.fields.description.control.value !== '' ||
          isOption(this.fields.manufacturers.control.value) ||
          (hp !== '' && hp !== null) ||
          (hpCondition && hpCondition.id !== DEFAULT_HP_CONDITION.id) ||
          (standard && standard.id !== undefined) ||
          (order && order.id !== this.orderStartingValue.id)
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
        this.updateModulesList$.next();
      });
    
    // Single merged pipeline — debounce collapses reset burst into one fetch.
    merge(
      this.fields.name.control.valueChanges,
      this.fields.description.control.valueChanges,
      this.fields.manufacturers.control.valueChanges,
      this.fields.hp.control.valueChanges,
      this.fields.hpCondition.control.valueChanges,
      this.fields.standard.control.valueChanges,
      this.fields.order.control.valueChanges
    ).pipe(
      debounceTime(750),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const orderVal = this.fields.order.control.value;
      const nameVal = this.fields.name.control.value ?? '';
      this.serversideTableRequestData.filter$.next(nameVal);
      this.serversideTableRequestData.sort$.next([
        orderVal?.id ?? '',
        orderVal?.name?.includes('↑') ? 'asc' : 'desc'
      ]);
      this.serversideTableRequestData.skip$.next(0);
      this.paginatorToFistPage$.next();
      this.updateModulesList$.next();
    });

    this.updateModulesList$
      .pipe(
        switchMap(() => {
          const skip = this.serversideTableRequestData.skip$.value;
          const take = this.serversideTableRequestData.take$.value;
          const filter = this.serversideTableRequestData.filter$.value;
          const [sortCol, sortDir] = this.serversideTableRequestData.sort$.value;
          const standard = this.fields.standard.control.value?.id;
          
          return this.backend.GET.modules(
            skip,
            (skip + take) - 1,
            filter,
            sortCol || null,
            sortDir,
            parseInt(getCleanedValueId(this.fields.manufacturers.control)),
            parseInt(this.fields.hp.control.value),
            this.fields.hpCondition.control.value?.id,
            standard,
            this.fields.description.control.value
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        this.serversideAdditionalData.itemsCount$.next(x.count);
        this.modulesList$.next(x.data);
      });
    
    this.resetForm$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.backend.cacheResetter$.next(['modules']);
        this.fields.name.control.setValue('');
        this.fields.description.control.setValue('');
        this.fields.order.control.setValue(this.orderStartingValue);
        this.fields.manufacturers.control.setValue('');
        this.fields.hp.control.setValue('');
        this.fields.hpCondition.control.setValue(DEFAULT_HP_CONDITION);
        this.fields.standard.control.setValue(DEFAULT_STANDARD);
        this.serversideTableRequestData.filter$.next('');
        this.serversideTableRequestData.sort$.next([this.orderStartingValue.id, 'desc']);
        this.serversideTableRequestData.skip$.next(0);
        this.paginatorToFistPage$.next();
        this.updateModulesList$.next();
      });
  }
}