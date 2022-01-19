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
import { LocalDataFilterService } from '../../../components/shared-atoms/local-data-filter/local-data-filter.service';
import { SubManager }             from '../../../shared-interproject/directives/subscription-manager';
import { PatchList }              from '../patch-browser-data.service';


@Component({
  selector:        'app-patch-list',
  templateUrl:     './patch-list.component.html',
  styleUrls:       ['./patch-list.component.scss'],
  animations:      [
    fadeInOnEnterAnimation({
      anchor:   'enter',
      duration: 225
    }),
    fadeOutOnLeaveAnimation({
      anchor:   'leave',
      duration: 225
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders:   [LocalDataFilterService]
})
export class PatchListComponent extends SubManager implements OnInit {
  @Input() readonly data$: Observable<PatchList>;
  
  @Input() readonly showSearch = false;
  
  filteredData$ = new BehaviorSubject<PatchList>([]);
  
  constructor(
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
