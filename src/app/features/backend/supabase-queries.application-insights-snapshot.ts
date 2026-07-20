import {
  forkJoin,
  from as rxFrom,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  filter,
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import { DbComment } from '../../models/comment';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';
import { PatchModuleInstance } from '../../models/connection';
import {
  DbPaths,
  QueryJoins
} from './DatabaseStrings';
import { Cacheable } from 'ts-cacheable';
import {
  cacheBuster$,
  defaultCacheTime,
  longCacheTime,
  priceHubCacheTime,
  remapErrors,
  smallCacheTime
} from './supabase.cache';
import {
  CurrentUserModulesOrderConfig,
  CurrentUserModulesOrderDirection,
  CurrentUserModulesOrderKey,
  SimpleUserModel
} from './supabase.types';
import {
  matchesSearchQuery
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  CurrentUserContributorStats,
  PublicApplicationActivityPoint,
  PublicApplicationInsightsSnapshot,
  PublicApplicationModuleInsightBucket,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
  ModulePriceHistorySnapshot,
  ModulePriceListing,
  ModulePriceLatestSnapshot,
  ModuleRecentMarketPrice,
  ModuleSparsePriceHistorySummary,
  PublicModuleDiscoveryEntry,
  PublicModuleDiscoverySnapshot,
  PublicUserContributorStats
} from './supabase-queries.models';
import {
  getModuleRecentMarketPrice,
  ModuleRecentMarketPriceListing
} from './module-price-summary.utils';

export type {
  CurrentUserContributorStats,
  PublicApplicationActivityPoint,
  PublicApplicationInsightsSnapshot,
  PublicApplicationModuleInsightBucket,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
  ModulePriceHistorySnapshot,
  ModulePriceListing,
  ModulePriceLatestSnapshot,
  ModuleRecentMarketPrice,
  ModuleSparsePriceHistorySummary,
  PublicModuleDiscoveryEntry,
  PublicModuleDiscoverySnapshot,
  PublicUserContributorStats
} from './supabase-queries.models';

export interface ModuleCommentContextRow {
  id: number;
  name: string;
  manufacturer: {
    name: string;
  };
}

export interface PatchCommentContextRow {
  id: number;
  name: string;
  public_id: string | null;
}

export interface RackCommentContextRow {
  id: number;
  name: string;
  public_id: string | null;
}

import {
  ManufacturerModuleStats,
  ModuleActivityRow,
  ModulePriceHistoryListingRow,
  ModulePriceHistorySnapshotRow,
  ModuleRecentMarketPriceListingRow,
  ModulePriceSnapshotRow,
  ModuleStoreListingRow,
  PublicModuleInsightRow,
  ManufacturerInsightStats
} from './supabase-queries.types';
import {
  ModuleCollectionDetail,
  ModuleCollectionPage,
  ModuleCollectionSummary
} from 'src/app/models/module-collection';
import { MinimalModule } from 'src/app/models/module';
import { UserModuleAcquisition } from 'src/app/models/user-module-acquisition';
import { Tag } from 'src/app/models/tag';
import {
  applyClientSideSearchFilter,
  escapeIlikePattern,
  getHpBandLabel,
  isOneUStandard,
  HP_BAND_ORDER
} from './supabase-queries.helpers';
import {
  rankBuckets,
  rankOrderedBuckets,
  rankNumberBuckets,
  rankManufacturerScores
} from './supabase-queries.insights';
import {
  buildManufacturerActivityRank,
  parseModuleUpdatedTimestampMs,
  buildManufacturerModuleStats,
  withManufacturerModuleStats,
  compareManufacturersByLatestModuleActivity
} from './supabase-queries.manufacturer-stats';
import {
  REACTION_COUNT_COLUMNS,
  REACTION_KIND_COOL,
  REACTION_ROW_COLUMNS,
  type ReactionCountRow,
  type ReactionKind,
  type ReactionRow
} from './supabase-reactions';
import {
  EMPTY_CONTRIBUTOR_STATS,
  MAX_QUERY_ROWS,
  PUBLIC_AUTHOR_GATE_ALIAS,
  SupabaseQueriesBase
} from './supabase-queries.base';


export class SupabaseApplicationInsightsSnapshotQueries extends SupabaseQueriesBase {


  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules')
      || x.includes('patches')
      || x.includes('profiles')
      || x.includes('rackWithId')
      || x.includes('racksMinimal')
    )),
    maxCacheCount: 20,
  })
  getApplicationInsightsSnapshot(days = 30): Observable<PublicApplicationInsightsSnapshot> {
    return rxFrom(
      this.supabase.rpc('get_application_insights_snapshot', {
        p_days: days
      })
    ).pipe(
      remapErrors(),
      map((response: any) => {
        const snapshot = response?.data?.[0] ?? {};

        return {
          statistics: (snapshot.statistics ?? {
            publicModules: 0,
            publicManufacturers: 0,
            publicProfiles: 0,
            publicModulesUpdatedLast30Days: 0,
            publicRacks: 0,
            publicRackAuthors: 0,
            publicRacksUpdatedLast30Days: 0,
            publicPatches: 0,
            publicPatchConnections: 0,
            publicPatchAuthors: 0,
            publicPatchesUpdatedLast30Days: 0
          }) as PublicApplicationStatistics,
          activitySeries: (snapshot.activity_series ?? []) as PublicApplicationActivityPoint[],
          moduleInsights: (snapshot.module_insights ?? {
            topManufacturers: [],
            activeManufacturers: [],
            widestManufacturers: [],
            oneUManufacturers: [],
            standardMix: [],
            standardActivity: [],
            standardWidthAverages: [],
            standardManufacturerCounts: [],
            hpBands: [],
            hpBandActivity: [],
            hpExact: [],
            freshnessWindows: [],
            createdWindows: [],
            topFiveManufacturerShare: 0,
            soloManufacturerCount: 0,
            medianModulesPerManufacturer: 0,
            medianCatalogueAgeYears: 0,
            staleModules: 0,
            averageHp: 0,
            medianHp: 0
          }) as PublicApplicationModuleInsights
        };
      })
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules') || x.includes('currentUserModules'))),
    maxCacheCount: 20,
  })
  getApplicationModuleDiscovery(limit = 5, minCount = 3): Observable<PublicModuleDiscoverySnapshot> {
    return rxFrom(
      (this.supabase as any).rpc('get_module_discovery_snapshot', {
        p_limit: limit,
        p_min_count: minCount
      })
    ).pipe(
      remapErrors(),
      map((response: any) => {
        const snapshot = response?.data?.[0] ?? {};
        return {
          mostOwned: (snapshot.most_owned ?? snapshot.mostOwned ?? []) as PublicModuleDiscoveryEntry[],
          mostWanted: (snapshot.most_wanted ?? snapshot.mostWanted ?? []) as PublicModuleDiscoveryEntry[],
          mostSold: (snapshot.most_sold ?? snapshot.mostSold ?? []) as PublicModuleDiscoveryEntry[]
        };
      })
    );
  }
}
