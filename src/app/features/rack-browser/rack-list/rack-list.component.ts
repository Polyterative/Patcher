import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                 from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Observable
}                                 from 'rxjs';
import {
  filter,
  take
}                                 from 'rxjs/operators';
import { PatchDetailDataService } from '../../../components/patch-parts/patch-detail-data.service';
import { LocalDataFilterService } from '../../../components/shared-atoms/local-data-filter/local-data-filter.service';
import { SubManager }             from '../../../shared-interproject/directives/subscription-manager';
import { RackList }               from '../rack-browser-data.service';

@Component({
  selector:        'app-rack-list',
  templateUrl:     './rack-list.component.html',
  styleUrls:       ['./rack-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders:   [LocalDataFilterService]
})
export class RackListComponent extends SubManager implements OnInit {
  @Input()
  readonly data$: Observable<RackList>;
  
  @Input() readonly showSearch = false;
  
  filteredData$ = new BehaviorSubject<RackList>([]);
  
  constructor(
    public patchingService: PatchDetailDataService,
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
