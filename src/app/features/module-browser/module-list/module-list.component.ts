import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
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
import { ModuleList } from '../module-browser-data.service';


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
  
  // showRichList$ = new BehaviorSubject<boolean>(false);
  
  constructor(
    public patchingService: PatchDetailDataService,
    public filterService: LocalDataFilterService
  ) {
    super();
    // if (this.showSearch) {
    
    // }
    // this.service.patchEditingPanelOpenState$
    //     .pipe(
    //
    //     )
    //     .subscribe(value => {
    //
    //     });
  }
  
  ngOnInit(): void {
    const localSearchQuery$ = this.showSearch
      ? this.filterService.filterEvent$.pipe(startWith(''))
      : of('');

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
        this.externalSearchQuery$
      ])
        .subscribe(([data, localQuery, externalQuery]) => {
          const normalizedLocalQuery = normalizeForSearch(localQuery);
          const normalizedExternalQuery = normalizeForSearch(externalQuery);
          
          const result = data.filter(item => {
            const normalizedName = normalizeForSearch(item.name);
            
            return normalizedName.includes(normalizedLocalQuery)
              && normalizedName.includes(normalizedExternalQuery);
          });
          
          this.filteredData$.next(result);
        })
    );
  }
  
  // sort happening on the server side now
  orderData(
    moduleList: ModuleList,
  ): ModuleList {
    // return moduleList.sort((a, b) => a.name.localeCompare(b.name));
    return moduleList;
  
}
}