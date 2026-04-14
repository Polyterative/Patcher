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
  @Input() encloseVertically = true;

  private readonly externalSearchQuery$ = new BehaviorSubject<string>('');

  @Input()
  set externalSearchQuery(value: string) {
    this.externalSearchQuery$.next(value ?? '');
  }

  filteredData$ = new BehaviorSubject<ModuleList>([]);
  
  // Sort & group controls (active when showOrder = true)
  readonly formTypes = FormTypes;
  readonly sortOptions$: Observable<ISelectable[]> = of(MODULE_SORT_OPTIONS);
  readonly groupOptions$: Observable<ISelectable[]> = of(MODULE_GROUP_OPTIONS);
  readonly sortControl = new UntypedFormControl(MODULE_SORT_OPTIONS[0]);
  readonly groupControl = new UntypedFormControl(MODULE_GROUP_OPTIONS[0]);

  constructor(
    public patchingService: PatchDetailDataService,
    public filterService: LocalDataFilterService,
    public appState: AppStateService
  ) {
    super();
  }

  ngOnInit(): void {
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
    
    // Seed with first emission so the list isn't blank on initial render
    this.manageSub(
      this.data$.pipe(take(1)).subscribe(x => this.filteredData$.next(x ?? []))
    );

    this.manageSub(
      combineLatest([
        this.data$.pipe(filter(data => !!data)),
        localSearchQuery$,
        this.externalSearchQuery$,
        sortId$,
        groupId$
      ]).subscribe(([data, localQuery, externalQuery, sortId, groupId]) => {
        const filtered = data.filter(item => {
          const searchFields = [
            item.name,
            item.manufacturer?.name,
            item.description,
            ...(item.tags ?? []).map(tagVote => tagVote.tag?.name ?? '')
          ];

          return matchesSearchQuery(localQuery, ...searchFields)
            && matchesSearchQuery(externalQuery, ...searchFields);
        });
        
        this.filteredData$.next(sortAndGroupMinimalModules(filtered, sortId, groupId));
      })
    );
  }
  
  orderData(moduleList: ModuleList): ModuleList {
    return moduleList;
  }
}
