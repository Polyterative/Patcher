import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
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
  take
} from 'rxjs/operators';
import { RackList } from 'src/app/features/routes/rack/rack-browser-data.service';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { RackMinimalViewConfig } from '../rack-parts/rack-minimal/rack-minimal.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';
import { matchesSearchQuery } from '../../shared-interproject/components/@smart/mat-form-entity/string-utils';
import { RackMinimal } from 'src/app/models/rack';


@Component({
  selector: 'app-rack-list',
  templateUrl: './rack-list.component.html',
  styleUrls: ['./rack-list.component.scss'],
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
export class RackListComponent extends SubManager implements OnInit {
  @Input()
  readonly data$: Observable<RackList>;
  
  @Input() readonly showSearch = false;
  @Input() encloseVertically = true;
  @Input() viewConfig: RackMinimalViewConfig;
  private readonly externalSearchQuery$ = new BehaviorSubject<string>('');
  
  @Input()
  set externalSearchQuery(value: string) {
    this.externalSearchQuery$.next(value ?? '');
  }
  
  private readonly _filteredData$ = new BehaviorSubject<RackList>([]);
  readonly filteredData$ = this._filteredData$.asObservable();
  private visibleRackIds = new Set<number>();
  private readonly enterDelayByRackId = new Map<number, number>();
  
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
          .subscribe(x => this.updateFilteredData(x ?? []))
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
          this.updateFilteredData(result);
        })
    );
  }

  getEnterDelay(rackId: number): number {
    return this.enterDelayByRackId.get(rackId) ?? 50;
  }

  private updateFilteredData(data: RackMinimal[]): void {
    const nextVisibleIds = new Set(data.map(rack => rack.id));
    let newItemIndex = 0;
    this.enterDelayByRackId.clear();

    for (const rack of data) {
      const delayIndex = this.visibleRackIds.has(rack.id) ? 0 : newItemIndex++;
      this.enterDelayByRackId.set(rack.id, (delayIndex * 25) + 50);
    }

    this.visibleRackIds = nextVisibleIds;
    this._filteredData$.next(data);
  }
  
}
