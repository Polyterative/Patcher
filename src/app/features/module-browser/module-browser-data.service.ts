import { Injectable } from '@angular/core';
import {
  FormControl,
  Validators
} from '@angular/forms';
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
  share,
  shareReplay,
  skip,
  startWith,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { MinimalModule } from '../../models/module';
import { TAG_TYPE_LABELS, Tag, TagSuggestionGroup } from '../../models/tag';
import {
  FormTypes,
  getCleanedValueId,
  ISelectable,
  isOption
} from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { matchesSearchQuery } from '../../shared-interproject/components/@smart/mat-form-entity/string-utils';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import {
  compareModulesByHpAsc,
  compareModulesByHpDesc,
  compareModulesByManufacturerAsc,
  compareModulesByManufacturerDesc,
  compareModulesByNameAsc,
  compareModulesByNameDesc,
  compareModulesByUpdatedAsc,
  compareModulesByUpdatedDesc
} from '../../shared-interproject/utils/module-sort-utils';
import { SupabaseService } from '../backend/supabase.service';
import {
  HpConditionOption,
  HpConditionOperator,
  IdNumberOption,
  ModuleBrowserFields,
  ModuleList,
  ModuleOrderOption
} from './module-browser-data.models';
import {
  DEFAULT_HP_CONDITION,
  DEFAULT_STANDARD,
  MODULE_ORDER_OPTIONS,
  OWNED_MODE_DEFAULT_ORDER
} from './module-browser-data.constants';
import {
  compareModulesByCreated,
  getModuleStandardId,
  matchesSelectedTags,
  toSortDirection
} from './module-browser-data.utils';

export type { ModuleList, ModuleOrderOption } from './module-browser-data.models';


@Injectable()
export class ModuleBrowserDataService extends SubManager {
  readonly modulesList$ = new BehaviorSubject<ModuleList>(null);
  readonly remoteTagFilterLoading$ = new BehaviorSubject<boolean>(false);
  readonly tagMatchMode$ = new BehaviorSubject<'OR' | 'AND'>('OR');
  readonly tagSearchQuery$ = new BehaviorSubject<string>('');
  readonly updateModulesList$ = new Subject<void>();
  readonly loadMore$ = new Subject<void>();
  readonly moduleFilterInteraction$ = new Subject<void>();
  readonly modulesLoadingTrigger$ = merge(
    this.moduleFilterInteraction$,
    this.updateModulesList$
  );
  readonly resetForm$ = new Subject<void>();
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
  readonly ownedModeOrderStartingValue: ModuleOrderOption = OWNED_MODE_DEFAULT_ORDER;
  readonly bestMatchOrderOption: ModuleOrderOption = {id: 'best-match', name: 'Best match'};
  readonly allTags$: Observable<Tag[]>;
  readonly groupedFilterTags$: Observable<TagSuggestionGroup[]>;
  readonly fields: ModuleBrowserFields;
  readonly canReset$: Observable<boolean>;

  constructor(private backend: SupabaseService) {
    super();
    this.backend.cacheResetter$?.next(['manufacturers']);

    this.allTags$ = this.backend.get.allTags().pipe(
      startWith([]),
      shareReplay(1),
      takeUntil(this.destroy$)
    );

    this.groupedFilterTags$ = combineLatest([
      this.allTags$,
      this.tagSearchQuery$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(this.tagSearchQuery$.value)
      )
    ]).pipe(
      map(([tags, query]) => {
        const normalizedQuery = query.trim().toLowerCase();
        const visibleTags = normalizedQuery
          ? tags.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery))
          : tags;
        const grouped = new Map<string, Tag[]>();

        for (const tag of visibleTags) {
          const label = TAG_TYPE_LABELS[tag.type] ?? 'Other';
          grouped.set(label, [...(grouped.get(label) ?? []), tag]);
        }

        return Array.from(grouped.entries()).map(([label, groupedTags]) => ({
          label,
          tags: groupedTags
        }));
      }),
      shareReplay(1),
      takeUntil(this.destroy$)
    );

    const orderControl = new FormControl<ModuleOrderOption>(this.orderStartingValue, {nonNullable: true});
    const tagsControl = new FormControl<ISelectable[]>([], {nonNullable: true});
    const orderOptions$ = tagsControl.valueChanges.pipe(
      startWith(tagsControl.value),
      map((selectedTags) => (selectedTags?.length ?? 0) > 0
        ? [...MODULE_ORDER_OPTIONS, this.bestMatchOrderOption]
        : MODULE_ORDER_OPTIONS
      ),
      shareReplay(1),
      takeUntil(this.destroy$)
    );

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
        options$: this.backend.GET.manufacturers(0, 9999, 'id,name')
          .pipe(
            map(x => (x.data ?? []).map(z => ({id: z.id.toString(), name: z.name}))),
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
      },
      tags: {
        label: 'Filter by tags...',
        code: 'tags',
        flex: '14rem',
        control: tagsControl,
        type: FormTypes.MULTISELECT,
        options$: this.allTags$.pipe(
          map(tags => (tags ?? []).map((tag) => ({id: tag.id.toString(), name: tag.name}))),
          startWith([]),
          takeUntil(this.destroy$),
          share()
        )
      }
    };

    this.canReset$ = merge(
      this.fields.name.control.valueChanges,
      this.fields.description.control.valueChanges,
      this.fields.manufacturers.control.valueChanges,
      this.fields.hp.control.valueChanges,
      this.fields.hpCondition.control.valueChanges,
      this.fields.standard.control.valueChanges,
      this.fields.order.control.valueChanges,
      this.fields.tags.control.valueChanges,
      this.tagMatchMode$
    ).pipe(
      startWith(null),
      map(() => {
        const hp = this.fields.hp.control.value;
        const hpCondition = this.fields.hpCondition.control.value;
        const standard = this.fields.standard.control.value;
        const order = this.fields.order.control.value;
        const tags = this.fields.tags.control.value;
        return (
          this.fields.name.control.value !== '' ||
          this.fields.description.control.value !== '' ||
          isOption(this.fields.manufacturers.control.value) ||
          (hp !== '' && hp !== null) ||
          (hpCondition && hpCondition.id !== DEFAULT_HP_CONDITION.id) ||
          (standard && standard.id !== undefined) ||
          (order && order.id !== this.orderStartingValue.id) ||
          (tags && tags.length > 0) ||
          this.tagMatchMode$.value !== 'OR'
        );
      }),
      distinctUntilChanged(),
      shareReplay(1)
    );

    merge(
      this.fields.name.control.valueChanges,
      this.fields.description.control.valueChanges,
      this.fields.manufacturers.control.valueChanges,
      this.fields.hp.control.valueChanges,
      this.fields.hpCondition.control.valueChanges,
      this.fields.standard.control.valueChanges,
      this.fields.order.control.valueChanges,
      this.fields.tags.control.valueChanges
    ).pipe(
      tap(() => this.moduleFilterInteraction$.next()),
      debounceTime(750),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const orderVal = this.fields.order.control.value;
      const nameVal = this.fields.name.control.value ?? '';
      const isBestMatchOrder = orderVal?.id === this.bestMatchOrderOption.id;
      this.serversideTableRequestData.filter$.next(nameVal);
      this.serversideTableRequestData.sort$.next([
        isBestMatchOrder ? this.orderStartingValue.id : (orderVal?.id ?? ''),
        isBestMatchOrder ? 'desc' : toSortDirection(orderVal?.name)
      ]);
      this.serversideTableRequestData.skip$.next(0);
      this.paginatorToFistPage$.next();
      this.updateModulesList$.next();
    });

    this.fields.tags.control.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((selectedTags) => {
        const currentOrder = this.fields.order.control.value;
        const selectedCount = selectedTags?.length ?? 0;

        if (selectedCount > 0 && currentOrder?.id === this.orderStartingValue.id) {
          this.fields.order.control.setValue(this.bestMatchOrderOption);
        } else if (selectedCount === 0 && currentOrder?.id === this.bestMatchOrderOption.id) {
          this.fields.order.control.setValue(this.orderStartingValue);
        }

        if (this.modulesList$.value !== null) {
          this.remoteTagFilterLoading$.next(true);
        }
      });

    this.tagMatchMode$
      .pipe(
        distinctUntilChanged(),
        skip(1),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.modulesList$.value !== null && this.getSelectedTagIds().length > 0) {
          this.remoteTagFilterLoading$.next(true);
        }
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
          const tagIds = this.getSelectedTagIds();
          const includeCount = skip === 0;

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
              this.fields.description.control.value,
              true,
              tagIds.length > 0 ? tagIds : undefined,
              includeCount
            )
            .pipe(catchError(error => {
              console.error('Failed to load modules:', error);
              return of({data: [], count: 0});
            }));
        }),
        map((response) => {
          const selectedTagIds = this.getSelectedTagIds();
          let data = response.data ?? [];

          if (this.tagMatchMode$.value === 'AND' && selectedTagIds.length > 0) {
            data = data.filter((module) => matchesSelectedTags(module, selectedTagIds, 'AND'));
          }

          if (this.fields.order.control.value?.id === this.bestMatchOrderOption.id) {
            data = this.sortModulesByBestMatch(data);
          }

          return {
            ...response,
            data
          };
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(response => {
        this.serversideAdditionalData.itemsCount$.next(
          response.count ?? this.serversideAdditionalData.itemsCount$.value
        );
        const skip = this.serversideTableRequestData.skip$.value;
        const current = this.modulesList$.value ?? [];
        this.modulesList$.next(skip === 0 ? response.data : [...current, ...response.data]);
        this.remoteTagFilterLoading$.next(false);
      });

    this.loadMore$
      .pipe(
        withLatestFrom(this.modulesList$),
        takeUntil(this.destroy$)
      )
      .subscribe(([_, current]) => {
        this.serversideTableRequestData.skip$.next(current?.length ?? 0);
        this.updateModulesList$.next();
      });

    this.resetForm$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.backend.cacheResetter$.next(['modules']);
        const shouldTriggerManualReload = this.tagMatchMode$.value === 'OR';
        const silent = {emitEvent: false};
        this.fields.name.control.setValue('', silent);
        this.fields.description.control.setValue('', silent);
        this.fields.order.control.setValue(this.orderStartingValue, silent);
        this.fields.manufacturers.control.setValue('', silent);
        this.fields.hp.control.setValue('', silent);
        this.fields.hpCondition.control.setValue(DEFAULT_HP_CONDITION, silent);
        this.fields.standard.control.setValue(DEFAULT_STANDARD, silent);
        this.fields.tags.control.setValue([], silent);
        this.tagMatchMode$.next('OR');
        this.tagSearchQuery$.next('');
        this.serversideTableRequestData.filter$.next('');
        this.serversideTableRequestData.sort$.next([this.orderStartingValue.id, 'desc']);
        this.serversideTableRequestData.skip$.next(0);
        this.paginatorToFistPage$.next();
        if (shouldTriggerManualReload) {
          this.updateModulesList$.next();
        }
      });
  }

  applyOwnedModeDefaultOrder(): void {
    const currentOrder = this.fields.order.control.value;
    if (currentOrder?.id === this.orderStartingValue.id) {
      this.fields.order.control.setValue(this.ownedModeOrderStartingValue);
    }
  }

  hasActiveModuleFilters(): boolean {
    const hp = this.fields.hp.control.value;
    const hpCondition = this.fields.hpCondition.control.value;
    const standard = this.fields.standard.control.value;
    const tags = this.fields.tags.control.value;

    return (
      this.fields.name.control.value.trim() !== ''
      || this.fields.description.control.value.trim() !== ''
      || isOption(this.fields.manufacturers.control.value)
      || (hp !== '' && hp !== null)
      || (hpCondition && hpCondition.id !== DEFAULT_HP_CONDITION.id)
      || (standard && standard.id !== undefined)
      || (tags && tags.length > 0)
    );
  }

  toggleTagFilter(tag: Tag): void {
    const selectedTags = this.fields.tags.control.value ?? [];
    const isSelected = selectedTags.some((selectedTag) => Number.parseInt(selectedTag.id, 10) === tag.id);
    const nextTags = isSelected
      ? selectedTags.filter((selectedTag) => Number.parseInt(selectedTag.id, 10) !== tag.id)
      : [...selectedTags, {id: tag.id.toString(), name: tag.name}];

    this.fields.tags.control.setValue(nextTags);
  }

  filterOwnedModules(
    modules: MinimalModule[] | undefined,
    excludedModuleIds: number[] = []
  ): MinimalModule[] | undefined {
    if (modules === undefined) {
      return undefined;
    }

    const excludedIds = new Set(excludedModuleIds);
    const filteredModules = modules.filter((module) =>
      !excludedIds.has(module.id) && this.matchesOwnedModuleFilters(module)
    );
    return this.sortOwnedModules(filteredModules);
  }

  sortModulesByBestMatch(modules: MinimalModule[]): MinimalModule[] {
    const selectedTagIds = this.getSelectedTagIds();
    return [...modules].sort((a, b) => {
      const scoreDiff = this.getModuleTagMatchScore(b, selectedTagIds) - this.getModuleTagMatchScore(a, selectedTagIds);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return compareModulesByNameAsc(a, b);
    });
  }

  private matchesOwnedModuleFilters(module: MinimalModule): boolean {
    const selectedManufacturerId = Number.parseInt(getCleanedValueId(this.fields.manufacturers.control), 10);
    const hpValue = Number.parseInt(this.fields.hp.control.value, 10);
    const selectedStandardId = this.fields.standard.control.value?.id;
    const selectedTagIds = this.getSelectedTagIds();

    if (!matchesSearchQuery(this.fields.name.control.value, module.name)) {
      return false;
    }

    if (!matchesSearchQuery(this.fields.description.control.value, module.description)) {
      return false;
    }

    if (Number.isFinite(selectedManufacturerId) && module.manufacturerId !== selectedManufacturerId) {
      return false;
    }

    if (
      selectedStandardId !== undefined
      && getModuleStandardId(module) !== selectedStandardId
    ) {
      return false;
    }

    if (Number.isFinite(hpValue) && !this.matchesHpCondition(module.hp, hpValue)) {
      return false;
    }

    if (selectedTagIds.length > 0 && !matchesSelectedTags(module, selectedTagIds, this.tagMatchMode$.value)) {
      return false;
    }

    return true;
  }

  private matchesHpCondition(moduleHp: number, hpValue: number): boolean {
    switch (this.fields.hpCondition.control.value?.id) {
      case '!=':
        return moduleHp !== hpValue;
      case '>':
        return moduleHp > hpValue;
      case '<':
        return moduleHp < hpValue;
      case '>=':
        return moduleHp >= hpValue;
      case '<=':
        return moduleHp <= hpValue;
      case '=':
      default:
        return moduleHp === hpValue;
    }
  }

  private sortOwnedModules(modules: MinimalModule[]): MinimalModule[] {
    const order = this.fields.order.control.value;
    const direction = toSortDirection(order?.name);

    const sortedModules = [...modules];
    switch (order?.id) {
      case 'best-match':
        return this.sortModulesByBestMatch(sortedModules);
      case 'name':
        return sortedModules.sort(direction === 'asc' ? compareModulesByNameAsc : compareModulesByNameDesc);
      case 'hp':
        return sortedModules.sort(direction === 'asc' ? compareModulesByHpAsc : compareModulesByHpDesc);
      case 'manufacturerId':
        return sortedModules.sort(direction === 'asc' ? compareModulesByManufacturerAsc : compareModulesByManufacturerDesc);
      case 'created':
        return sortedModules.sort((a, b) => compareModulesByCreated(a, b, direction));
      case 'updated':
        return sortedModules.sort(direction === 'asc' ? compareModulesByUpdatedAsc : compareModulesByUpdatedDesc);
      default:
        return sortedModules;
    }
  }

  private getSelectedTagIds(): number[] {
    return (this.fields.tags.control.value ?? [])
      .map((tag) => Number.parseInt(tag.id, 10))
      .filter((id) => Number.isFinite(id));
  }

  private getModuleTagMatchScore(module: MinimalModule, selectedTagIds: number[]): number {
    return selectedTagIds.filter((selectedTagId) =>
      module.tags?.some((tagVote) => tagVote.tag?.id === selectedTagId)
    ).length;
  }
}
