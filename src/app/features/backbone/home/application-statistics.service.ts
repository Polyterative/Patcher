import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  of
} from 'rxjs';
import {
  map,
  skip,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { SupabaseService } from '../../backend/supabase.service';
import { AnalyticsService } from '../analytics-integration/analytics.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ApplicationStatisticsMappers } from './application-statistics.mappers';
import {
  ApplicationDiscoveryBucket,
  ApplicationDiscoveryEntry,
  ApplicationDiscoverySnapshot
} from './application-statistics.models';
import { MinimalModule } from 'src/app/models/module';

const HOME_DISCOVERY_LIMIT = 6;
const HOME_DISCOVERY_MIN_COUNT = 1;

export type {
  ApplicationDiscoveryBucket,
  ApplicationDiscoveryEntry,
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
  ApplicationPrivateFootprint,
  ApplicationPrivateFootprintSlice,
  MetricTone,
} from './application-statistics.models';

@Injectable()
export class ApplicationStatisticsService extends SubManager {
  private readonly refreshRequest$ = new ReplaySubject<void>(1);
  private readonly heroBucketRequest$ = new BehaviorSubject<ApplicationDiscoveryBucket>('mostOwned');
  private readonly heroModuleClickedRequest$ = new Subject<{
    bucket: ApplicationDiscoveryBucket;
    module_id: number;
    rank: number;
    count: number;
  }>();
  private readonly supportLinkClickedRequest$ = new Subject<{target: string}>();
  private readonly discoveryRailClickedRequest$ = new Subject<{target: string}>();
  private readonly mappers = new ApplicationStatisticsMappers();

  readonly heroBucket$ = this.heroBucketRequest$.asObservable();

  readonly teaser$ = this.refreshRequest$.pipe(
    switchMap(() => this.backend.GET.applicationStatistics()),
    map((statistics) => this.mappers.mapTeaser(statistics))
  );
  readonly page$ = this.refreshRequest$.pipe(
    switchMap(() => this.backend.GET.applicationInsightsSnapshot(30)),
    tap(() => this.analytics.capture('insights.page_viewed', {})),
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
    private readonly backend: SupabaseService,
    private readonly analytics: AnalyticsService
  ) {
    super();
    this.heroBucketRequest$.pipe(
      skip(1),
      tap((bucket) => this.analytics.capture('insights.hero_bucket_viewed', {bucket})),
      takeUntil(this.destroy$)
    ).subscribe();
    this.heroModuleClickedRequest$.pipe(
      tap((props) => this.analytics.capture('insights.hero_module_clicked', {...props})),
      takeUntil(this.destroy$)
    ).subscribe();
    this.supportLinkClickedRequest$.pipe(
      tap(({target}) => this.analytics.capture('insights.support_link_clicked', {target})),
      takeUntil(this.destroy$)
    ).subscribe();
    this.discoveryRailClickedRequest$.pipe(
      tap(({target}) => this.analytics.capture('insights.discovery_rail_clicked', {target})),
      takeUntil(this.destroy$)
    ).subscribe();
    this.refreshRequest$.next();
  }

  refresh() {
    this.refreshRequest$.next();
  }

  selectHeroBucket(bucket: ApplicationDiscoveryBucket | null | undefined) {
    if (!bucket || bucket === this.heroBucketRequest$.value) {
      return;
    }

    this.heroBucketRequest$.next(bucket);
  }

  trackHeroModuleClicked(bucket: ApplicationDiscoveryBucket, entry: Pick<ApplicationDiscoveryEntry, 'id' | 'count'>, rank: number) {
    this.heroModuleClickedRequest$.next({
      bucket,
      module_id: entry.id,
      rank,
      count: entry.count
    });
  }

  trackSupportLinkClicked(target: string) {
    this.supportLinkClickedRequest$.next({target});
  }

  trackDiscoveryRailClicked(target: string) {
    this.discoveryRailClickedRequest$.next({target});
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
