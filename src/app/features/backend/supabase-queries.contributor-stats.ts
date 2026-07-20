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


export class SupabaseContributorStatsQueries extends SupabaseQueriesBase {


  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('modules')
      || x.includes('comments')
      || x.includes('module_flags')
    )),
    maxCacheCount: 50,
  })
  getCurrentUserContributorStats(): Observable<CurrentUserContributorStats> {
    return this.getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user?.id) {
            return of(EMPTY_CONTRIBUTOR_STATS);
          }

          return forkJoin({
            modulesSubmitted: this.countRows(
              DbPaths.modules,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('submitter', 'eq', user.id)
            ),
            approvedModules: this.countRows(
              DbPaths.modules,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('submitter', 'eq', user.id)
                .filter('isApproved', 'eq', true)
            ),
            commentsPosted: this.countRows(
              DbPaths.comments,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('authorId', 'eq', user.id)
            ),
            moduleFlagsSubmitted: this.countRows(
              DbPaths.module_flags,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('user_id', 'eq', user.id)
            ),
          }).pipe(
            map((stats) => ({
              ...stats,
              pendingModules: Math.max(stats.modulesSubmitted - stats.approvedModules, 0)
            }))
          );
        })
      );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicUserContributorStats(authorId: string): Observable<PublicUserContributorStats> {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(PUBLIC_AUTHOR_GATE_ALIAS);

    return this.countRows(
      DbPaths.modules,
      query => query
        .select(`id, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
        .filter('submitter', 'eq', authorId)
        .filter('public', 'eq', true)
        .filter('isApproved', 'eq', true)
        .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
    ).pipe(
      map((approvedPublicModules) => ({approvedPublicModules}))
    );
  }
}
