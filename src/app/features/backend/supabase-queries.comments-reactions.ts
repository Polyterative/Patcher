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
  smallCacheTime,
  throwIfSupabaseErrorWhen
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


export class SupabaseCommentReactionQueries extends SupabaseQueriesBase {


  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('currentUserComments'))),
    maxCacheCount: 50,
  })
  getCurrentUserComments(
    from = 0,
    to: number = this.defaultPag
  ) {
    return this.getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          this.supabase.from(DbPaths.comments)
            .select(`*,profile:profiles(id,username)`, {count: 'exact'})
            .filter('authorId', 'eq', user.id)
            .order('created', {ascending: false})
            .range(from, to)
        )),
        remapErrors(),
      );
  }



  getCurrentUserReactions(
    entityType?: number,
    kind: ReactionKind = REACTION_KIND_COOL,
    strictErrors = false
  ): Observable<ReactionRow[]> {
    return this.getUserSession$().pipe(
      switchMap(user => {
        if (!user?.id) return of([]);

        let query = this.supabase
          .from(DbPaths.reactions)
          .select(REACTION_ROW_COLUMNS)
          .filter('user_id', 'eq', user.id)
          .filter('kind', 'eq', kind)
          .order('created_at', {ascending: false});

        if (entityType !== undefined) {
          query = query.filter('entity_type', 'eq', entityType);
        }

        return rxFrom(query).pipe(
          remapErrors(),
          throwIfSupabaseErrorWhen<{data: ReactionRow[] | null}>(strictErrors),
          map(result => (result.data ?? []) as ReactionRow[])
        );
      })
    );
  }



  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('reactionCounts'))),
    maxCacheCount: 200
  })
  getReactionCount(
    entityType: number,
    entityId: number,
    kind: ReactionKind = REACTION_KIND_COOL
  ): Observable<number> {
    return rxFrom(
      this.supabase
        .from(DbPaths.reaction_counts)
        .select(REACTION_COUNT_COLUMNS)
        .filter('entity_type', 'eq', entityType)
        .filter('entity_id', 'eq', entityId)
        .filter('kind', 'eq', kind)
        .maybeSingle()
    ).pipe(
      remapErrors(),
      map(result => ((result.data as ReactionCountRow | null)?.total ?? 0))
    );
  }



  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('reactionCounts'))),
    maxCacheCount: 100
  })
  getReactionCountsForEntities(
    entityType: number,
    entityIds: number[],
    kind: ReactionKind = REACTION_KIND_COOL
  ): Observable<ReactionCountRow[]> {
    const uniqueEntityIds = Array.from(new Set(entityIds));
    if (!uniqueEntityIds.length) return of([]);

    return rxFrom(
      this.supabase
        .from(DbPaths.reaction_counts)
        .select(REACTION_COUNT_COLUMNS)
        .filter('entity_type', 'eq', entityType)
        .filter('kind', 'eq', kind)
        .in('entity_id', uniqueEntityIds)
    ).pipe(
      remapErrors(),
      map(result => (result.data ?? []) as ReactionCountRow[])
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('comments'))),
    maxCacheCount: 100,
    async: true
  })
  getComments(
    entityId: number,
    entityType: number,
    from = 0,
    to = 24
  ): Observable<{ data: DbComment[] | null; count: number | null }> {
    return rxFrom(
      this.supabase.from(DbPaths.comments)
        .select(`*,profile:profiles(id,username)`, { count: 'exact' })
        .filter('entityId', 'eq', entityId)
        .filter('entityType', 'eq', entityType)
        .order('created', { ascending: false })
        .range(from, to)
    )
      .pipe(
        remapErrors(),
        map(x => ({ data: x.data, count: x.count }))
      );
  }
}
