import { Injectable } from '@angular/core';
import {
  ReplaySubject,
  of
} from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseService } from '../../backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ApplicationStatisticsMappers } from './application-statistics.mappers';
import {
  ApplicationDiscoveryEntry,
  ApplicationDiscoverySnapshot
} from './application-statistics.models';
import { MinimalModule } from 'src/app/models/module';

const HOME_DISCOVERY_LIMIT = 6;
const HOME_DISCOVERY_MIN_COUNT = 1;

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
  ApplicationDiscoverySnapshot,
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
  readonly discovery$ = this.refreshRequest$.pipe(
    switchMap(() => this.backend.GET.applicationModuleDiscovery(HOME_DISCOVERY_LIMIT, HOME_DISCOVERY_MIN_COUNT)),
    switchMap((snapshot) => {
      const moduleIds = this.getDiscoveryModuleIds(snapshot);

      if (moduleIds.length === 0) {
        return of(snapshot);
      }

      return this.backend.GET.publicModulesByIds(moduleIds).pipe(
        map((modules) => this.attachDiscoveryModules(snapshot, modules))
      );
    })
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

  private getDiscoveryModuleIds(snapshot: ApplicationDiscoverySnapshot): number[] {
    return [...new Set([
      ...snapshot.mostOwned,
      ...snapshot.mostWanted,
      ...snapshot.mostSold
    ].map(entry => entry.id))];
  }

  private attachDiscoveryModules(
    snapshot: ApplicationDiscoverySnapshot,
    modules: MinimalModule[]
  ): ApplicationDiscoverySnapshot {
    const modulesById = new Map(modules.map(module => [module.id, module]));

    return {
      mostOwned: this.attachModulesToEntries(snapshot.mostOwned, modulesById),
      mostWanted: this.attachModulesToEntries(snapshot.mostWanted, modulesById),
      mostSold: this.attachModulesToEntries(snapshot.mostSold, modulesById)
    };
  }

  private attachModulesToEntries(
    entries: ApplicationDiscoveryEntry[],
    modulesById: Map<number, MinimalModule>
  ): ApplicationDiscoveryEntry[] {
    return entries.map(entry => ({
      ...entry,
      module: modulesById.get(entry.id)
    }));
  }
}
