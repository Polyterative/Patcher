import { PublicApplicationActivityPoint } from '../../backend/supabase-queries';
import { ApplicationInsightsPage } from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import {
  getMaxDailyTotal,
  getMaxRollingWindowTotal,
  sumActivityWindow,
} from './application-statistics.utils';

type ActivityChart = ApplicationInsightsPage['activityChart'];

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
