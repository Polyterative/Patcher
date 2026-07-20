import { PublicApplicationStatistics } from '../../backend/supabase-queries';
import { ApplicationInsightsPage } from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import { createRateDatum, mapBarWidths } from './application-statistics.utils';

type SharingSections = Pick<
  ApplicationInsightsPage,
  'sharingMix' | 'sharingRateBars' | 'sharingHighlights' | 'patchDepthBars' | 'patchHighlights'
>;

type RateDatum = NonNullable<ReturnType<typeof createRateDatum>>;

export function mapSharingSections(
  statistics: PublicApplicationStatistics,
  context: ApplicationStatisticsMapperContext
): SharingSections {
  const rackRecentRefreshRate = statistics.publicRacks > 0
    ? Math.round((statistics.publicRacksUpdatedLast30Days / statistics.publicRacks) * 100)
    : 0;
  const patchRecentRefreshRate = statistics.publicPatches > 0
    ? Math.round((statistics.publicPatchesUpdatedLast30Days / statistics.publicPatches) * 100)
    : 0;

  const sharingRateMetrics = [
    createRateDatum(
      'Rack-sharing profiles / 100 public profiles',
      statistics.publicRackAuthors,
      statistics.publicProfiles,
      'emerald',
      {
        scale: 100,
        valueSuffix: '/ 100',
        detail: `${ context.formatCount(statistics.publicRackAuthors) } public profiles sharing racks · ${ rackRecentRefreshRate }% of shared racks updated in 30 days`,
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
        detail: `${ context.formatCount(statistics.publicPatchAuthors) } public profiles sharing patches · ${ patchRecentRefreshRate }% of shared patches updated in 30 days`,
        minimumNumerator: 3,
        minimumDenominator: 10
      }
    )
  ].filter((metric): metric is RateDatum => !!metric);
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
        detail: `${ context.formatCount(statistics.publicPatchesUpdatedLast30Days) } shared patches updated in the last 30 days`,
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
        detail: `${ context.formatCount(statistics.publicPatchConnections) } saved public connections`,
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
        detail: `${ context.formatCount(statistics.publicPatchAuthors) } public patch-sharing profiles`,
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
        detail: `${ context.formatCount(statistics.publicPatches) } connected public patches`,
        minimumNumerator: 5,
        minimumDenominator: 3
      }
    )
  ].filter((metric): metric is RateDatum => !!metric);

  return {
    sharingMix: context.mapSharingMix(statistics.publicRacks, statistics.publicPatches),
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
          ? context.formatCount(Math.round(statistics.publicPatchConnections / statistics.publicPatches))
          : 'N/A',
        icon: 'share'
      }
    ],
    patchDepthBars: mapBarWidths(patchDepthMetrics),
    patchHighlights: [
      {
        label: 'Connections in public patches',
        value: context.formatCount(statistics.publicPatchConnections),
        icon: 'linear_scale'
      },
      {
        label: 'Profiles sharing patches',
        value: context.formatCount(statistics.publicPatchAuthors),
        icon: 'hub'
      },
      {
        label: 'Recent patch updates',
        value: context.formatCount(statistics.publicPatchesUpdatedLast30Days),
        icon: 'timelapse'
      }
    ]
  };
}
