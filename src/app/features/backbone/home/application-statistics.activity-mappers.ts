import {
  PublicApplicationActivityPoint,
  PublicApplicationStatistics
} from '../../backend/supabase-queries';
import { ApplicationInsightsPage } from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import {
  getMaxDailyTotal,
  getMaxRollingWindowTotal,
  sumActivityWindow,
} from './application-statistics.utils';

type ActivityChart = ApplicationInsightsPage['activityChart'];

// Fresh-takeaway thresholds: a single symmetric majority line at 60% keeps the
// branches hysteresis-free, mirroring the private-footprint takeaway. Shares
// use exact counts (not rounded labels), and the 60% boundary is inclusive to
// the majority side.
export const FRESH_TAKEAWAY_MAJORITY_SHARE = 0.6;
export const FRESH_TAKEAWAY_EMPTY =
  'No public updates were recorded in the last 30 days.';
export const FRESH_TAKEAWAY_MODULES_MAJORITY =
  'Module updates account for most 30-day activity, outpacing rack and patch updates combined.';
export const FRESH_TAKEAWAY_RACKS_MAJORITY =
  'Rack updates account for most 30-day activity, outpacing module and patch updates combined.';
export const FRESH_TAKEAWAY_PATCHES_MAJORITY =
  'Patch updates account for most 30-day activity, outpacing module and rack updates combined.';
export const FRESH_TAKEAWAY_MIXED =
  'Updates are spread across modules, racks, and patches with no single dominant type.';

export function mapFreshTakeaway(
  activitySeries: PublicApplicationActivityPoint[]
): string {
  const totals = sumActivityWindow(activitySeries, 0);
  const grandTotal = totals.modules + totals.racks + totals.patches;

  if (grandTotal <= 0) {
    return FRESH_TAKEAWAY_EMPTY;
  }

  if (totals.modules / grandTotal >= FRESH_TAKEAWAY_MAJORITY_SHARE) {
    return FRESH_TAKEAWAY_MODULES_MAJORITY;
  }
  if (totals.racks / grandTotal >= FRESH_TAKEAWAY_MAJORITY_SHARE) {
    return FRESH_TAKEAWAY_RACKS_MAJORITY;
  }
  if (totals.patches / grandTotal >= FRESH_TAKEAWAY_MAJORITY_SHARE) {
    return FRESH_TAKEAWAY_PATCHES_MAJORITY;
  }
  return FRESH_TAKEAWAY_MIXED;
}

// Activity-takeaway thresholds: penetration of the 30-day module updates into
// the all-time public catalogue. Boundaries are inclusive to the upper side:
// a rate of exactly 20% reads as high, exactly 2% reads as steady.
export const ACTIVITY_TAKEAWAY_HIGH_RATE = 0.2;
export const ACTIVITY_TAKEAWAY_STEADY_RATE = 0.02;
export const ACTIVITY_TAKEAWAY_SUPPRESSED =
  'Recent movement is not reported yet.';
export const ACTIVITY_TAKEAWAY_IDLE =
  'No public modules moved in the last 30 days.';
export const ACTIVITY_TAKEAWAY_HIGH =
  'At least one in five public modules moved in the last 30 days.';
export const ACTIVITY_TAKEAWAY_STEADY =
  'About one in twenty public modules moved in the last 30 days.';
export const ACTIVITY_TAKEAWAY_QUIET =
  'Only a small fraction of public modules moved in the last 30 days.';

export function mapActivityTakeaway(
  statistics: PublicApplicationStatistics
): string {
  if (statistics.publicModules <= 0) {
    return ACTIVITY_TAKEAWAY_SUPPRESSED;
  }

  if (statistics.publicModulesUpdatedLast30Days <= 0) {
    return ACTIVITY_TAKEAWAY_IDLE;
  }

  const rate = statistics.publicModulesUpdatedLast30Days / Math.max(statistics.publicModules, 1);
  if (rate >= ACTIVITY_TAKEAWAY_HIGH_RATE) {
    return ACTIVITY_TAKEAWAY_HIGH;
  }
  if (rate >= ACTIVITY_TAKEAWAY_STEADY_RATE) {
    return ACTIVITY_TAKEAWAY_STEADY;
  }
  return ACTIVITY_TAKEAWAY_QUIET;
}

export function mapActivityChart(
  activitySeries: PublicApplicationActivityPoint[],
  context: ApplicationStatisticsMapperContext
): ActivityChart {
  const activeDays = activitySeries.filter((point) => point.modules + point.racks + point.patches > 0).length;
  const fullWindow = sumActivityWindow(activitySeries, 0);
  const {modules: moduleActivityTotal, racks: rackActivityTotal, patches: patchActivityTotal} = fullWindow;
  const last7Days = sumActivityWindow(activitySeries, -7);
  const prev7Days = sumActivityWindow(activitySeries, -14, -7);
  const lastSevenDaysTotal = last7Days.modules + last7Days.racks + last7Days.patches;
  const previousSevenDaysTotal = prev7Days.modules + prev7Days.racks + prev7Days.patches;
  const fastestActivityTrack = [
    {label: 'Modules', count: moduleActivityTotal},
    {label: 'Racks', count: rackActivityTotal},
    {label: 'Patches', count: patchActivityTotal}
  ].sort((a, b) => b.count - a.count)[0];
  const busiestSevenDayStretch = getMaxRollingWindowTotal(activitySeries, 7);

  return {
    days: context.mapTrendDays(activitySeries),
    legend: [
      {
        label: 'Modules',
        valueLabel: context.formatCount(moduleActivityTotal),
        toneClass: 'modules'
      },
      {
        label: 'Racks',
        valueLabel: context.formatCount(rackActivityTotal),
        toneClass: 'racks'
      },
      {
        label: 'Patches',
        valueLabel: context.formatCount(patchActivityTotal),
        toneClass: 'patches'
      }
    ],
    momentum: [
      {
        label: 'Modules',
        valueLabel: `${ context.formatCount(last7Days.modules) } in last 7d`,
        deltaLabel: `${ context.formatSignedCount(last7Days.modules - prev7Days.modules) } vs previous 7`,
        toneClass: 'modules'
      },
      {
        label: 'Racks',
        valueLabel: `${ context.formatCount(last7Days.racks) } in last 7d`,
        deltaLabel: `${ context.formatSignedCount(last7Days.racks - prev7Days.racks) } vs previous 7`,
        toneClass: 'racks'
      },
      {
        label: 'Patches',
        valueLabel: `${ context.formatCount(last7Days.patches) } in last 7d`,
        deltaLabel: `${ context.formatSignedCount(last7Days.patches - prev7Days.patches) } vs previous 7`,
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
        value: context.formatCount(lastSevenDaysTotal),
        icon: 'date_range'
      },
      {
        label: 'vs previous 7',
        value: context.formatSignedCount(lastSevenDaysTotal - previousSevenDaysTotal),
        icon: 'trending_up'
      },
      {
        label: 'Leading activity type',
        value: fastestActivityTrack?.label ?? 'N/A',
        icon: 'stacked_line_chart'
      },
      {
        label: 'Busiest 7-day stretch',
        value: context.formatCount(busiestSevenDayStretch),
        icon: 'whatshot'
      },
      {
        label: 'Peak day total',
        value: context.formatCount(getMaxDailyTotal(activitySeries)),
        icon: 'bolt'
      }
    ]
  };
}
