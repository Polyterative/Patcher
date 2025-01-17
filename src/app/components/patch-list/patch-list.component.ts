import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { PatchList } from '../../features/patch-browser/patch-browser-data.service';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { defaultPatchMinimalViewConfig, PatchMinimalViewConfig } from '../patch-parts/patch-minimal/patch-minimal.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';

@Component({
  selector:        'app-patch-list',
  templateUrl:     './patch-list.component.html',
  styleUrls:       ['./patch-list.component.scss'],
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
export class PatchListComponent extends SubManager implements OnInit {
  @Input() readonly data$: Observable<PatchList>;
  
  @Input() readonly showSearch = false;
  
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  
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
