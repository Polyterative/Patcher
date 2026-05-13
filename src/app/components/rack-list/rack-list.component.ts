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
  startWith,
  take
} from 'rxjs/operators';
import { RackList } from 'src/app/features/routes/rack/rack-browser-data.service';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { RackMinimalViewConfig } from '../rack-parts/rack-minimal/rack-minimal.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';
import { matchesSearchQuery } from '../../shared-interproject/components/@smart/mat-form-entity/string-utils';


@Component({
  selector: 'app-rack-list',
  templateUrl: './rack-list.component.html',
  styleUrls: ['./rack-list.component.scss'],
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
export class RackListComponent extends SubManager implements OnInit {
  @Input()
  readonly data$: Observable<RackList>;
  
  @Input() readonly showSearch = false;
  @Input() viewConfig: RackMinimalViewConfig;
  private readonly externalSearchQuery$ = new BehaviorSubject<string>('');
  
  @Input()
  set externalSearchQuery(value: string) {
    this.externalSearchQuery$.next(value ?? '');
  }
  
  private readonly _filteredData$ = new BehaviorSubject<RackList>([]);
  readonly filteredData$ = this._filteredData$.asObservable();
  
  constructor(
    public filterService: LocalDataFilterService
  ) {
    super();
  }
  
  ngOnInit(): void {
    const localSearchQuery$ = this.showSearch
      ? this.filterService.filterEvent$.pipe(startWith(''))
      : of('');

    this.manageSub(
      this.data$
          .pipe(take(1))
          .subscribe(x => this._filteredData$.next(x))
    );
    
    this.manageSub(
      combineLatest([
        this.data$.pipe(filter(data => !!data)),
        localSearchQuery$,
        this.externalSearchQuery$
      ])
        .subscribe(([data, localQuery, externalQuery]) => {
          const result = data.filter(item => {
            const searchFields = [item.name, item.description];
            return matchesSearchQuery(localQuery, ...searchFields)
              && matchesSearchQuery(externalQuery, ...searchFields);
          });
          this._filteredData$.next(result);
        })
    );
  }
  
}
