import { Injectable } from '@angular/core';
import {
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
import {
  ApplicationInsightsBar,
  ApplicationInsightsMixSegment,
  ApplicationInsightsPage,
  ApplicationInsightsSnapshotMetric,
  ApplicationInsightsTeaser,
  ApplicationInsightsTrendDay,
  MetricTone,
} from './application-statistics.models';

export type {
  ApplicationInsightStatistic,
  ApplicationInsightsBar,
  ApplicationInsightsHighlight,
  ApplicationInsightsMixSegment,
  ApplicationInsightsPage,
  ApplicationInsightsSnapshotMetric,
  ApplicationInsightsTeaser,
  ApplicationInsightsTrendDay,
  ApplicationInsightsTrendLegendItem,
  ApplicationInsightsTrendMomentumItem,
  MetricTone,
} from './application-statistics.models';

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
    switchMap(() => this.backend.GET.applicationInsightsSnapshot(30)),
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
        ? 'Explore public racks and patches to see how people combine modules, discover ideas, and get oriented before building your own.'
        : 'The public catalogue is live, and this preview will grow as more people share racks and publish connected patches.',
      methodology: 'Rack counts come from shared racks on public profiles, while patch counts match the public patch browser by counting public patches with saved cable connections.',
      emptyMessage: 'Public insight snapshots will appear here once enough public catalogue activity is available.'
    };
  }

  private mapPage(
    statistics: PublicApplicationStatistics,
    activitySeries: PublicApplicationActivityPoint[],
    moduleInsights: PublicApplicationModuleInsights
  ): ApplicationInsightsPage {
    const sharedWorks = statistics.publicRacks + statistics.publicPatches;
    const activeDays = activitySeries.filter((point) => point.modules + point.racks + point.patches > 0).length;
    const fullWindow = this.sumActivityWindow(activitySeries, 0);
    const {modules: moduleActivityTotal, racks: rackActivityTotal, patches: patchActivityTotal} = fullWindow;
    const dominantStandard = this.getTopBucket(moduleInsights.standardMix);
    const mostActiveStandard = this.getTopBucket(moduleInsights.standardActivity);
    const mostCompetitiveStandard = this.getTopBucket(moduleInsights.standardManufacturerCounts ?? []);
    const updatedLast7Days = moduleInsights.freshnessWindows[0]?.count ?? 0;
    const updatedLast30Days = moduleInsights.freshnessWindows[1]?.count ?? 0;
    const updatedLast90Days = moduleInsights.freshnessWindows[2]?.count ?? 0;
    const updatedLast365Days = moduleInsights.freshnessWindows[3]?.count ?? 0;
    const last7Days = this.sumActivityWindow(activitySeries, -7);
    const prev7Days = this.sumActivityWindow(activitySeries, -14, -7);
    const lastSevenDaysTotal = last7Days.modules + last7Days.racks + last7Days.patches;
    const previousSevenDaysTotal = prev7Days.modules + prev7Days.racks + prev7Days.patches;
    const lastSevenDaysModules = last7Days.modules;
    const previousSevenDaysModules = prev7Days.modules;
    const lastSevenDaysRacks = last7Days.racks;
    const previousSevenDaysRacks = prev7Days.racks;
    const lastSevenDaysPatches = last7Days.patches;
    const previousSevenDaysPatches = prev7Days.patches;
    const fastestActivityTrack = [
      {label: 'Modules', count: moduleActivityTotal},
      {label: 'Racks', count: rackActivityTotal},
      {label: 'Patches', count: patchActivityTotal}
    ].sort((a, b) => b.count - a.count)[0];
    const orderedHpBands = this.sortHpBuckets(moduleInsights.hpBands);
    const hpBandActivityCounts = new Map(moduleInsights.hpBandActivity.map((bucket) => [bucket.label, bucket.count]));
    const orderedHpBandActivity = orderedHpBands.map((bucket) => ({
      label: bucket.label,
      count: hpBandActivityCounts.get(bucket.label) ?? 0
    }));
    const hpBandVelocity = orderedHpBands.map((bucket) => {
      const recentUpdates = hpBandActivityCounts.get(bucket.label) ?? 0;
      const rawValue = bucket.count > 0
        ? (recentUpdates * 100) / bucket.count
        : 0;

      return {
        label: bucket.label,
        rawValue,
        recentUpdates,
        totalModules: bucket.count
      };
    });
    const fastestMovingHpBand = [...hpBandVelocity]
      .filter((bucket) => bucket.recentUpdates > 0)
      .sort((a, b) => {
        if (b.rawValue !== a.rawValue) {
          return b.rawValue - a.rawValue;
        }
        return this.getHpBandOrder(a.label) - this.getHpBandOrder(b.label);
      })[0];
    const foundationHpShare = this.getBucketCount(orderedHpBands, '0-2 HP')
      + this.getBucketCount(orderedHpBands, '3-5 HP');
    const largerFormatShare = this.getBucketCount(orderedHpBands, '17-28 HP')
      + this.getBucketCount(orderedHpBands, '29+ HP');
    const standardActivityCounts = new Map(moduleInsights.standardActivity.map((bucket) => [bucket.label, bucket.count]));
    const standardMomentumLeader = moduleInsights.standardMix
      .map((bucket) => {
        const recentCount = standardActivityCounts.get(bucket.label) ?? 0;
        const allTimeShare = statistics.publicModules > 0
          ? (bucket.count / statistics.publicModules) * 100
          : 0;
        const recentShare = updatedLast30Days > 0
          ? (recentCount / updatedLast30Days) * 100
          : 0;
        return {
          label: bucket.label,
          delta: recentShare - allTimeShare
        };
      })
      .filter((bucket) => bucket.delta > 0.5)
      .sort((a, b) => b.delta - a.delta)[0];
    const rackRecentRefreshRate = statistics.publicRacks > 0
      ? Math.round((statistics.publicRacksUpdatedLast30Days / statistics.publicRacks) * 100)
      : 0;
    const patchRecentRefreshRate = statistics.publicPatches > 0
      ? Math.round((statistics.publicPatchesUpdatedLast30Days / statistics.publicPatches) * 100)
      : 0;
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
        label: 'Deceleration zone (31-90 days)',
        count: Math.max(updatedLast90Days - updatedLast30Days, 0),
        detail: `${ this.formatCount(Math.max(updatedLast90Days - updatedLast30Days, 0)) } public modules were active this quarter but not in the last 30 days`
      },
      {
        label: 'Long-tail maintenance (91-365 days)',
        count: Math.max(updatedLast365Days - updatedLast90Days, 0),
        detail: `${ this.formatCount(Math.max(updatedLast365Days - updatedLast90Days, 0)) } public modules were maintained this year without recent churn`
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
        'Shared racks plus public patches with saved connections',
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
          detail: `${ this.formatCount(statistics.publicRackAuthors) } public profiles sharing racks · ${ rackRecentRefreshRate }% of shared racks updated in 30 days`,
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
          detail: `${ this.formatCount(statistics.publicPatchAuthors) } public profiles sharing patches · ${ patchRecentRefreshRate }% of shared patches updated in 30 days`,
          minimumNumerator: 3,
          minimumDenominator: 10
        }
      )
    ].filter((metric): metric is ReturnType<typeof this.createRateDatum> => !!metric);
    const rackSharingRateMetric = sharingRateMetrics.find((metric) => metric.label.startsWith('Rack-sharing'));
    const patchSharingRateMetric = sharingRateMetrics.find((metric) => metric.label.startsWith('Patch-sharing'));

    const patchDepthMetrics = [
        this.createRateDatum(
        'Active patches / 100 shared patches (30d)',
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
      heroSummary: statistics.publicModules > 0
        ? `Today, the public library spans ${ this.formatCount(statistics.publicModules) } modules from ${ this.formatCount(statistics.publicManufacturers) } makers.`
        : 'The public catalogue is live and ready to reveal its first patterns.',
      heroHighlights: [
        {
          label: 'Public modules',
          value: this.formatCount(statistics.publicModules),
          icon: 'view_module'
        },
        {
          label: 'Library momentum',
          value: this.formatPercentValue(statistics.publicModulesUpdatedLast30Days, statistics.publicModules),
          icon: 'timeline'
        },
        {
          label: 'Represented makers',
          value: this.formatCount(statistics.publicManufacturers),
          icon: 'precision_manufacturing'
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
      standardManufacturerBars: this.mapBarWidths(
        (moduleInsights.standardManufacturerCounts ?? []).map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 3)
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
            ? this.formatPercentValue(dominantStandard.count, statistics.publicModules)
            : 'N/A',
          icon: 'emoji_events'
        },
        {
          label: 'Leading format by updates',
          value: mostActiveStandard
            ? `${ mostActiveStandard.label } (${ this.formatCount(mostActiveStandard.count) } in 30d)`
            : 'N/A',
          icon: 'bolt'
        },
        {
          label: 'Momentum leader (30d shift)',
          value: standardMomentumLeader
            ? `${ standardMomentumLeader.label } (+${ standardMomentumLeader.delta.toFixed(1) }%)`
            : mostCompetitiveStandard
              ? `${ mostCompetitiveStandard.label } (${ this.formatCount(mostCompetitiveStandard.count) } makers)`
              : 'Stable',
          icon: standardMomentumLeader ? 'trending_up' : 'groups'
        }
      ],
      hpBandBars: this.mapBarWidths(
        orderedHpBands.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: `${ this.formatPercentValue(bucket.count, statistics.publicModules) } of public modules`,
          tone: this.getToneByIndex(index + 2)
        }))
      ),
      hpBandActivityBars: this.mapBarWidths(
        orderedHpBandActivity.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: updatedLast30Days > 0
            ? `${ this.formatPercentValue(bucket.count, updatedLast30Days) } of modules updated in 30 days`
            : 'No public modules were updated in the last 30 days',
          tone: this.getToneByIndex(index + 3)
        }))
      ),
      hpExactBars: this.mapBarWidths(
        (moduleInsights.hpExact ?? []).map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: `${ this.formatPercentValue(bucket.count, statistics.publicModules) } of public modules`,
          tone: this.getToneByIndex(index + 1)
        }))
      ),
      hpBandVelocityBars: this.mapBarWidths(
        hpBandVelocity.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.rawValue,
          valueLabel: `${ this.formatCount(Math.round(bucket.rawValue)) }%`,
          detail: bucket.recentUpdates > 0
            ? `${ this.formatCount(bucket.recentUpdates) } updates / ${ this.formatCount(bucket.totalModules) } modules`
            : 'No recent updates',
          tone: this.getToneByIndex(index + 4)
        }))
      ),
      hpBandHighlights: [
        {
          label: 'Median width',
          value: `${ this.formatCount(moduleInsights.medianHp) } HP`,
          icon: 'straighten'
        },
        {
          label: '0-5 HP share',
          value: this.formatPercentValue(foundationHpShare, statistics.publicModules),
          icon: 'view_column'
        },
        {
          label: '17+ HP share',
          value: this.formatPercentValue(largerFormatShare, statistics.publicModules),
          icon: 'splitscreen'
        },
        {
          label: 'Fastest-moving width',
          value: fastestMovingHpBand
            ? `${ fastestMovingHpBand.label } (${ this.formatCount(Math.round(fastestMovingHpBand.rawValue)) } / 100)`
            : 'N/A',
          icon: 'bolt'
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
      moduleCatalogueAgeBars: this.mapBarWidths(
        (moduleInsights.createdWindows ?? []).map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 1)
        }))
      ),
      moduleFreshnessHighlights: [
        {
          label: 'Active in 30 days',
          value: this.formatPercentValue(updatedLast30Days, statistics.publicModules),
          icon: 'bolt'
        },
        {
          label: 'This week / 30d activity',
          value: this.formatPercentValue(updatedLast7Days, Math.max(updatedLast30Days, 1)),
          icon: 'moving'
        },
        {
          label: 'Older than a year',
          value: `${ this.formatCount(moduleInsights.staleModules) } (${ this.formatPercentValue(moduleInsights.staleModules, statistics.publicModules) })`,
          icon: 'history'
        },
        {
          label: 'Median catalogue age',
          value: `${ this.formatCount(moduleInsights.medianCatalogueAgeYears) } years`,
          icon: 'inventory_2'
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
          detail: bucket.detail ?? `${ this.formatCount(bucket.count) } HP average width`,
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
          label: 'Single-module makers',
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
            label: 'vs previous 7',
            value: this.formatSignedCount(lastSevenDaysTotal - previousSevenDaysTotal),
            icon: 'trending_up'
          },
          {
            label: 'Leading activity type',
            value: fastestActivityTrack?.label ?? 'N/A',
            icon: 'stacked_line_chart'
          },
          {
            label: 'Busiest 7-day stretch',
            value: this.formatCount(busiestSevenDayStretch),
            icon: 'whatshot'
          },
          {
            label: 'Peak day total',
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
          value: rackSharingRateMetric?.valueLabel ?? 'N/A',
          icon: 'dashboard_customize'
        },
        {
          label: 'Patch sharers / 100 profiles',
          value: patchSharingRateMetric?.valueLabel ?? 'N/A',
          icon: 'hub'
        },
        {
          label: '30-day update rate',
          value: `Racks ${ rackRecentRefreshRate }% · Patches ${ patchRecentRefreshRate }%`,
          icon: 'trending_up'
        },
        {
          label: 'Connections per shared patch',
          value: statistics.publicPatches >= 5
            ? this.formatCount(Math.round(statistics.publicPatchConnections / statistics.publicPatches))
            : 'N/A',
          icon: 'share'
        }
      ],
      patchDepthBars: this.mapBarWidths(patchDepthMetrics),
      patchHighlights: [
        {
          label: 'Connections in public patches',
          value: this.formatCount(statistics.publicPatchConnections),
          icon: 'linear_scale'
        },
        {
          label: 'Profiles sharing patches',
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
      widthPercent: metric.rawValue > 0
        ? Math.max(14, Math.round((metric.rawValue / maxValue) * 100))
        : 0,
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

  private static readonly METRIC_TONES: MetricTone[] = ['brand', 'emerald', 'violet', 'amber'];

  private getToneByIndex(index: number): MetricTone {
    return ApplicationStatisticsService.METRIC_TONES[index % ApplicationStatisticsService.METRIC_TONES.length];
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

  private sortHpBuckets<T extends {label: string}>(buckets: T[]): T[] {
    return [...buckets].sort((a, b) => this.getHpBandOrder(a.label) - this.getHpBandOrder(b.label));
  }

  private getHpBandOrder(label: string): number {
    const orderedLabels = ['0-2 HP', '3-5 HP', '6-8 HP', '9-16 HP', '17-28 HP', '29+ HP'];
    const index = orderedLabels.indexOf(label);
    return index === -1 ? orderedLabels.length : index;
  }

  private sumActivityWindow(
    series: PublicApplicationActivityPoint[],
    start: number,
    end?: number
  ): {modules: number; racks: number; patches: number} {
    const window = series.slice(start, end);
    return {
      modules: window.reduce((sum, p) => sum + p.modules, 0),
      racks: window.reduce((sum, p) => sum + p.racks, 0),
      patches: window.reduce((sum, p) => sum + p.patches, 0),
    };
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
