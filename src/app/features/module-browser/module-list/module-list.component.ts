import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  FormControl,
  UntypedFormControl
} from '@angular/forms';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from 'angular-animations';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of
} from 'rxjs';
import {
  filter,
  map,
  startWith,
  take
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
import {
  HpConditionOption,
  IdNumberOption
} from '../module-browser-data.models';
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

// Re-export so existing consumers that imported these from here still compile.
export type ModuleListSortId = ModuleSortId;
export type ModuleListGroupId = ModuleGroupId;
export const MODULE_LIST_SORT_OPTIONS = MODULE_SORT_OPTIONS;
export const MODULE_LIST_GROUP_OPTIONS = MODULE_GROUP_OPTIONS;


@Component({
  selector: 'app-module-list',
  templateUrl: './module-list.component.html',
  styleUrls: ['./module-list.component.scss'],
  animations: [
    fadeInOnEnterAnimation({anchor: 'enter', duration: 225, animateChildren: 'after'}),
    fadeOutOnLeaveAnimation({anchor: 'leave', duration: 1})
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

  private readonly externalSearchQuery$ = new BehaviorSubject<string>('');

  @Input()
  set externalSearchQuery(value: string) {
    this.externalSearchQuery$.next(value ?? '');
  }

  private readonly _filteredData$ = new BehaviorSubject<ModuleList>([]);
  readonly filteredData$ = this._filteredData$.asObservable();
  
  // Sort & group controls (active when showOrder = true)
  readonly formTypes = FormTypes;
  readonly sortOptions$: Observable<ISelectable[]> = of(MODULE_SORT_OPTIONS);
  readonly groupOptions$: Observable<ISelectable[]> = of(MODULE_GROUP_OPTIONS);
  readonly sortControl = new UntypedFormControl(MODULE_SORT_OPTIONS[0]);
  readonly groupControl = new UntypedFormControl(MODULE_GROUP_OPTIONS[0]);

  // Filter controls (active when showFilters = true)
  readonly standardControl = new FormControl<IdNumberOption>(DEFAULT_STANDARD, {nonNullable: true});
  readonly hpControl = new UntypedFormControl('');
  readonly hpConditionControl = new FormControl<HpConditionOption>(DEFAULT_HP_CONDITION, {nonNullable: true});
  readonly tagsControl = new FormControl<number[]>([], {nonNullable: true});

  readonly standardOptions$: Observable<ISelectable[]> = of([
    {id: String(DEFAULT_STANDARD.id), name: DEFAULT_STANDARD.name},
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
    public appState: AppStateService
  ) {
    super();
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
          std.id !== DEFAULT_STANDARD.id || (hp !== '' && hp !== null) || tags.length > 0
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
          map(v => v?.id)
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
    
    // Seed with first emission so the list isn't blank on initial render
    this.manageSub(
      this.data$.pipe(take(1)).subscribe(x => this._filteredData$.next(x ?? []))
    );

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
        
        this._filteredData$.next(sortAndGroupMinimalModules(filtered, sortId, groupId));
      })
    );
  }

  resetFilters(): void {
    this.standardControl.setValue(DEFAULT_STANDARD);
    this.hpControl.setValue('');
    this.hpConditionControl.setValue(DEFAULT_HP_CONDITION);
    this.tagsControl.setValue([]);
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
}
