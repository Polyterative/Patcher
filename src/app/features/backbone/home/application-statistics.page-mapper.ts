import {
  PublicApplicationActivityPoint,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
} from '../../backend/supabase-queries';
import { ApplicationInsightsPage } from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import { mapActivityChart, mapActivityTakeaway, mapFreshTakeaway } from './application-statistics.activity-mappers';
import {
  mapFreshnessSections,
  mapHpSections,
  mapMakerSections,
  mapStandardSections,
} from './application-statistics.module-mappers';
import { mapSharingSections } from './application-statistics.sharing-mappers';
import { mapPrivateFootprint } from './application-statistics.footprint-mappers';
import { formatPercentValue } from './application-statistics.utils';

// Library-takeaway thresholds: shared works (shared racks plus connected
// public patches) per public profile. Boundaries are inclusive to the upper
// side: exactly one work per profile reads as about one, exactly two reads
// as multiple.
export const LIBRARY_TAKEAWAY_SUPPRESSED =
  'The public library footprint is not reported yet.';
export const LIBRARY_TAKEAWAY_BELOW_ONE =
  'Shared works average less than one per public profile.';
export const LIBRARY_TAKEAWAY_ABOUT_ONE =
  'Shared works average about one per public profile.';
export const LIBRARY_TAKEAWAY_MULTIPLE =
  'Shared works average at least two per public profile.';

export function mapLibraryTakeaway(
  statistics: PublicApplicationStatistics
): string {
  if (statistics.publicProfiles <= 0) {
    return LIBRARY_TAKEAWAY_SUPPRESSED;
  }

  const worksPerProfile = (statistics.publicRacks + statistics.publicPatches)
    / Math.max(statistics.publicProfiles, 1);
  if (worksPerProfile < 1) {
    return LIBRARY_TAKEAWAY_BELOW_ONE;
  }
  if (worksPerProfile < 2) {
    return LIBRARY_TAKEAWAY_ABOUT_ONE;
  }
  return LIBRARY_TAKEAWAY_MULTIPLE;
}

export function mapApplicationInsightsPage(
  statistics: PublicApplicationStatistics,
  activitySeries: PublicApplicationActivityPoint[],
  moduleInsights: PublicApplicationModuleInsights,
  context: ApplicationStatisticsMapperContext
): ApplicationInsightsPage {
  const sharedWorks = statistics.publicRacks + statistics.publicPatches;

  return {
    heroSummary: statistics.publicModules > 0
      ? `Today, the public library spans ${ context.formatCount(statistics.publicModules) } modules from ${ context.formatCount(statistics.publicManufacturers) } makers.`
      : 'The public catalogue is live and ready to reveal its first patterns.',
    heroHighlights: [
      {
        label: 'Public modules',
        value: context.formatCount(statistics.publicModules),
        icon: 'view_module'
      },
      {
        label: 'Library momentum',
        value: formatPercentValue(statistics.publicModulesUpdatedLast30Days, statistics.publicModules),
        icon: 'timeline'
      },
      {
        label: 'Represented makers',
        value: context.formatCount(statistics.publicManufacturers),
        icon: 'precision_manufacturing'
      }
    ],
    footprintSnapshot: [
      context.createSnapshotMetric(
        'Public modules',
        statistics.publicModules,
        'Visible module catalogue',
        'view_module',
        'brand'
      ),
      context.createSnapshotMetric(
        'Represented makers',
        statistics.publicManufacturers,
        'Manufacturers with public modules',
        'precision_manufacturing',
        'violet'
      ),
      context.createSnapshotMetric(
        'Public profiles',
        statistics.publicProfiles,
        'Profiles visible on the public web',
        'person_search',
        'emerald'
      ),
      context.createSnapshotMetric(
        'Shared works',
        sharedWorks,
        'Shared racks plus public patches with saved connections',
        'layers',
        'amber'
      )
    ],
    footprintHighlights: [
      {
        label: 'Public racks',
        value: context.formatCount(statistics.publicRacks),
        icon: 'space_dashboard'
      },
      {
        label: 'Connected patches',
        value: context.formatCount(statistics.publicPatches),
        icon: 'cable'
      },
      {
        label: 'Modules updated in 30 days',
        value: context.formatCount(statistics.publicModulesUpdatedLast30Days),
        icon: 'schedule'
      }
    ],
    freshTakeaway: mapFreshTakeaway(activitySeries),
    activityTakeaway: mapActivityTakeaway(statistics),
    libraryTakeaway: mapLibraryTakeaway(statistics),
    ...mapStandardSections(statistics, moduleInsights, context),
    ...mapHpSections(statistics, moduleInsights, context),
    ...mapFreshnessSections(statistics, moduleInsights, context),
    ...mapMakerSections(moduleInsights, context),
    activityChart: mapActivityChart(activitySeries, context),
    ...mapSharingSections(statistics, context),
    privateFootprint: mapPrivateFootprint(statistics, context)
  };
}
