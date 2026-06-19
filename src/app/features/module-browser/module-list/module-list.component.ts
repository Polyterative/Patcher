import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal
} from '@angular/core';
import { animate, animateChild, query, style, transition, trigger } from '@angular/animations';
import {
  FormControl,
  UntypedFormControl
} from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of
} from 'rxjs';
import {
  filter,
  map,
  startWith
} from 'rxjs/operators';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { LocalDataFilterService } from 'src/app/components/shared-atoms/local-data-filter/local-data-filter.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { matchesSearchQuery } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  FormTypes,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  MODULE_GROUP_OPTIONS,
  MODULE_SORT_OPTIONS,
  ModuleGroupId,
  ModuleSortId,
  sortAndGroupMinimalModules
} from 'src/app/shared-interproject/utils/module-sort-utils';
import { ModuleList } from '../module-browser-data.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { HpConditionOption } from '../module-browser-data.models';
import {
  DEFAULT_HP_CONDITION,
  DEFAULT_STANDARD
} from '../module-browser-data.constants';
import {
  applyHpCondition,
  getModuleStandardId,
  matchesSelectedTags
} from '../module-browser-data.utils';
import { Tag } from 'src/app/models/tag';
import { MinimalModule } from 'src/app/models/module';
import { ReactionEntityTypes } from 'src/app/features/backend/supabase-reactions';
import { environment } from 'src/environments/environment';

// Re-export so existing consumers that imported these from here still compile.
export type ModuleListSortId = ModuleSortId;
export type ModuleListGroupId = ModuleGroupId;
export const MODULE_LIST_SORT_OPTIONS = MODULE_SORT_OPTIONS;
export const MODULE_LIST_GROUP_OPTIONS = MODULE_GROUP_OPTIONS;

const ALL_STANDARD_OPTION: ISelectable = {id: '', name: DEFAULT_STANDARD.name};

export interface ModuleListActionConfig {
  icon: string;
  label: string;
  disabledIcon?: string;
  disabledLabel?: string;
}


@Component({
  selector: 'app-module-list',
  templateUrl: './module-list.component.html',
  styleUrls: ['./module-list.component.scss'],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('225ms {{ delay }}ms ease', style({opacity: 1})),
        query('@*', animateChild(), { optional: true })
      ], { params: { delay: 0 } })
    ]),
    trigger('leave', [
      transition(':leave', [
        animate('1ms ease', style({opacity: 0}))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [LocalDataFilterService],
  standalone: false
})
export class ModuleListComponent extends SubManager implements OnInit {
  @Input() data$: Observable<ModuleList>;
  @Input() viewConfig: ModuleMinimalViewConfig = {...defaultModuleMinimalViewConfig};

  @Input() showSearch = false;
  @Input() showOrder = false;
  @Input() showFilters = false;
  @Input() encloseVertically = true;
  @Input() emptyStateCopy = '';
  /** When true, suppresses the empty-state block even if the list is empty.
   *  Use when the parent knows more items are available to load. */
  @Input() suppressEmpty = false;
  /** Pre-selects a grouping mode when the list first renders. Defaults to 'none'. */
  @Input() defaultGroupId: ModuleGroupId = 'none';
  @Input() moduleAction: ModuleListActionConfig | null = null;
  @Input() moduleActionDisabledIds: ReadonlySet<number> | null = null;
  @Output() readonly moduleAction$ = new EventEmitter<MinimalModule>();
  readonly coolReactionsEnabled = environment.features.coolReactionsEnabled;
  readonly ReactionEntityTypes = ReactionEntityTypes;

  private readonly externalSearchQuery$ = new BehaviorSubject<string>('');

  @Input()
  set externalSearchQuery(value: string) {
    this.externalSearchQuery$.next(value ?? '');
  }

  private readonly _filteredData$ = new BehaviorSubject<ModuleList>([]);
  readonly filteredData$ = this._filteredData$.asObservable();
  private readonly visibleModuleIds = signal<ReadonlySet<number>>(new Set<number>());
  private readonly enterDelayByModuleId = signal<ReadonlyMap<number, number>>(new Map<number, number>());
  
  // Sort & group controls (active when showOrder = true)
  readonly formTypes = FormTypes;
  readonly sortOptions$: Observable<ISelectable[]> = of(MODULE_SORT_OPTIONS);
  readonly groupOptions$: Observable<ISelectable[]> = of(MODULE_GROUP_OPTIONS);
  readonly sortControl = new UntypedFormControl(MODULE_SORT_OPTIONS[0]);
  readonly groupControl = new UntypedFormControl(MODULE_GROUP_OPTIONS[0]);

  // Filter controls (active when showFilters = true)
  readonly standardControl = new FormControl<ISelectable>(ALL_STANDARD_OPTION, {nonNullable: true});
  readonly hpControl = new UntypedFormControl('');
  readonly hpConditionControl = new FormControl<HpConditionOption>(DEFAULT_HP_CONDITION, {nonNullable: true});
  readonly tagsControl = new FormControl<number[]>([], {nonNullable: true});

  readonly standardOptions$: Observable<ISelectable[]> = of([
    ALL_STANDARD_OPTION,
    {id: '0', name: '3U Doepfer'},
    {id: '1', name: '1U Intellijel'},
    {id: '2', name: '1U Pulp Logic'},
  ]);
  readonly hpConditionOptions$: Observable<ISelectable[]> = of([
    {id: '=', name: 'exactly'},
    {id: '!=', name: 'not'},
    {id: '>', name: '> more than'},
    {id: '<', name: '< less than'},
    {id: '>=', name: '>= at least'},
    {id: '<=', name: '<= at most'},
  ]);
  availableTags$: Observable<Tag[]> = of([]);
  canReset$: Observable<boolean> = of(false);

  constructor(
    public patchingService: PatchDetailDataService,
    public filterService: LocalDataFilterService,
    public appState: AppStateService,
    destroyRef?: DestroyRef
  ) {
    super(destroyRef);
  }

  ngOnInit(): void {
    if (this.defaultGroupId !== 'none') {
      const defaultOption = MODULE_GROUP_OPTIONS.find(o => o.id === this.defaultGroupId);
      if (defaultOption) {
        this.groupControl.setValue(defaultOption, {emitEvent: false});
      }
    }

    if (this.showFilters) {
      this.availableTags$ = this.data$.pipe(
        map(modules => {
          if (!modules) return [];
          const seen = new Set<number>();
          const tags: Tag[] = [];
          for (const m of modules) {
            for (const t of (m.tags ?? [])) {
              if (t.tag && !seen.has(t.tag.id)) {
                seen.add(t.tag.id);
                tags.push(t.tag);
              }
            }
          }
          return tags.sort((a, b) => a.name.localeCompare(b.name));
        })
      );

      this.canReset$ = combineLatest([
        this.standardControl.valueChanges.pipe(startWith(this.standardControl.value)),
        this.hpControl.valueChanges.pipe(startWith(this.hpControl.value)),
        this.tagsControl.valueChanges.pipe(startWith(this.tagsControl.value)),
      ]).pipe(
        map(([std, hp, tags]) =>
          this.selectedStandardId(std) !== undefined || (hp !== '' && hp !== null) || tags.length > 0
        )
      );
    }

    const localSearchQuery$ = this.showSearch
      ? this.filterService.filterEvent$.pipe(startWith(''))
      : of('');
    
    const sortId$: Observable<ModuleSortId> = this.showOrder
      ? this.sortControl.valueChanges.pipe(
        startWith(this.sortControl.value),
        map((v: ISelectable | null) => (v?.id as ModuleSortId) ?? 'updatedDesc')
      )
      : of('backend' as ModuleSortId);
    
    const groupId$: Observable<ModuleGroupId> = this.showOrder
      ? this.groupControl.valueChanges.pipe(
        startWith(this.groupControl.value),
        map((v: ISelectable | null) => (v?.id as ModuleGroupId) ?? 'none')
      )
      : of('none' as ModuleGroupId);

    const standardId$: Observable<number | undefined> = this.showFilters
      ? this.standardControl.valueChanges.pipe(
          startWith(this.standardControl.value),
          map(v => this.selectedStandardId(v))
        )
      : of(undefined);

    const hpValue$ = this.showFilters
      ? this.hpControl.valueChanges.pipe(startWith(this.hpControl.value))
      : of('');

    const hpConditionId$: Observable<string> = this.showFilters
      ? this.hpConditionControl.valueChanges.pipe(
          startWith(this.hpConditionControl.value),
          map(v => v?.id ?? '=')
        )
      : of('=');

    const selectedTagIds$: Observable<number[]> = this.showFilters
      ? this.tagsControl.valueChanges.pipe(startWith(this.tagsControl.value))
      : of([]);
    
    this.manageSub(
      combineLatest([
        this.data$.pipe(filter(data => !!data)),
        localSearchQuery$,
        this.externalSearchQuery$,
        sortId$,
        groupId$,
        standardId$,
        hpValue$,
        hpConditionId$,
        selectedTagIds$,
      ]).subscribe(([data, localQuery, externalQuery, sortId, groupId, standardId, hpRaw, hpConditionId, tagIds]) => {
        const hpValue = Number.parseInt(hpRaw, 10);
        const filtered = data.filter(item => {
          const searchFields = [
            item.name,
            item.manufacturer?.name,
            item.description,
            ...(item.tags ?? []).map(tagVote => tagVote.tag?.name ?? '')
          ];

          if (!matchesSearchQuery(localQuery, ...searchFields)) return false;
          if (!matchesSearchQuery(externalQuery, ...searchFields)) return false;
          if (standardId !== undefined && getModuleStandardId(item) !== standardId) return false;
          if (Number.isFinite(hpValue) && !applyHpCondition(item.hp, hpValue, hpConditionId)) return false;
          if (tagIds.length > 0 && !matchesSelectedTags(item, tagIds, 'OR')) return false;
          return true;
        });
        
        this.updateFilteredData(sortAndGroupMinimalModules(filtered, sortId, groupId));
      })
    );
  }

  getEnterDelay(moduleId: number): number {
    return this.enterDelayByModuleId().get(moduleId) ?? 50;
  }

  resetFilters(): void {
    this.standardControl.setValue(ALL_STANDARD_OPTION);
    this.hpControl.setValue('');
    this.hpConditionControl.setValue(DEFAULT_HP_CONDITION);
    this.tagsControl.setValue([]);
  }

  isModuleActionDisabled(module: MinimalModule): boolean {
    return this.moduleActionDisabledIds?.has(module.id) ?? false;
  }

  getModuleActionIcon(module: MinimalModule): string {
    if (this.isModuleActionDisabled(module)) {
      return this.moduleAction?.disabledIcon ?? this.moduleAction?.icon ?? '';
    }
    return this.moduleAction?.icon ?? '';
  }

  getModuleActionLabel(module: MinimalModule): string {
    if (this.isModuleActionDisabled(module)) {
      return this.moduleAction?.disabledLabel ?? this.moduleAction?.label ?? '';
    }
    return this.moduleAction?.label ?? '';
  }
  
  orderData(moduleList: ModuleList): ModuleList {
    return moduleList;
  }

  toggleTagFilter(tagId: number): void {
    const current = this.tagsControl.value;
    const next = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId];
    this.tagsControl.setValue(next);
  }

  private updateFilteredData(data: MinimalModule[]): void {
    const nextVisibleIds = new Set(data.map(module => module.id));
    let newItemIndex = 0;
    const nextEnterDelayByModuleId = new Map<number, number>();
    const previousVisibleIds = this.visibleModuleIds();

    for (const module of data) {
      const delayIndex = previousVisibleIds.has(module.id) ? 0 : newItemIndex++;
      nextEnterDelayByModuleId.set(module.id, (delayIndex * 25) + 50);
    }

    this.visibleModuleIds.set(nextVisibleIds);
    this.enterDelayByModuleId.set(nextEnterDelayByModuleId);
    this._filteredData$.next(data);
  }

  private selectedStandardId(option: ISelectable | null | undefined): number | undefined {
    if (!option?.id) {
      return undefined;
    }
    const id = Number.parseInt(option.id, 10);
    return Number.isFinite(id) ? id : undefined;
  }
}
