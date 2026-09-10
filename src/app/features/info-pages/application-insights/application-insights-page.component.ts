import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import {
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  startWith
} from 'rxjs';
import {
  ApplicationDiscoveryBucket,
  ApplicationDiscoveryEntry,
  ApplicationDiscoverySnapshot,
  ApplicationInsightsPage,
  ApplicationStatisticsService
} from '../../backbone/home/application-statistics.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';


export interface ApplicationInsightsHeroBucket {
  key: ApplicationDiscoveryBucket;
  label: string;
  icon: string;
  countNoun: string;
}

export interface ApplicationInsightsActivityChip {
  label: string;
  value: string;
  icon: string;
}

export interface ApplicationInsightsVm {
  page: ApplicationInsightsPage | null;
  discovery: ApplicationDiscoverySnapshot | null;
  bucket: ApplicationDiscoveryBucket;
  heroEntries: ApplicationDiscoveryEntry[];
  heroEmpty: boolean;
  activityChips: ApplicationInsightsActivityChip[];
  updatedLabel: string;
  isLoading: boolean;
  pageError: boolean;
  discoveryError: boolean;
}

const LOADING_VM: ApplicationInsightsVm = {
  page: null,
  discovery: null,
  bucket: 'mostOwned',
  heroEntries: [],
  heroEmpty: true,
  activityChips: [],
  updatedLabel: '',
  isLoading: true,
  pageError: false,
  discoveryError: false
};

const ACTIVITY_CHIP_ICONS: Record<string, string> = {
  Modules: 'view_module',
  Racks: 'dashboard_customize',
  Patches: 'cable'
};

@Component({
  selector: 'app-application-insights-page',
  templateUrl: './application-insights-page.component.html',
  styleUrls: ['./application-insights-page.component.scss'],
  providers: [ApplicationStatisticsService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ApplicationInsightsPageComponent {
  readonly heroBuckets: ApplicationInsightsHeroBucket[] = [
    {key: 'mostOwned', label: 'Most Owned', icon: 'inventory_2', countNoun: 'owners'},
    {key: 'mostWanted', label: 'Most Wanted', icon: 'bookmark_add', countNoun: 'wants'},
    {key: 'mostSold', label: 'Most Sold', icon: 'sell', countNoun: 'sales'}
  ];

  readonly vm$!: Observable<ApplicationInsightsVm>;

  constructor(
    private readonly applicationStatisticsService: ApplicationStatisticsService,
    private readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    const pageState$ = this.applicationStatisticsService.page$.pipe(
      map((page) => ({
        page: page as ApplicationInsightsPage | null,
        pageError: false
      })),
      catchError(() => of({
        page: null as ApplicationInsightsPage | null,
        pageError: true
      }))
    );
    const discoveryState$ = this.applicationStatisticsService.discovery$.pipe(
      map((discovery) => ({
        discovery: discovery as ApplicationDiscoverySnapshot | null,
        discoveryError: false
      })),
      catchError(() => of({
        discovery: null as ApplicationDiscoverySnapshot | null,
        discoveryError: true
      }))
    );
    this.vm$ = combineLatest([
      pageState$,
      discoveryState$,
      this.applicationStatisticsService.heroBucket$
    ]).pipe(
      map(([pageState, discoveryState, bucket]) => this.mapVm(
        pageState.page,
        pageState.pageError,
        discoveryState.discovery,
        discoveryState.discoveryError,
        bucket
      )),
      startWith(LOADING_VM)
    );
    this.seoAndUtilsService.updateSeo(
      {
        title: 'Application insights',
        description: 'Ownership rankings, last-30-day activity, and library footprint across the public Patcher catalogue.',
        url: 'https://patcher.xyz/insights',
      },
      'Application insights'
    );
  }

  heroCountNoun(bucket: ApplicationDiscoveryBucket): string {
    return this.heroBuckets.find((entry) => entry.key === bucket)?.countNoun ?? 'owners';
  }

  heroBucketLabel(bucket: ApplicationDiscoveryBucket): string {
    return this.heroBuckets.find((entry) => entry.key === bucket)?.label ?? 'Most Owned';
  }

  onHeroBucket(bucket: ApplicationDiscoveryBucket): void {
    this.applicationStatisticsService.selectHeroBucket(bucket);
  }

  onHeroModuleClick(bucket: ApplicationDiscoveryBucket, entry: ApplicationDiscoveryEntry, rank: number): void {
    this.applicationStatisticsService.trackHeroModuleClicked(bucket, entry, rank);
  }

  onSupportLinkClick(target: string): void {
    this.applicationStatisticsService.trackSupportLinkClicked(target);
  }

  retry(): void {
    this.applicationStatisticsService.refresh();
  }

  private mapVm(
    page: ApplicationInsightsPage | null,
    pageError: boolean,
    discovery: ApplicationDiscoverySnapshot | null,
    discoveryError: boolean,
    bucket: ApplicationDiscoveryBucket
  ): ApplicationInsightsVm {
    const heroEntries = discovery?.[bucket] ?? [];
    const days = page?.activityChart.days ?? [];
    const lastDay = days.length > 0 ? days[days.length - 1] : null;

    return {
      page,
      discovery,
      bucket,
      heroEntries,
      heroEmpty: heroEntries.length === 0,
      activityChips: (page?.activityChart.legend ?? []).map((item) => ({
        label: `${ item.label } (last 30 days)`,
        value: item.valueLabel,
        icon: ACTIVITY_CHIP_ICONS[item.label] ?? 'timeline'
      })),
      updatedLabel: lastDay ? lastDay.label : '',
      isLoading: false,
      pageError,
      discoveryError
    };
  }
}
