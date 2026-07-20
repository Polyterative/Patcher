import {
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
} from '../../backend/supabase-queries';
import { ApplicationInsightsPage } from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import {
  formatPercentValue,
  getBucketCount,
  getHpBandOrder,
  getTopBucket,
  mapBarWidths,
  sortHpBuckets,
} from './application-statistics.utils';

type StandardSections = Pick<
  ApplicationInsightsPage,
  'standardMixBars' | 'standardActivityBars' | 'standardWidthBars' | 'standardManufacturerBars' | 'standardMixHighlights'
>;

type HpSections = Pick<
  ApplicationInsightsPage,
  'hpBandBars' | 'hpBandActivityBars' | 'hpExactBars' | 'hpBandVelocityBars' | 'hpBandHighlights'
>;

type FreshnessSections = Pick<
  ApplicationInsightsPage,
  'moduleFreshnessBars' | 'moduleCatalogueAgeBars' | 'moduleFreshnessHighlights'
>;

type MakerSections = Pick<
  ApplicationInsightsPage,
  'topManufacturerBars' | 'activeManufacturerBars' | 'widestManufacturerBars' | 'oneUManufacturerBars' | 'makerHighlights'
>;

export function mapStandardSections(
  statistics: PublicApplicationStatistics,
  moduleInsights: PublicApplicationModuleInsights,
  context: ApplicationStatisticsMapperContext
): StandardSections {
  const dominantStandard = getTopBucket(moduleInsights.standardMix);
  const mostActiveStandard = getTopBucket(moduleInsights.standardActivity);
  const mostCompetitiveStandard = getTopBucket(moduleInsights.standardManufacturerCounts ?? []);
  const updatedLast30Days = moduleInsights.freshnessWindows[1]?.count ?? 0;
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

  return {
    standardMixBars: mapBarWidths(
      moduleInsights.standardMix.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index)
      }))
    ),
    standardActivityBars: mapBarWidths(
      moduleInsights.standardActivity.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index + 1)
      }))
    ),
    standardWidthBars: mapBarWidths(
      moduleInsights.standardWidthAverages.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: `${ context.formatCount(bucket.count) } HP`,
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index + 2)
      }))
    ),
    standardManufacturerBars: mapBarWidths(
      (moduleInsights.standardManufacturerCounts ?? []).map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index + 3)
      }))
    ),
    standardMixHighlights: [
      {
        label: 'Formats represented',
        value: context.formatCount(moduleInsights.standardMix.length),
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
          ? `${ mostActiveStandard.label } (${ context.formatCount(mostActiveStandard.count) } in 30d)`
          : 'N/A',
        icon: 'bolt'
      },
      {
        label: 'Momentum leader (30d shift)',
        value: standardMomentumLeader
          ? `${ standardMomentumLeader.label } (+${ standardMomentumLeader.delta.toFixed(1) }%)`
          : mostCompetitiveStandard
            ? `${ mostCompetitiveStandard.label } (${ context.formatCount(mostCompetitiveStandard.count) } makers)`
            : 'Stable',
        icon: standardMomentumLeader ? 'trending_up' : 'groups'
      }
    ]
  };
}

export function mapHpSections(
  statistics: PublicApplicationStatistics,
  moduleInsights: PublicApplicationModuleInsights,
  context: ApplicationStatisticsMapperContext
): HpSections {
  const updatedLast30Days = moduleInsights.freshnessWindows[1]?.count ?? 0;
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

  return {
    hpBandBars: mapBarWidths(
      orderedHpBands.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: `${ formatPercentValue(bucket.count, statistics.publicModules) } of public modules`,
        tone: context.getToneByIndex(index + 2)
      }))
    ),
    hpBandActivityBars: mapBarWidths(
      orderedHpBandActivity.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: updatedLast30Days > 0
          ? `${ formatPercentValue(bucket.count, updatedLast30Days) } of modules updated in 30 days`
          : 'No public modules were updated in the last 30 days',
        tone: context.getToneByIndex(index + 3)
      }))
    ),
    hpExactBars: mapBarWidths(
      (moduleInsights.hpExact ?? []).map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: `${ formatPercentValue(bucket.count, statistics.publicModules) } of public modules`,
        tone: context.getToneByIndex(index + 1)
      }))
    ),
    hpBandVelocityBars: mapBarWidths(
      hpBandVelocity.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.rawValue,
        valueLabel: `${ context.formatCount(Math.round(bucket.rawValue)) }%`,
        detail: bucket.recentUpdates > 0
          ? `${ context.formatCount(bucket.recentUpdates) } updates / ${ context.formatCount(bucket.totalModules) } modules`
          : 'No recent updates',
        tone: context.getToneByIndex(index + 4)
      }))
    ),
    hpBandHighlights: [
      {
        label: 'Median width',
        value: `${ context.formatCount(moduleInsights.medianHp) } HP`,
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
          ? `${ fastestMovingHpBand.label } (${ context.formatCount(Math.round(fastestMovingHpBand.rawValue)) } / 100)`
          : 'N/A',
        icon: 'bolt'
      }
    ]
  };
}

export function mapFreshnessSections(
  statistics: PublicApplicationStatistics,
  moduleInsights: PublicApplicationModuleInsights,
  context: ApplicationStatisticsMapperContext
): FreshnessSections {
  const updatedLast7Days = moduleInsights.freshnessWindows[0]?.count ?? 0;
  const updatedLast30Days = moduleInsights.freshnessWindows[1]?.count ?? 0;
  const updatedLast90Days = moduleInsights.freshnessWindows[2]?.count ?? 0;
  const updatedLast365Days = moduleInsights.freshnessWindows[3]?.count ?? 0;
  const recentFreshnessCount = Math.max(updatedLast30Days - updatedLast7Days, 0);
  const deceleratingFreshnessCount = Math.max(updatedLast90Days - updatedLast30Days, 0);
  const longTailFreshnessCount = Math.max(updatedLast365Days - updatedLast90Days, 0);
  const freshnessCohorts = [
    {
      label: 'Fresh (0-7 days)',
      count: updatedLast7Days,
      detail: `${ context.formatCount(updatedLast7Days) } public modules moved in the last week`
    },
    {
      label: 'Recent (8-30 days)',
      count: recentFreshnessCount,
      detail: `${ context.formatCount(recentFreshnessCount) } public modules moved earlier this month`
    },
    {
      label: 'Deceleration zone (31-90 days)',
      count: deceleratingFreshnessCount,
      detail: `${ context.formatCount(deceleratingFreshnessCount) } public modules were active this quarter but not in the last 30 days`
    },
    {
      label: 'Long-tail maintenance (91-365 days)',
      count: longTailFreshnessCount,
      detail: `${ context.formatCount(longTailFreshnessCount) } public modules were maintained this year without recent churn`
    },
    {
      label: 'Older than a year',
      count: moduleInsights.staleModules,
      detail: `${ context.formatCount(moduleInsights.staleModules) } public modules have been quiet for over a year`
    }
  ];

  return {
    moduleFreshnessBars: mapBarWidths(
      freshnessCohorts.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index)
      }))
    ),
    moduleCatalogueAgeBars: mapBarWidths(
      (moduleInsights.createdWindows ?? []).map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index + 1)
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
        value: `${ context.formatCount(moduleInsights.staleModules) } (${ formatPercentValue(moduleInsights.staleModules, statistics.publicModules) })`,
        icon: 'history'
      },
      {
        label: 'Median catalogue age',
        value: `${ context.formatCount(moduleInsights.medianCatalogueAgeYears) } years`,
        icon: 'inventory_2'
      }
    ]
  };
}

export function mapMakerSections(
  moduleInsights: PublicApplicationModuleInsights,
  context: ApplicationStatisticsMapperContext
): MakerSections {
  return {
    topManufacturerBars: mapBarWidths(
      moduleInsights.topManufacturers.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index)
      }))
    ),
    activeManufacturerBars: mapBarWidths(
      moduleInsights.activeManufacturers.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: context.formatCount(bucket.count),
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index + 1)
      }))
    ),
    widestManufacturerBars: mapBarWidths(
      moduleInsights.widestManufacturers.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: `${ context.formatCount(bucket.count) } HP`,
        detail: bucket.detail ?? `${ context.formatCount(bucket.count) } HP average width`,
        tone: context.getToneByIndex(index + 2)
      }))
    ),
    oneUManufacturerBars: mapBarWidths(
      moduleInsights.oneUManufacturers.map((bucket, index) => ({
        label: bucket.label,
        rawValue: bucket.count,
        valueLabel: `${ context.formatCount(bucket.count) }%`,
        detail: bucket.detail ?? '',
        tone: context.getToneByIndex(index + 3)
      }))
    ),
    makerHighlights: [
      {
        label: 'Top 5 maker share',
        value: `${ context.formatCount(moduleInsights.topFiveManufacturerShare) }%`,
        icon: 'pie_chart'
      },
      {
        label: 'Single-module makers',
        value: context.formatCount(moduleInsights.soloManufacturerCount),
        icon: 'filter_1'
      },
      {
        label: 'Median maker catalogue',
        value: `${ context.formatCount(moduleInsights.medianModulesPerManufacturer) } modules`,
        icon: 'balance'
      }
    ]
  };
}
