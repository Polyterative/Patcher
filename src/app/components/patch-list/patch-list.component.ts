import {
  ChangeDetectionStrategy,
  Component,
  Input
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
  takeUntil
} from 'rxjs/operators';
import { PatchList } from '../../features/patch-browser/patch-browser-data.service';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { normalizeForSearch } from '../../shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from '../patch-parts/patch-minimal/patch-minimal.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';


@Component({
  selector: 'app-patch-list',
  templateUrl: './patch-list.component.html',
  styleUrls: ['./patch-list.component.scss'],
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
export class PatchListComponent extends SubManager {
  @Input() readonly data$: Observable<PatchList>;
  @Input() readonly showSearch = false;
  @Input() readonly viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;

  private readonly externalSearchQuery$ = new BehaviorSubject<string>('');

  @Input()
  set externalSearchQuery(value: string) {
    this.externalSearchQuery$.next(value ?? '');
  }
  
  readonly filteredData$ = new BehaviorSubject<PatchList>([]);
  
  constructor(public filterService: LocalDataFilterService) {
    super();
  }

  ngOnInit(): void {
    const localSearchQuery$ = this.showSearch
      ? this.filterService.filterEvent$.pipe(startWith(''))
      : of('');
    
    combineLatest([
      this.data$.pipe(filter(data => data != null)),
      localSearchQuery$,
      this.externalSearchQuery$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([data, localQuery, externalQuery]) => {
        const normalizedLocalQuery = normalizeForSearch(localQuery);
        const normalizedExternalQuery = normalizeForSearch(externalQuery);
        
        this.filteredData$.next(
          data.filter(item => {
            if (!item) return false;
            const normalizedName = normalizeForSearch(item.name);
            return normalizedName.includes(normalizedLocalQuery)
              && normalizedName.includes(normalizedExternalQuery);
          })
        );
      });
  }
}