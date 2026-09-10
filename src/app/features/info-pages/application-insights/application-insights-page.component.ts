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
  ApplicationInsightsBar,
  ApplicationInsightsHighlight,
  ApplicationInsightsMixSegment,
  ApplicationInsightsPage,
  ApplicationStatisticsService
} from '../../backbone/home/application-statistics.service';
import { mapHeroTakeaway } from '../../backbone/home/application-statistics.mappers';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';


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
  heroTakeaway: string;
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
  heroTakeaway: '',
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
    {key: 'mostOwned', label: 'Loved right now', icon: 'inventory_2', countNoun: 'in racks'},
    {key: 'mostWanted', label: 'On wishlists', icon: 'bookmark_add', countNoun: 'wishes'},
    {key: 'mostSold', label: 'Changing hands', icon: 'sell', countNoun: 'sales'}
  ];

  readonly vm$!: Observable<ApplicationInsightsVm>;

  readonly heroModuleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons: true,
    hideDates: true,
    hideDescription: true,
    hideTags: true,
    hideHP: true,
    hideIoCounts: true
  };

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
        title: 'Discover modules',
        description: 'What the community loves, wishes for, and trades — plus makers, formats, and fresh activity.',
        url: 'https://patcher.xyz/insights',
      },
      'Discover modules'
    );
  }

  heroCountNoun(bucket: ApplicationDiscoveryBucket): string {
    return this.heroBuckets.find((entry) => entry.key === bucket)?.countNoun ?? 'in racks';
  }

  heroBucketLabel(bucket: ApplicationDiscoveryBucket): string {
    return this.heroBuckets.find((entry) => entry.key === bucket)?.label ?? 'Loved right now';
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

  onDiscoveryRailClick(target: string): void {
    this.applicationStatisticsService.trackDiscoveryRailClicked(target);
  }

  retry(): void {
    this.applicationStatisticsService.refresh();
  }

  medianWidth(highlights: ApplicationInsightsHighlight[] | null | undefined): string {
    return (highlights ?? []).find((highlight) => highlight.label === 'Median width')?.value ?? '';
  }

  sharingTeaser(mix: ApplicationInsightsMixSegment[] | null | undefined): string {
    const segments = mix ?? [];
    if (segments.length === 0) {
      return '';
    }
    const countOf = (label: string): string => {
      const segment = segments.find((entry) => entry.label === label);
      return segment ? segment.valueLabel.split(' ')[0] : '';
    };
    const racks = countOf('Racks');
    const patches = countOf('Patches');
    if (racks && patches) {
      return `${ racks } shared racks · ${ patches } connected patches to start from`;
    }
    if (racks) {
      return `${ racks } shared racks to start from`;
    }
    if (patches) {
      return `${ patches } connected patches to start from`;
    }
    return '';
  }

  sizeGuideBuckets(bars: ApplicationInsightsBar[] | null | undefined): ApplicationInsightsBar[] {
    if (!bars || bars.length === 0) {
      return [];
    }
    const tinySource = bars.filter((bar) => bar.label.startsWith('0-2 HP') || bar.label.startsWith('3-5 HP'));
    const bigSource = bars.filter((bar) => bar.label.startsWith('17-28 HP') || bar.label.startsWith('29+ HP'));
    let tinyBars: ApplicationInsightsBar[];
    let classicBars: ApplicationInsightsBar[];
    let bigBars: ApplicationInsightsBar[];
    if (tinySource.length > 0 && bigSource.length > 0) {
      const grouped = new Set([...tinySource, ...bigSource]);
      tinyBars = tinySource;
      bigBars = bigSource;
      classicBars = bars.filter((bar) => !grouped.has(bar));
    } else if (bars.length >= 5) {
      tinyBars = bars.slice(0, 2);
      bigBars = bars.slice(-2);
      classicBars = bars.slice(2, -2);
    } else {
      const third = Math.max(1, Math.floor(bars.length / 3));
      tinyBars = bars.slice(0, third);
      bigBars = bars.slice(-third);
      classicBars = bars.slice(third, -third);
    }
    const groups: {label: string; detail: string; tone: ApplicationInsightsBar['tone']; source: ApplicationInsightsBar[]}[] = [
      {label: 'Tiny (0–5 HP)', detail: 'Modules 5 HP and under', tone: 'brand', source: tinyBars},
      {label: 'Classic (6–16 HP)', detail: 'Modules 6–16 HP', tone: 'emerald', source: classicBars},
      {label: 'Big (17+ HP)', detail: 'Modules 17 HP and over', tone: 'violet', source: bigBars}
    ];
    const counts = groups.map((group) => group.source.reduce((sum, bar) => sum + this.parseBarCount(bar.valueLabel), 0));
    const max = Math.max(...counts, 0);
    return groups
      .map((group, index) => ({
        label: group.label,
        valueLabel: counts[index].toLocaleString('en-US'),
        detail: group.detail,
        widthPercent: max > 0 ? Math.round((counts[index] / max) * 100) : 0,
        tone: group.tone
      }))
      .filter((_, index) => groups[index].source.length > 0);
  }

  private parseBarCount(valueLabel: string): number {
    const digits = (valueLabel ?? '').replace(/[^0-9]/g, '');
    return digits ? Number(digits) : 0;
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
      heroTakeaway: mapHeroTakeaway(heroEntries, this.heroCountNoun(bucket)),
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
