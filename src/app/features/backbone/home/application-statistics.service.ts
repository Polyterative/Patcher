import { Injectable } from '@angular/core';
import {
  forkJoin,
  ReplaySubject
} from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseService } from '../../backend/supabase.service';
import {
  PublicApplicationActivityPoint,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics
} from '../../backend/supabase-queries';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


export interface ApplicationInsightsTeaser {
  interpretation: string;
  methodology: string;
  emptyMessage: string;
  statistics: ApplicationInsightStatistic[];
}

export interface ApplicationInsightStatistic {
  name: string;
  value: number;
  icon: string;
}

export interface ApplicationInsightsHighlight {
  label: string;
  value: string;
  icon: string;
}

export interface ApplicationInsightsSnapshotMetric {
  label: string;
  valueLabel: string;
  detail: string;
  icon: string;
  tone: 'brand' | 'emerald' | 'violet' | 'amber';
}

export interface ApplicationInsightsBar {
  label: string;
  valueLabel: string;
  detail: string;
  widthPercent: number;
  tone: 'brand' | 'emerald' | 'violet' | 'amber';
}

export interface ApplicationInsightsMixSegment {
  label: string;
  valueLabel: string;
  widthPercent: number;
  tone: 'brand' | 'emerald';
}

export interface ApplicationInsightsTrendDay {
  date: string;
  label: string;
  showLabel: boolean;
  total: number;
  heightPercent: number;
  modules: number;
  racks: number;
  patches: number;
}

export interface ApplicationInsightsTrendLegendItem {
  label: string;
  valueLabel: string;
  toneClass: 'modules' | 'racks' | 'patches';
}

export interface ApplicationInsightsTrendMomentumItem {
  label: string;
  valueLabel: string;
  deltaLabel: string;
  toneClass: 'modules' | 'racks' | 'patches';
}

export interface ApplicationInsightsPage {
  heroHighlights: ApplicationInsightsHighlight[];
  footprintSnapshot: ApplicationInsightsSnapshotMetric[];
  footprintHighlights: ApplicationInsightsHighlight[];
  standardMixBars: ApplicationInsightsBar[];
  standardActivityBars: ApplicationInsightsBar[];
  standardWidthBars: ApplicationInsightsBar[];
  standardMixHighlights: ApplicationInsightsHighlight[];
  hpBandBars: ApplicationInsightsBar[];
  hpBandActivityBars: ApplicationInsightsBar[];
  hpBandHighlights: ApplicationInsightsHighlight[];
  moduleFreshnessBars: ApplicationInsightsBar[];
  moduleFreshnessHighlights: ApplicationInsightsHighlight[];
  topManufacturerBars: ApplicationInsightsBar[];
  activeManufacturerBars: ApplicationInsightsBar[];
  widestManufacturerBars: ApplicationInsightsBar[];
  oneUManufacturerBars: ApplicationInsightsBar[];
  makerHighlights: ApplicationInsightsHighlight[];
  activityChart: {
    days: ApplicationInsightsTrendDay[];
    legend: ApplicationInsightsTrendLegendItem[];
    momentum: ApplicationInsightsTrendMomentumItem[];
    highlights: ApplicationInsightsHighlight[];
  };
  sharingMix: ApplicationInsightsMixSegment[];
  sharingRateBars: ApplicationInsightsBar[];
  sharingHighlights: ApplicationInsightsHighlight[];
  patchDepthBars: ApplicationInsightsBar[];
  patchHighlights: ApplicationInsightsHighlight[];
}

type MetricTone = ApplicationInsightsBar['tone'];

@Injectable()
export class ApplicationStatisticsService extends SubManager {
  private readonly refreshRequest$ = new ReplaySubject<void>(1);
  private readonly numberFormatter = new Intl.NumberFormat('en-US');
  private readonly shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });

  readonly teaser$ = this.refreshRequest$.pipe(
    switchMap(() => this.backend.GET.applicationStatistics()),
    map((statistics) => this.mapTeaser(statistics))
  );
  readonly page$ = this.refreshRequest$.pipe(
    switchMap(() => forkJoin({
      statistics: this.backend.GET.applicationStatistics(),
      activitySeries: this.backend.GET.applicationActivitySeries(30),
      moduleInsights: this.backend.GET.applicationModuleInsights()
    })),
    map(({statistics, activitySeries, moduleInsights}) => this.mapPage(statistics, activitySeries, moduleInsights))
  );

  constructor(
    private readonly backend: SupabaseService
  ) {
    super();
    this.refreshRequest$.next();
  }

  refresh() {
    this.refreshRequest$.next();
  }

  private mapTeaser(statistics: PublicApplicationStatistics): ApplicationInsightsTeaser {
    const sharedWorkExists = statistics.publicRacks > 0 || statistics.publicPatches > 0;

    return {
      statistics: [
        {
          name: 'Public modules',
          value: statistics.publicModules,
          icon: 'view_module',
        },
        {
          name: 'Shared racks',
          value: statistics.publicRacks,
          icon: 'space_dashboard',
        },
        {
          name: 'Shared patches',
          value: statistics.publicPatches,
          icon: 'cable',
        }
      ],
      interpretation: sharedWorkExists
        ? 'The public library already includes enough real racks and patches to explore patterns, not just static catalogue pages.'
        : 'The public catalogue is live, and this teaser will deepen as more people publish racks and patches from public profiles.',
      methodology: 'Aggregate only. Rack and patch counts include only public items from public profiles, and patch totals follow the public patch browser by counting shared patches with saved cable connections.',
      emptyMessage: 'Public insight snapshots will appear here once enough public catalogue activity is available.'
    };
  }

  private mapPage(
    statistics: PublicApplicationStatistics,
    activitySeries: PublicApplicationActivityPoint[],
    moduleInsights: PublicApplicationModuleInsights
  ): ApplicationInsightsPage {
    const sharedWorks = statistics.publicRacks + statistics.publicPatches;
    const recentSharedWorks = statistics.publicRacksUpdatedLast30Days + statistics.publicPatchesUpdatedLast30Days;
    const totalActivity = activitySeries.reduce((sum, point) => sum + point.modules + point.racks + point.patches, 0);
    const activeDays = activitySeries.filter((point) => point.modules + point.racks + point.patches > 0).length;
    const moduleActivityTotal = activitySeries.reduce((sum, point) => sum + point.modules, 0);
    const rackActivityTotal = activitySeries.reduce((sum, point) => sum + point.racks, 0);
    const patchActivityTotal = activitySeries.reduce((sum, point) => sum + point.patches, 0);
    const dominantStandard = this.getTopBucket(moduleInsights.standardMix);
    const oneUCount = moduleInsights.standardMix
      .filter((bucket) => bucket.label.includes('1U'))
      .reduce((sum, bucket) => sum + bucket.count, 0);
    const dominantHpBand = this.getTopBucket(moduleInsights.hpBands);
    const mostActiveStandard = this.getTopBucket(moduleInsights.standardActivity);
    const updatedLast7Days = moduleInsights.freshnessWindows[0]?.count ?? 0;
    const updatedLast30Days = moduleInsights.freshnessWindows[1]?.count ?? 0;
    const updatedLast90Days = moduleInsights.freshnessWindows[2]?.count ?? 0;
    const updatedLast365Days = moduleInsights.freshnessWindows[3]?.count ?? 0;
    const lastSevenDaysTotal = activitySeries.slice(-7)
      .reduce((sum, point) => sum + point.modules + point.racks + point.patches, 0);
    const previousSevenDaysTotal = activitySeries.slice(-14, -7)
      .reduce((sum, point) => sum + point.modules + point.racks + point.patches, 0);
    const lastSevenDaysModules = activitySeries.slice(-7)
      .reduce((sum, point) => sum + point.modules, 0);
    const previousSevenDaysModules = activitySeries.slice(-14, -7)
      .reduce((sum, point) => sum + point.modules, 0);
    const lastSevenDaysRacks = activitySeries.slice(-7)
      .reduce((sum, point) => sum + point.racks, 0);
    const previousSevenDaysRacks = activitySeries.slice(-14, -7)
      .reduce((sum, point) => sum + point.racks, 0);
    const lastSevenDaysPatches = activitySeries.slice(-7)
      .reduce((sum, point) => sum + point.patches, 0);
    const previousSevenDaysPatches = activitySeries.slice(-14, -7)
      .reduce((sum, point) => sum + point.patches, 0);
    const fastestActivityTrack = [
      {label: 'Modules', count: moduleActivityTotal},
      {label: 'Racks', count: rackActivityTotal},
      {label: 'Patches', count: patchActivityTotal}
    ].sort((a, b) => b.count - a.count)[0];
    const compactAndUtilityShare = this.getBucketCount(moduleInsights.hpBands, 'Compact (0-8 HP)')
      + this.getBucketCount(moduleInsights.hpBands, 'Utility (9-16 HP)');
    const freshnessCohorts = [
      {
        label: 'Fresh (0-7 days)',
        count: updatedLast7Days,
        detail: `${ this.formatCount(updatedLast7Days) } public modules moved in the last week`
      },
      {
        label: 'Recent (8-30 days)',
        count: Math.max(updatedLast30Days - updatedLast7Days, 0),
        detail: `${ this.formatCount(Math.max(updatedLast30Days - updatedLast7Days, 0)) } public modules moved earlier this month`
      },
      {
        label: 'Settled (31-90 days)',
        count: Math.max(updatedLast90Days - updatedLast30Days, 0),
        detail: `${ this.formatCount(Math.max(updatedLast90Days - updatedLast30Days, 0)) } public modules moved in the last quarter`
      },
      {
        label: 'Stable (91-365 days)',
        count: Math.max(updatedLast365Days - updatedLast90Days, 0),
        detail: `${ this.formatCount(Math.max(updatedLast365Days - updatedLast90Days, 0)) } public modules were updated within the last year`
      },
      {
        label: 'Older than a year',
        count: moduleInsights.staleModules,
        detail: `${ this.formatCount(moduleInsights.staleModules) } public modules have been quiet for over a year`
      }
    ];
    const busiestSevenDayStretch = this.getMaxRollingWindowTotal(activitySeries, 7);

    const footprintMetrics = [
      this.createSnapshotMetric(
        'Public modules',
        statistics.publicModules,
        'Visible module catalogue',
        'view_module',
        'brand'
      ),
      this.createSnapshotMetric(
        'Represented makers',
        statistics.publicManufacturers,
        'Manufacturers with public modules',
        'precision_manufacturing',
        'violet'
      ),
      this.createSnapshotMetric(
        'Public profiles',
        statistics.publicProfiles,
        'Profiles visible on the public web',
        'person_search',
        'emerald'
      ),
      this.createSnapshotMetric(
        'Shared works',
        sharedWorks,
        `${ this.formatCount(statistics.publicRacks) } racks + ${ this.formatCount(statistics.publicPatches) } patches`,
        'layers',
        'amber'
      )
    ];

    const sharingRateMetrics = [
      this.createRateDatum(
        'Rack-sharing profiles / 100 public profiles',
        statistics.publicRackAuthors,
        statistics.publicProfiles,
        'emerald',
        {
          scale: 100,
          valueSuffix: '/ 100',
          detail: `${ this.formatCount(statistics.publicRackAuthors) } public profiles sharing racks`,
          minimumNumerator: 3,
          minimumDenominator: 10
        }
      ),
      this.createRateDatum(
        'Patch-sharing profiles / 100 public profiles',
        statistics.publicPatchAuthors,
        statistics.publicProfiles,
        'brand',
        {
          scale: 100,
          valueSuffix: '/ 100',
          detail: `${ this.formatCount(statistics.publicPatchAuthors) } public profiles sharing patches`,
          minimumNumerator: 3,
          minimumDenominator: 10
        }
      )
    ].filter((metric): metric is ReturnType<typeof this.createRateDatum> => !!metric);

    const patchDepthMetrics = [
      this.createRateDatum(
        'Patches updated / 100 shared patches',
        statistics.publicPatchesUpdatedLast30Days,
        statistics.publicPatches,
        'emerald',
        {
          scale: 100,
          valueSuffix: '/ 100',
          detail: `${ this.formatCount(statistics.publicPatchesUpdatedLast30Days) } shared patches updated in the last 30 days`,
          minimumNumerator: 5,
          minimumDenominator: 10
        }
      ),
      this.createRateDatum(
        'Connections per shared patch',
        statistics.publicPatchConnections,
        statistics.publicPatches,
        'brand',
        {
          detail: `${ this.formatCount(statistics.publicPatchConnections) } saved public connections`,
          minimumNumerator: 12,
          minimumDenominator: 5
        }
      ),
      this.createRateDatum(
        'Connections per 100 patch authors',
        statistics.publicPatchConnections,
        statistics.publicPatchAuthors,
        'violet',
        {
          scale: 100,
          valueSuffix: '/ 100',
          detail: `${ this.formatCount(statistics.publicPatchAuthors) } public patch-sharing profiles`,
          minimumNumerator: 12,
          minimumDenominator: 3
        }
      ),
      this.createRateDatum(
        'Shared patches / 100 represented makers',
        statistics.publicPatches,
        statistics.publicManufacturers,
        'amber',
        {
          scale: 100,
          valueSuffix: '/ 100',
          detail: `${ this.formatCount(statistics.publicPatches) } connected public patches`,
          minimumNumerator: 5,
          minimumDenominator: 3
        }
      )
    ].filter((metric): metric is ReturnType<typeof this.createRateDatum> => !!metric);

    return {
      heroHighlights: [
        {
          label: 'Shared works',
          value: this.formatCount(sharedWorks),
          icon: 'layers'
        },
        {
          label: '30-day updates',
          value: this.formatCount(totalActivity),
          icon: 'timeline'
        },
        {
          label: 'Rack sharers + patch sharers',
          value: this.formatCount(statistics.publicRackAuthors + statistics.publicPatchAuthors),
          icon: 'groups'
        }
      ],
      footprintSnapshot: footprintMetrics,
      footprintHighlights: [
        {
          label: 'Public racks',
          value: this.formatCount(statistics.publicRacks),
          icon: 'space_dashboard'
        },
        {
          label: 'Connected patches',
          value: this.formatCount(statistics.publicPatches),
          icon: 'cable'
        },
        {
          label: 'Modules updated in 30 days',
          value: this.formatCount(statistics.publicModulesUpdatedLast30Days),
          icon: 'schedule'
        }
      ],
      standardMixBars: this.mapBarWidths(
        moduleInsights.standardMix.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index)
        }))
      ),
      standardActivityBars: this.mapBarWidths(
        moduleInsights.standardActivity.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 1)
        }))
      ),
      standardWidthBars: this.mapBarWidths(
        moduleInsights.standardWidthAverages.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: `${ this.formatCount(bucket.count) } HP`,
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 2)
        }))
      ),
      standardMixHighlights: [
        {
          label: 'Formats represented',
          value: this.formatCount(moduleInsights.standardMix.length),
          icon: 'category'
        },
        {
          label: 'Dominant standard share',
          value: dominantStandard
            ? this.formatPercent(dominantStandard.count, statistics.publicModules)
            : 'N/A',
          icon: 'emoji_events'
        },
        {
          label: 'Most active format',
          value: mostActiveStandard
            ? `${ mostActiveStandard.label } (${ this.formatCount(mostActiveStandard.count) })`
            : 'N/A',
          icon: 'bolt'
        },
        {
          label: 'Overall 1U share',
          value: this.formatPercent(oneUCount, statistics.publicModules),
          icon: 'view_week'
        }
      ],
      hpBandBars: this.mapBarWidths(
        moduleInsights.hpBands.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 2)
        }))
      ),
      hpBandActivityBars: this.mapBarWidths(
        moduleInsights.hpBandActivity.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 3)
        }))
      ),
      hpBandHighlights: [
        {
          label: 'Average width',
          value: `${ this.formatCount(moduleInsights.averageHp) } HP`,
          icon: 'straighten'
        },
        {
          label: 'Most common band',
          value: dominantHpBand
            ? `${ dominantHpBand.label } (${ this.formatCount(dominantHpBand.count) })`
            : 'N/A',
          icon: 'stacked_bar_chart'
        },
        {
          label: 'Compact + utility share',
          value: this.formatPercent(compactAndUtilityShare, statistics.publicModules),
          icon: 'swap_horiz'
        }
      ],
      moduleFreshnessBars: this.mapBarWidths(
        freshnessCohorts.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index)
        }))
      ),
      moduleFreshnessHighlights: [
        {
          label: 'Active in 30 days',
          value: this.formatPercent(updatedLast30Days, statistics.publicModules),
          icon: 'bolt'
        },
        {
          label: 'Stable in 91-365 days',
          value: this.formatPercent(Math.max(updatedLast365Days - updatedLast90Days, 0), statistics.publicModules),
          icon: 'event_repeat'
        },
        {
          label: 'Older than a year',
          value: `${ this.formatCount(moduleInsights.staleModules) } (${ this.formatPercentValue(moduleInsights.staleModules, statistics.publicModules) })`,
          icon: 'history'
        }
      ],
      topManufacturerBars: this.mapBarWidths(
        moduleInsights.topManufacturers.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index)
        }))
      ),
      activeManufacturerBars: this.mapBarWidths(
        moduleInsights.activeManufacturers.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 1)
        }))
      ),
      widestManufacturerBars: this.mapBarWidths(
        moduleInsights.widestManufacturers.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: `${ this.formatCount(bucket.count) } HP`,
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 2)
        }))
      ),
      oneUManufacturerBars: this.mapBarWidths(
        moduleInsights.oneUManufacturers.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: `${ this.formatCount(bucket.count) }%`,
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 3)
        }))
      ),
      makerHighlights: [
        {
          label: 'Top 5 maker share',
          value: `${ this.formatCount(moduleInsights.topFiveManufacturerShare) }%`,
          icon: 'pie_chart'
        },
        {
          label: 'Solo makers',
          value: this.formatCount(moduleInsights.soloManufacturerCount),
          icon: 'filter_1'
        },
        {
          label: 'Median maker catalogue',
          value: `${ this.formatCount(moduleInsights.medianModulesPerManufacturer) } modules`,
          icon: 'balance'
        }
      ],
      activityChart: {
        days: this.mapTrendDays(activitySeries),
        legend: [
          {
            label: 'Modules',
            valueLabel: this.formatCount(moduleActivityTotal),
            toneClass: 'modules'
          },
          {
            label: 'Racks',
            valueLabel: this.formatCount(rackActivityTotal),
            toneClass: 'racks'
          },
          {
            label: 'Patches',
            valueLabel: this.formatCount(patchActivityTotal),
            toneClass: 'patches'
          }
        ],
        momentum: [
          {
            label: 'Modules',
            valueLabel: `${ this.formatCount(lastSevenDaysModules) } in last 7d`,
            deltaLabel: `${ this.formatSignedCount(lastSevenDaysModules - previousSevenDaysModules) } vs previous 7`,
            toneClass: 'modules'
          },
          {
            label: 'Racks',
            valueLabel: `${ this.formatCount(lastSevenDaysRacks) } in last 7d`,
            deltaLabel: `${ this.formatSignedCount(lastSevenDaysRacks - previousSevenDaysRacks) } vs previous 7`,
            toneClass: 'racks'
          },
          {
            label: 'Patches',
            valueLabel: `${ this.formatCount(lastSevenDaysPatches) } in last 7d`,
            deltaLabel: `${ this.formatSignedCount(lastSevenDaysPatches - previousSevenDaysPatches) } vs previous 7`,
            toneClass: 'patches'
          }
        ],
        highlights: [
          {
            label: 'Active days',
            value: `${ activeDays } / 30`,
            icon: 'calendar_view_month'
          },
          {
            label: 'Last 7 days',
            value: this.formatCount(lastSevenDaysTotal),
            icon: 'date_range'
          },
          {
            label: 'Vs previous 7',
            value: this.formatSignedCount(lastSevenDaysTotal - previousSevenDaysTotal),
            icon: 'trending_up'
          },
          {
            label: 'Fastest-moving layer',
            value: fastestActivityTrack?.label ?? 'N/A',
            icon: 'stacked_line_chart'
          },
          {
            label: 'Busiest 7-day stretch',
            value: this.formatCount(busiestSevenDayStretch),
            icon: 'whatshot'
          },
          {
            label: 'Peak day',
            value: this.formatCount(this.getMaxDailyTotal(activitySeries)),
            icon: 'bolt'
          }
        ]
      },
      sharingMix: this.mapSharingMix(statistics.publicRacks, statistics.publicPatches),
      sharingRateBars: this.mapBarWidths(sharingRateMetrics),
      sharingHighlights: [
        {
          label: 'Rack sharers / 100 profiles',
          value: `${ Math.round((statistics.publicRackAuthors / Math.max(statistics.publicProfiles, 1)) * 100) } / 100`,
          icon: 'dashboard_customize'
        },
        {
          label: 'Patch sharers / 100 profiles',
          value: `${ Math.round((statistics.publicPatchAuthors / Math.max(statistics.publicProfiles, 1)) * 100) } / 100`,
          icon: 'hub'
        },
        {
          label: 'Shared works updated in 30 days',
          value: this.formatCount(recentSharedWorks),
          icon: 'schedule'
        },
        {
          label: 'Connections per shared patch',
          value: statistics.publicPatches > 0
            ? this.formatCount(Math.round(statistics.publicPatchConnections / statistics.publicPatches))
            : '0',
          icon: 'share'
        }
      ],
      patchDepthBars: this.mapBarWidths(patchDepthMetrics),
      patchHighlights: [
        {
          label: 'Saved connections',
          value: this.formatCount(statistics.publicPatchConnections),
          icon: 'linear_scale'
        },
        {
          label: 'Patch authors',
          value: this.formatCount(statistics.publicPatchAuthors),
          icon: 'hub'
        },
        {
          label: 'Recent patch updates',
          value: this.formatCount(statistics.publicPatchesUpdatedLast30Days),
          icon: 'timelapse'
        }
      ]
    };
  }

  private createSnapshotMetric(
    label: string,
    value: number,
    detail: string,
    icon: string,
    tone: MetricTone
  ): ApplicationInsightsSnapshotMetric {
    return {
      label,
      valueLabel: this.formatCount(value),
      detail,
      icon,
      tone
    };
  }

  private createRateDatum(
    label: string,
    numerator: number,
    denominator: number,
    tone: MetricTone,
    options?: {
      scale?: number;
      valueSuffix?: string;
      detail: string;
      minimumNumerator?: number;
      minimumDenominator?: number;
    }
  ) {
    const scale = options?.scale ?? 1;
    const minimumNumerator = options?.minimumNumerator ?? 3;
    const minimumDenominator = options?.minimumDenominator ?? 3;

    if (numerator < minimumNumerator || denominator < minimumDenominator) {
      return null;
    }

    const rawValue = Math.round((numerator * scale) / denominator);
    return {
      label,
      rawValue,
      valueLabel: `${ rawValue }${ options?.valueSuffix ? ` ${ options.valueSuffix }` : '' }`.trim(),
      detail: options?.detail ?? '',
      tone
    };
  }

  private mapBarWidths(
    metrics: {
      label: string;
      rawValue: number;
      valueLabel: string;
      detail: string;
      tone: MetricTone;
    }[]
  ): ApplicationInsightsBar[] {
    const maxValue = Math.max(1, ...metrics.map((metric) => metric.rawValue));

    return metrics.map((metric) => ({
      label: metric.label,
      valueLabel: metric.valueLabel,
      detail: metric.detail,
      widthPercent: Math.max(14, Math.round((metric.rawValue / maxValue) * 100)),
      tone: metric.tone
    }));
  }

  private mapSharingMix(racks: number, patches: number): ApplicationInsightsMixSegment[] {
    const sharedWorks = Math.max(racks + patches, 1);
    const rackPercent = Math.round((racks / sharedWorks) * 100);
    const patchPercent = Math.max(0, 100 - rackPercent);
    let rackWidth = racks > 0 ? rackPercent : 0;
    let patchWidth = patches > 0 ? patchPercent : 0;

    if (racks > 0 && patches > 0) {
      if (rackWidth < 12) {
        rackWidth = 12;
        patchWidth = 88;
      } else if (patchWidth < 12) {
        patchWidth = 12;
        rackWidth = 88;
      }
    }

    const segments: ApplicationInsightsMixSegment[] = [
      {
        label: 'Racks',
        valueLabel: `${ this.formatCount(racks) } (${ rackPercent }%)`,
        widthPercent: rackWidth,
        tone: 'emerald'
      },
      {
        label: 'Patches',
        valueLabel: `${ this.formatCount(patches) } (${ patchPercent }%)`,
        widthPercent: patchWidth,
        tone: 'brand'
      }
    ];

    return segments.filter((segment) => segment.widthPercent > 0);
  }

  private getToneByIndex(index: number): MetricTone {
    const tones: MetricTone[] = ['brand', 'emerald', 'violet', 'amber'];
    return tones[index % tones.length];
  }

  private mapTrendDays(activitySeries: PublicApplicationActivityPoint[]): ApplicationInsightsTrendDay[] {
    const maxDailyTotal = this.getMaxDailyTotal(activitySeries);

    return activitySeries.map((point, index) => {
      const total = point.modules + point.racks + point.patches;
      return {
        date: point.date,
        label: this.shortDateFormatter.format(new Date(`${ point.date }T00:00:00.000Z`)),
        showLabel: index === 0 || index === activitySeries.length - 1 || index % 7 === 0,
        total,
        heightPercent: total > 0 ? Math.max(10, Math.round((total / maxDailyTotal) * 100)) : 0,
        modules: point.modules,
        racks: point.racks,
        patches: point.patches
      };
    });
  }

  private getMaxDailyTotal(activitySeries: PublicApplicationActivityPoint[]): number {
    return Math.max(
      1,
      ...activitySeries.map((point) => point.modules + point.racks + point.patches)
    );
  }

  private formatCount(value: number): string {
    return this.numberFormatter.format(value);
  }

  private formatSignedCount(value: number): string {
    if (value > 0) {
      return `+${ this.formatCount(value) }`;
    }
    return value < 0 ? `-${ this.formatCount(Math.abs(value)) }` : '0';
  }

  private formatPercent(part: number, total: number): string {
    return this.formatPercentValue(part, total);
  }

  private formatPercentValue(part: number, total: number): string {
    return `${ Math.round((part / Math.max(total, 1)) * 100) }%`;
  }

  private getBucketCount(buckets: {label: string; count: number}[], label: string): number {
    return buckets.find((bucket) => bucket.label === label)?.count ?? 0;
  }

  private getTopBucket<T extends {label: string; count: number}>(buckets: T[]): T | undefined {
    return [...buckets].sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    })[0];
  }

  private getMaxRollingWindowTotal(activitySeries: PublicApplicationActivityPoint[], windowSize: number): number {
    if (activitySeries.length === 0) {
      return 0;
    }

    let maxTotal = 0;

    activitySeries.forEach((_, startIndex) => {
      const total = activitySeries
        .slice(startIndex, startIndex + windowSize)
        .reduce((sum, point) => sum + point.modules + point.racks + point.patches, 0);
      maxTotal = Math.max(maxTotal, total);
    });

    return maxTotal;
  }
}
