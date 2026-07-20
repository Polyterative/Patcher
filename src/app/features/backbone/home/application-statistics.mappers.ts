import {
  PublicApplicationActivityPoint,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
} from '../../backend/supabase-queries';
import {
  ApplicationInsightsPage,
  ApplicationInsightsTeaser,
} from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import { createApplicationStatisticsMapperContext } from './application-statistics.mapper-formatting';
import { mapApplicationInsightsPage } from './application-statistics.page-mapper';

export class ApplicationStatisticsMappers {
  private readonly context: ApplicationStatisticsMapperContext = createApplicationStatisticsMapperContext();

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
    return mapApplicationInsightsPage(statistics, activitySeries, moduleInsights, this.context);
  }
}
