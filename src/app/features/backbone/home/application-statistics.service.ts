import { Injectable } from '@angular/core';
import {
  ReplaySubject
} from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseService } from '../../backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ApplicationStatisticsMappers } from './application-statistics.mappers';

export type {
  ApplicationInsightStatistic,
  ApplicationInsightsBar,
  ApplicationInsightsHighlight,
  ApplicationInsightsMixSegment,
  ApplicationInsightsPage,
  ApplicationInsightsSnapshotMetric,
  ApplicationInsightsTeaser,
  ApplicationInsightsTrendDay,
  ApplicationInsightsTrendLegendItem,
  ApplicationInsightsTrendMomentumItem,
  MetricTone,
} from './application-statistics.models';

@Injectable()
export class ApplicationStatisticsService extends SubManager {
  private readonly refreshRequest$ = new ReplaySubject<void>(1);
  private readonly mappers = new ApplicationStatisticsMappers();

  readonly teaser$ = this.refreshRequest$.pipe(
    switchMap(() => this.backend.GET.applicationStatistics()),
    map((statistics) => this.mappers.mapTeaser(statistics))
  );
  readonly page$ = this.refreshRequest$.pipe(
    switchMap(() => this.backend.GET.applicationInsightsSnapshot(30)),
    map(({statistics, activitySeries, moduleInsights}) => this.mappers.mapPage(statistics, activitySeries, moduleInsights))
  );

  constructor(
    private readonly backend: SupabaseService
  ) {
    super();
    this.refreshRequest$.next();
  }

  refresh() {
    this.refreshRequest$.next();
  }
}
