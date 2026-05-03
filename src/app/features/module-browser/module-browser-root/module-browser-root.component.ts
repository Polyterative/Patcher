import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  ViewChild
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Observable } from 'rxjs';
import {
  skip,
  switchMap,
  take,
  takeUntil
} from 'rxjs/operators';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { RecentActivityItem } from 'src/app/components/shared-atoms/recent-activity/recent-activity.model';
import { ModuleBrowserDataService } from 'src/app/features/module-browser/module-browser-data.service';
import { ModuleBrowserRecentActivityService } from 'src/app/features/module-browser/module-browser-recent-activity.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Component({
  selector: 'app-module-browser-root',
  templateUrl: './module-browser-root.component.html',
  styleUrls: ['./module-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModuleBrowserRecentActivityService],
  standalone: false
})
export class ModuleBrowserRootComponent extends SubManager {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  private readonly document = inject(DOCUMENT);
  @Input() showSubmitFab = true;
  @Input() compactSidebarAtTablet = false;
  mobileFiltersExpanded = false;
  readonly recentActivityItems$: Observable<RecentActivityItem[]>;

  @Input() readonly viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons:      true,
    hideDates:        false,
    hideDescription:  false,
    hideHP:           false,
    hideTags:         false,
    hideManufacturer: false,
    hideLabels: true,
    tagsShowCounts: false,
    tagsMaxCount: 5
  };

  constructor(
    public dataService: ModuleBrowserDataService,
    private recentActivityService: ModuleBrowserRecentActivityService,
    readonly seoAndUtilsService: SeoAndUtilsService,
    private route: ActivatedRoute
  ) {
    super();
    
    this.recentActivityItems$ = this.recentActivityService.getRecentActivityItems$(this.dataService.modulesList$);

    this.dataService.paginatorToFistPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.paginator.firstPage());
    
    this.dataService.pageEvent$
      .pipe(
        switchMap(() => this.dataService.modulesList$.pipe(
          skip(1),
          take(1)
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.document.defaultView?.scrollTo({top: 0, behavior: 'smooth'}));
    
    this.dataService.fields.order.control.patchValue(this.dataService.orderStartingValue, {emitEvent: false});
    this.dataService.serversideTableRequestData.sort$.next([this.dataService.orderStartingValue.id, 'desc']);
    this.dataService.updateModulesList$.next();
    
    this.seoAndUtilsService.updateSeo({
      description: 'Eurorack and Intellijel 1U modules database and finder. Filter by function or flavor. Discover new interesting modules.'
    }, 'Modules');
    
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['refresh']) {
          this.dataService.serversideTableRequestData.skip$.next(0);
          this.dataService.serversideTableRequestData.take$.next(20);
        }
      });
  }
  
  toggleMobileFilters(): void {
    this.mobileFiltersExpanded = !this.mobileFiltersExpanded;
  }
}
