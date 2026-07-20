import { PublicApplicationActivityPoint } from '../../backend/supabase-queries';
import {
  ApplicationInsightsMixSegment,
  ApplicationInsightsSnapshotMetric,
  ApplicationInsightsTrendDay,
  MetricTone,
} from './application-statistics.models';

export interface ApplicationStatisticsMapperContext {
  formatCount(value: number): string;
  formatSignedCount(value: number): string;
  getToneByIndex(index: number): MetricTone;
  createSnapshotMetric(
    label: string,
    value: number,
    detail: string,
    icon: string,
    tone: MetricTone
  ): ApplicationInsightsSnapshotMetric;
  mapSharingMix(racks: number, patches: number): ApplicationInsightsMixSegment[];
  mapTrendDays(activitySeries: PublicApplicationActivityPoint[]): ApplicationInsightsTrendDay[];
}
