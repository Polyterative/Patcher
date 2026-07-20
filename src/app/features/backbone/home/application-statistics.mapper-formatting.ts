import { PublicApplicationActivityPoint } from '../../backend/supabase-queries';
import {
  ApplicationInsightsMixSegment,
  ApplicationInsightsSnapshotMetric,
  ApplicationInsightsTrendDay,
  MetricTone,
} from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import { getMaxDailyTotal } from './application-statistics.utils';

const METRIC_TONES: MetricTone[] = ['brand', 'emerald', 'violet', 'amber'];

export function createApplicationStatisticsMapperContext(): ApplicationStatisticsMapperContext {
  const numberFormatter = new Intl.NumberFormat('en-US');
  const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });

  const formatCount = (value: number): string => numberFormatter.format(value);

  const formatSignedCount = (value: number): string => {
    if (value > 0) {
      return `+${ formatCount(value) }`;
    }
    return value < 0 ? `-${ formatCount(Math.abs(value)) }` : '0';
  };

  return {
    formatCount,
    formatSignedCount,
    getToneByIndex(index: number): MetricTone {
      return METRIC_TONES[index % METRIC_TONES.length];
    },
    createSnapshotMetric(
      label: string,
      value: number,
      detail: string,
      icon: string,
      tone: MetricTone
    ): ApplicationInsightsSnapshotMetric {
      return {
        label,
        valueLabel: formatCount(value),
        detail,
        icon,
        tone
      };
    },
    mapSharingMix(racks: number, patches: number): ApplicationInsightsMixSegment[] {
      return mapSharingMix(racks, patches, formatCount);
    },
    mapTrendDays(activitySeries: PublicApplicationActivityPoint[]): ApplicationInsightsTrendDay[] {
      return mapTrendDays(activitySeries, shortDateFormatter);
    }
  };
}

function mapSharingMix(
  racks: number,
  patches: number,
  formatCount: (value: number) => string
): ApplicationInsightsMixSegment[] {
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
      valueLabel: `${ formatCount(racks) } (${ rackPercent }%)`,
      widthPercent: rackWidth,
      tone: 'emerald'
    },
    {
      label: 'Patches',
      valueLabel: `${ formatCount(patches) } (${ patchPercent }%)`,
      widthPercent: patchWidth,
      tone: 'brand'
    }
  ];

  return segments.filter((segment) => segment.widthPercent > 0);
}

function mapTrendDays(
  activitySeries: PublicApplicationActivityPoint[],
  shortDateFormatter: Intl.DateTimeFormat
): ApplicationInsightsTrendDay[] {
  const maxDailyTotal = getMaxDailyTotal(activitySeries);

  return activitySeries.map((point, index) => {
    const total = point.modules + point.racks + point.patches;
    return {
      date: point.date,
      label: shortDateFormatter.format(new Date(`${ point.date }T00:00:00.000Z`)),
      showLabel: index === 0 || index === activitySeries.length - 1 || index % 7 === 0,
      total,
      heightPercent: total > 0 ? Math.max(10, Math.round((total / maxDailyTotal) * 100)) : 0,
      modules: point.modules,
      racks: point.racks,
      patches: point.patches
    };
  });
}
