import {
  PublicApplicationActivityPoint,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
} from '../../backend/supabase-queries';
import {
  ApplicationDiscoveryEntry,
  ApplicationInsightsPage,
  ApplicationInsightsTeaser,
} from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import { createApplicationStatisticsMapperContext } from './application-statistics.mapper-formatting';
import { mapApplicationInsightsPage } from './application-statistics.page-mapper';

// Hero-takeaway thresholds: concentration of the ownership ranking in its
// leader, read from the live Top-6 payload order. A leader with at least 2x
// the runner-up reads as a clear frontrunner, 1.5x reads as a clear margin
// (both boundaries inclusive); anything closer reads as a close pack.
export const HERO_TAKEAWAY_STRONG_LEAD_RATIO = 2;
export const HERO_TAKEAWAY_CLEAR_LEAD_RATIO = 1.5;
export const HERO_TAKEAWAY_EMPTY =
  'Rankings appear once community counts reach the reporting threshold.';
export const HERO_TAKEAWAY_SINGLE =
  'A single module tops the ranking.';
export const HERO_TAKEAWAY_SHARED_LEAD =
  'The top-ranked modules share the lead.';
export const HERO_TAKEAWAY_CLOSE_PACK =
  'The top-ranked modules sit close together with no runaway leader.';
export const HERO_TAKEAWAY_CLEAR_MARGIN =
  'The top-ranked module leads the next-ranked design by a clear margin.';

export function mapHeroTakeaway(
  entries: ApplicationDiscoveryEntry[],
  countNoun: string
): string {
  if (entries.length === 0) {
    return HERO_TAKEAWAY_EMPTY;
  }

  if (entries.length === 1) {
    return HERO_TAKEAWAY_SINGLE;
  }

  const [leader, runnerUp] = entries;
  if (leader.count === runnerUp.count) {
    return HERO_TAKEAWAY_SHARED_LEAD;
  }
  if (leader.count / Math.max(runnerUp.count, 1) >= HERO_TAKEAWAY_STRONG_LEAD_RATIO) {
    return `The top-ranked module holds at least twice as many ${ countNoun } as the next-ranked design.`;
  }
  if (leader.count / Math.max(runnerUp.count, 1) >= HERO_TAKEAWAY_CLEAR_LEAD_RATIO) {
    return HERO_TAKEAWAY_CLEAR_MARGIN;
  }
  return HERO_TAKEAWAY_CLOSE_PACK;
}

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
