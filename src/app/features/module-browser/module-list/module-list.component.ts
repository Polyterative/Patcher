import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
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
import { normalizeForSearch } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  FormTypes,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { MinimalModule } from 'src/app/models/module';
import { ModuleList } from '../module-browser-data.service';


export type ModuleListSortId =
  'nameAsc'
  | 'nameDesc'
  | 'hpAsc'
  | 'hpDesc'
  | 'insMost'
  | 'outsMost';
export type ModuleListGroupId =
  'none'
  | 'standard'
  | 'hpRange';

export const MODULE_LIST_SORT_OPTIONS: ISelectable[] = [
  {id: 'nameAsc', name: 'Name (A→Z)'},
  {id: 'nameDesc', name: 'Name (Z→A)'},
  {id: 'hpAsc', name: 'HP (low→high)'},
  {id: 'hpDesc', name: 'HP (high→low)'},
  {id: 'insMost', name: 'Inputs (most first)'},
  {id: 'outsMost', name: 'Outputs (most first)'},
];

export const MODULE_LIST_GROUP_OPTIONS: ISelectable[] = [
  {id: 'none', name: 'Grouping off'},
  {id: 'standard', name: 'Group by standard (3U / 1U)'},
  {id: 'hpRange', name: 'Group by HP range'},
];

function normalizedModuleName(m: MinimalModule): string {
  return normalizeForSearch(m.name || '');
}

function compareModules(sortId: ModuleListSortId): (a: MinimalModule, b: MinimalModule) => number {
  switch (sortId) {
    case 'nameDesc':
      return (a, b) => normalizedModuleName(b).localeCompare(normalizedModuleName(a));
    case 'hpAsc':
      return (a, b) => (a.hp || 0) - (b.hp || 0) || normalizedModuleName(a).localeCompare(normalizedModuleName(b));
    case 'hpDesc':
      return (a, b) => (b.hp || 0) - (a.hp || 0) || normalizedModuleName(a).localeCompare(normalizedModuleName(b));
    case 'insMost':
      return (a, b) => (b.ins?.length || 0) - (a.ins?.length || 0) || normalizedModuleName(a).localeCompare(normalizedModuleName(b));
    case 'outsMost':
      return (a, b) => (b.outs?.length || 0) - (a.outs?.length || 0) || normalizedModuleName(a).localeCompare(normalizedModuleName(b));
    case 'nameAsc':
    default:
      return (a, b) => normalizedModuleName(a).localeCompare(normalizedModuleName(b));
  }
}

function getGroupKey(m: MinimalModule, groupId: ModuleListGroupId): string {
  if (groupId === 'standard') {
    const sid = m.standard?.id;
    return sid === 1 ? 'Intellijel 1U' : sid === 2 ? 'PulpLogic 1U' : '3U';
  }
  if (groupId === 'hpRange') {
    const hp = m.hp || 0;
    if (hp <= 4) return '1–4 HP';
    if (hp <= 8) return '5–8 HP';
    if (hp <= 14) return '9–14 HP';
    if (hp <= 20) return '15–20 HP';
    return '21+ HP';
  }
  return '';
}

function sortAndGroupModules(data: MinimalModule[], sortId: ModuleListSortId, groupId: ModuleListGroupId): MinimalModule[] {
  const sorted = [...data].sort(compareModules(sortId));
  if (groupId === 'none') return sorted;
  
  const groups = new Map<string, MinimalModule[]>();
  for (const m of sorted) {
    const key = getGroupKey(m, groupId);
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }
  return [...groups.keys()].sort((a, b) => a.localeCompare(b)).flatMap(k => groups.get(k) ?? []);
}


@Component({
  selector: 'app-module-list',
  templateUrl: './module-list.component.html',
  styleUrls: ['./module-list.component.scss'],
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 225,
      animateChildren: 'after'
    }),
    fadeOutOnLeaveAnimation({
      anchor: 'leave',
      duration: 1
    })
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
  @Input() encloseVertically = true;
  private readonly externalSearchQuery$ = new BehaviorSubject<string>('');

  @Input()
  set externalSearchQuery(value: string) {
    this.externalSearchQuery$.next(value ?? '');
  }

  filteredData$ = new BehaviorSubject<ModuleList>([]);
  
  // Sort & group controls (used when showOrder = true)
  readonly formTypes = FormTypes;
  readonly sortOptions$: Observable<ISelectable[]> = of(MODULE_LIST_SORT_OPTIONS);
  readonly groupOptions$: Observable<ISelectable[]> = of(MODULE_LIST_GROUP_OPTIONS);
  readonly sortControl = new UntypedFormControl(MODULE_LIST_SORT_OPTIONS[0]);
  readonly groupControl = new UntypedFormControl(MODULE_LIST_GROUP_OPTIONS[0]);

  constructor(
    public patchingService: PatchDetailDataService,
    public filterService: LocalDataFilterService
  ) {
    super();
  }

  ngOnInit(): void {
    const localSearchQuery$ = this.showSearch
      ? this.filterService.filterEvent$.pipe(startWith(''))
      : of('');
    
    const sortId$: Observable<ModuleListSortId> = this.showOrder
      ? this.sortControl.valueChanges.pipe(
        startWith(this.sortControl.value),
        map((v: ISelectable | null) => (v?.id as ModuleListSortId) ?? 'nameAsc')
      )
      : of('nameAsc' as ModuleListSortId);
    
    const groupId$: Observable<ModuleListGroupId> = this.showOrder
      ? this.groupControl.valueChanges.pipe(
        startWith(this.groupControl.value),
        map((v: ISelectable | null) => (v?.id as ModuleListGroupId) ?? 'none')
      )
      : of('none' as ModuleListGroupId);

    this.manageSub(
      this.data$
        .pipe(
          take(1),
          map(data => this.orderData(data))
        )
        .subscribe(x => this.filteredData$.next(x))
    );

    this.manageSub(
      combineLatest([
        this.data$.pipe(
          filter(data => !!data),
          map(data => this.orderData(data))
        ),
        localSearchQuery$,
        this.externalSearchQuery$,
        sortId$,
        groupId$
      ])
        .subscribe(([data, localQuery, externalQuery, sortId, groupId]) => {
          const normalizedLocalQuery = normalizeForSearch(localQuery);
          const normalizedExternalQuery = normalizeForSearch(externalQuery);
          
          const filtered = data.filter(item => {
            const normalizedModName = normalizeForSearch(item.name);
            return normalizedModName.includes(normalizedLocalQuery)
              && normalizedModName.includes(normalizedExternalQuery);
          });
          
          this.filteredData$.next(sortAndGroupModules(filtered, sortId, groupId));
        })
    );
  }
  
  orderData(moduleList: ModuleList): ModuleList {
    return moduleList;
  }
}