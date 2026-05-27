import {
  ChangeDetectionStrategy,
  Component,
  Input, OnInit
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
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
import { matchesSearchQuery } from '../../shared-interproject/components/@smart/mat-form-entity/string-utils';
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
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('225ms ease', style({opacity: 1}))
      ])
    ]),
    trigger('leave', [
      transition(':leave', [
        animate('1ms ease', style({opacity: 0}))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [LocalDataFilterService],
  standalone: false
})
export class PatchListComponent extends SubManager implements OnInit {
  @Input() readonly data$: Observable<PatchList>;
  @Input() readonly showSearch = false;
  @Input() readonly viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;

  private readonly externalSearchQuery$ = new BehaviorSubject<string>('');

  @Input()
  set externalSearchQuery(value: string) {
    this.externalSearchQuery$.next(value ?? '');
  }
  
  private readonly _filteredData$ = new BehaviorSubject<PatchList>([]);
  readonly filteredData$ = this._filteredData$.asObservable();
  
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
        this._filteredData$.next(
          data.filter(item => {
            if (!item) {
              return false;
            }

            const searchFields = [item.name, item.description, ...(item.tags ?? [])];
            return matchesSearchQuery(localQuery, ...searchFields)
              && matchesSearchQuery(externalQuery, ...searchFields);
          })
        );
      });
  }
}
