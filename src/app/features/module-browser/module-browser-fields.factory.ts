import { FormControl, Validators } from '@angular/forms';
import { MonoTypeOperatorFunction, Observable, of } from 'rxjs';
import { map, share, shareReplay, startWith } from 'rxjs/operators';
import { Tag } from '../../models/tag';
import {
  FormTypes,
  ISelectable
} from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SupabaseService } from '../backend/supabase.service';
import {
  HpConditionOperator,
  ModuleBrowserFields,
  ModuleOrderOption
} from './module-browser-data.models';
import {
  DEFAULT_HP_CONDITION,
  DEFAULT_STANDARD,
  MODULE_ORDER_OPTIONS
} from './module-browser-data.constants';

interface CreateModuleBrowserFieldsOptions {
  allTags$: Observable<Tag[]>;
  backend: SupabaseService;
  bestMatchOrderOption: ModuleOrderOption;
  orderStartingValue: ModuleOrderOption;
  takeUntilDestroyed: <T>() => MonoTypeOperatorFunction<T>;
}

export function createModuleBrowserFields({
  allTags$,
  backend,
  bestMatchOrderOption,
  orderStartingValue,
  takeUntilDestroyed
}: CreateModuleBrowserFieldsOptions): ModuleBrowserFields {
  const orderControl = new FormControl<ModuleOrderOption>(orderStartingValue, {nonNullable: true});
  const tagsControl = new FormControl<ISelectable[]>([], {nonNullable: true});
  const orderOptions$ = tagsControl.valueChanges.pipe(
    startWith(tagsControl.value),
    map((selectedTags) => (selectedTags?.length ?? 0) > 0
      ? [...MODULE_ORDER_OPTIONS, bestMatchOrderOption]
      : MODULE_ORDER_OPTIONS
    ),
    shareReplay(1),
    takeUntilDestroyed()
  );

  return {
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
      control: orderControl,
      type: FormTypes.SELECT,
      options$: orderOptions$
    },
    manufacturers: {
      label: 'Made by...',
      code: 'manufacturers',
      flex: '12rem',
      control: new FormControl<string>('', {nonNullable: true}),
      type: FormTypes.AUTOCOMPLETE,
      options$: backend.GET.manufacturers(0, 99999, 'id,name')
        .pipe(
          map(x => (x.data ?? []).map(z => ({id: z.id.toString(), name: z.name}))),
          startWith([]),
          takeUntilDestroyed(),
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
      control: new FormControl(DEFAULT_HP_CONDITION, {nonNullable: true}),
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
      control: new FormControl(DEFAULT_STANDARD, {nonNullable: true}),
      type: FormTypes.SELECT,
      options$: of([
        {id: undefined, name: 'All'},
        {id: 0, name: '3U Doepfer'},
        {id: 1, name: '1U Intellijel'},
        {id: 2, name: '1U Pulp Logic'},
      ])
    },
    tags: {
      label: 'Filter by tags...',
      code: 'tags',
      flex: '14rem',
      control: tagsControl,
      type: FormTypes.MULTISELECT,
      options$: allTags$.pipe(
        map(tags => (tags ?? []).map((tag) => ({id: tag.id.toString(), name: tag.name}))),
        startWith([]),
        takeUntilDestroyed(),
        share()
      )
    },
    tagSearch: {
      label: 'Search tags…',
      code: 'tagSearch',
      flex: '14rem',
      control: new FormControl<string>('', {nonNullable: true}),
      type: FormTypes.TEXT
    }
  };
}
