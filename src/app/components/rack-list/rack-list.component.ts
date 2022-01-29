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
import { RackList }               from '../../features/rack-browser/rack-browser-data.service';
import { SubManager }             from '../../shared-interproject/directives/subscription-manager';
import { RackMinimalViewConfig }  from '../rack-parts/rack-minimal/rack-minimal.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';

@Component({
  selector:        'app-rack-list',
  templateUrl:     './rack-list.component.html',
  styleUrls:       ['./rack-list.component.scss'],
  animations:      [
    fadeInOnEnterAnimation({
      anchor:          'enter',
      duration:        225,
      animateChildren: 'after'
    }),
    fadeOutOnLeaveAnimation({
      anchor:   'leave',
      duration: 1
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders:   [LocalDataFilterService]
})
export class RackListComponent extends SubManager implements OnInit {
  @Input()
  readonly data$: Observable<RackList>;
  
  @Input() readonly showSearch = false;
  @Input() viewConfig: RackMinimalViewConfig;
  
  filteredData$ = new BehaviorSubject<RackList>([]);
  
  constructor(
    public filterService: LocalDataFilterService
  ) {
    super();
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
