import {
  PublicApplicationActivityPoint,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
} from '../../backend/supabase-queries';
import {
  ApplicationInsightsMixSegment,
  ApplicationInsightsPage,
  ApplicationInsightsSnapshotMetric,
  ApplicationInsightsTeaser,
  ApplicationInsightsTrendDay,
  MetricTone,
} from './application-statistics.models';
import {
  createRateDatum,
  formatPercentValue,
  getBucketCount,
  getHpBandOrder,
  getMaxDailyTotal,
  getMaxRollingWindowTotal,
  getTopBucket,
  mapBarWidths,
  sortHpBuckets,
  sumActivityWindow,
} from './application-statistics.utils';

const METRIC_TONES: MetricTone[] = ['brand', 'emerald', 'violet', 'amber'];

export class ApplicationStatisticsMappers {
  private readonly numberFormatter = new Intl.NumberFormat('en-US');
  private readonly shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });

  mapTeaser(statistics: PublicApplicationStatistics): ApplicationInsightsTeaser {
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

  mapPage(
    statistics: PublicApplicationStatistics,
    activitySeries: PublicApplicationActivityPoint[],
    moduleInsights: PublicApplicationModuleInsights
  ): ApplicationInsightsPage {
    const sharedWorks = statistics.publicRacks + statistics.publicPatches;
    const activeDays = activitySeries.filter((point) => point.modules + point.racks + point.patches > 0).length;
    const fullWindow = sumActivityWindow(activitySeries, 0);
    const {modules: moduleActivityTotal, racks: rackActivityTotal, patches: patchActivityTotal} = fullWindow;
    const dominantStandard = getTopBucket(moduleInsights.standardMix);
    const mostActiveStandard = getTopBucket(moduleInsights.standardActivity);
    const mostCompetitiveStandard = getTopBucket(moduleInsights.standardManufacturerCounts ?? []);
    const updatedLast7Days = moduleInsights.freshnessWindows[0]?.count ?? 0;
    const updatedLast30Days = moduleInsights.freshnessWindows[1]?.count ?? 0;
    const updatedLast90Days = moduleInsights.freshnessWindows[2]?.count ?? 0;
    const updatedLast365Days = moduleInsights.freshnessWindows[3]?.count ?? 0;
    const last7Days = sumActivityWindow(activitySeries, -7);
    const prev7Days = sumActivityWindow(activitySeries, -14, -7);
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
    const orderedHpBands = sortHpBuckets(moduleInsights.hpBands);
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
        return getHpBandOrder(a.label) - getHpBandOrder(b.label);
      })[0];
    const foundationHpShare = getBucketCount(orderedHpBands, '0-2 HP')
      + getBucketCount(orderedHpBands, '3-5 HP');
    const largerFormatShare = getBucketCount(orderedHpBands, '17-28 HP')
      + getBucketCount(orderedHpBands, '29+ HP');
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
    const busiestSevenDayStretch = getMaxRollingWindowTotal(activitySeries, 7);

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
      createRateDatum(
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
      createRateDatum(
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
    ].filter((metric): metric is ReturnType<typeof createRateDatum> => !!metric);
    const rackSharingRateMetric = sharingRateMetrics.find((metric) => metric.label.startsWith('Rack-sharing'));
    const patchSharingRateMetric = sharingRateMetrics.find((metric) => metric.label.startsWith('Patch-sharing'));

    const patchDepthMetrics = [
        createRateDatum(
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
      createRateDatum(
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
      createRateDatum(
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
      createRateDatum(
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
    ].filter((metric): metric is ReturnType<typeof createRateDatum> => !!metric);

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
          value: formatPercentValue(statistics.publicModulesUpdatedLast30Days, statistics.publicModules),
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
      standardMixBars: mapBarWidths(
        moduleInsights.standardMix.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index)
        }))
      ),
      standardActivityBars: mapBarWidths(
        moduleInsights.standardActivity.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 1)
        }))
      ),
      standardWidthBars: mapBarWidths(
        moduleInsights.standardWidthAverages.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: `${ this.formatCount(bucket.count) } HP`,
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 2)
        }))
      ),
      standardManufacturerBars: mapBarWidths(
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
            ? formatPercentValue(dominantStandard.count, statistics.publicModules)
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
      hpBandBars: mapBarWidths(
        orderedHpBands.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: `${ formatPercentValue(bucket.count, statistics.publicModules) } of public modules`,
          tone: this.getToneByIndex(index + 2)
        }))
      ),
      hpBandActivityBars: mapBarWidths(
        orderedHpBandActivity.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: updatedLast30Days > 0
            ? `${ formatPercentValue(bucket.count, updatedLast30Days) } of modules updated in 30 days`
            : 'No public modules were updated in the last 30 days',
          tone: this.getToneByIndex(index + 3)
        }))
      ),
      hpExactBars: mapBarWidths(
        (moduleInsights.hpExact ?? []).map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: `${ formatPercentValue(bucket.count, statistics.publicModules) } of public modules`,
          tone: this.getToneByIndex(index + 1)
        }))
      ),
      hpBandVelocityBars: mapBarWidths(
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
          value: formatPercentValue(foundationHpShare, statistics.publicModules),
          icon: 'view_column'
        },
        {
          label: '17+ HP share',
          value: formatPercentValue(largerFormatShare, statistics.publicModules),
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
      moduleFreshnessBars: mapBarWidths(
        freshnessCohorts.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index)
        }))
      ),
      moduleCatalogueAgeBars: mapBarWidths(
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
          value: formatPercentValue(updatedLast30Days, statistics.publicModules),
          icon: 'bolt'
        },
        {
          label: 'This week / 30d activity',
          value: formatPercentValue(updatedLast7Days, Math.max(updatedLast30Days, 1)),
          icon: 'moving'
        },
        {
          label: 'Older than a year',
          value: `${ this.formatCount(moduleInsights.staleModules) } (${ formatPercentValue(moduleInsights.staleModules, statistics.publicModules) })`,
          icon: 'history'
        },
        {
          label: 'Median catalogue age',
          value: `${ this.formatCount(moduleInsights.medianCatalogueAgeYears) } years`,
          icon: 'inventory_2'
        }
      ],
      topManufacturerBars: mapBarWidths(
        moduleInsights.topManufacturers.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index)
        }))
      ),
      activeManufacturerBars: mapBarWidths(
        moduleInsights.activeManufacturers.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: this.formatCount(bucket.count),
          detail: bucket.detail ?? '',
          tone: this.getToneByIndex(index + 1)
        }))
      ),
      widestManufacturerBars: mapBarWidths(
        moduleInsights.widestManufacturers.map((bucket, index) => ({
          label: bucket.label,
          rawValue: bucket.count,
          valueLabel: `${ this.formatCount(bucket.count) } HP`,
          detail: bucket.detail ?? `${ this.formatCount(bucket.count) } HP average width`,
          tone: this.getToneByIndex(index + 2)
        }))
      ),
      oneUManufacturerBars: mapBarWidths(
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
            value: this.formatCount(getMaxDailyTotal(activitySeries)),
            icon: 'bolt'
          }
        ]
      },
      sharingMix: this.mapSharingMix(statistics.publicRacks, statistics.publicPatches),
      sharingRateBars: mapBarWidths(sharingRateMetrics),
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
      patchDepthBars: mapBarWidths(patchDepthMetrics),
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
    return METRIC_TONES[index % METRIC_TONES.length];
  }

  private mapTrendDays(activitySeries: PublicApplicationActivityPoint[]): ApplicationInsightsTrendDay[] {
    const maxDailyTotal = getMaxDailyTotal(activitySeries);

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

  private formatCount(value: number): string {
    return this.numberFormatter.format(value);
  }

  private formatSignedCount(value: number): string {
    if (value > 0) {
      return `+${ this.formatCount(value) }`;
    }
    return value < 0 ? `-${ this.formatCount(Math.abs(value)) }` : '0';
  }
}
