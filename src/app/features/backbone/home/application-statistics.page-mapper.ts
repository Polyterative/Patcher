import {
  PublicApplicationActivityPoint,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
} from '../../backend/supabase-queries';
import { ApplicationInsightsPage } from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import { mapActivityChart } from './application-statistics.activity-mappers';
import {
  mapFreshnessSections,
  mapHpSections,
  mapMakerSections,
  mapStandardSections,
} from './application-statistics.module-mappers';
import { mapSharingSections } from './application-statistics.sharing-mappers';
import { formatPercentValue } from './application-statistics.utils';

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
    ...mapStandardSections(statistics, moduleInsights, context),
    ...mapHpSections(statistics, moduleInsights, context),
    ...mapFreshnessSections(statistics, moduleInsights, context),
    ...mapMakerSections(moduleInsights, context),
    activityChart: mapActivityChart(activitySeries, context),
    ...mapSharingSections(statistics, context)
  };
}
