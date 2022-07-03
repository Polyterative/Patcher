import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                 from '@angular/core';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
}                                 from 'angular-animations';
import {
  BehaviorSubject,
  combineLatest,
  Observable
}                                 from 'rxjs';
import {
  filter,
  take
}                                 from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                                 from '../../../components/module-parts/module-minimal/module-minimal.component';
import { LocalDataFilterService } from '../../../components/shared-atoms/local-data-filter/local-data-filter.service';
import { SubManager }             from '../../../shared-interproject/directives/subscription-manager';
import { ModuleList }             from '../module-browser-data.service';

@Component({
  selector:        'app-module-list',
  templateUrl:     './module-list.component.html',
  styleUrls:       ['./module-list.component.scss'],
  animations:      [
    fadeInOnEnterAnimation({
      anchor:          'enter',
      duration:        225,
      animateChildren: 'none'
    }),
    fadeOutOnLeaveAnimation({
      anchor:   'leave',
      duration: 1
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders:   [LocalDataFilterService]
})
export class ModuleListComponent extends SubManager implements OnInit {
  @Input() readonly data$: Observable<ModuleList>;
  @Input() readonly viewConfig: ModuleMinimalViewConfig = {...defaultModuleMinimalViewConfig};
  
  @Input() readonly showSearch = false;
  @Input() readonly encloseVertically = true;
  
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
  
    this.manageSub(
      this.data$
          .pipe(take(1))
          .subscribe(x => this.filteredData$.next(x))
    );
  
    if (this.showSearch) {
      this.manageSub(
        combineLatest([
          this.data$.pipe(filter(data => !!data)),
          this.filterService.filterEvent$
        ])
          .subscribe(([data, query]) => {
            const result = data.filter(item => item.name.toLowerCase()
                                                   .includes(query.toLowerCase()));
            this.filteredData$.next(result);
          })
      );
    
    }
  
  }
  
}
