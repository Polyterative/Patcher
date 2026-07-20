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

interface CurrentUserModulePossessionRow {
  module: MinimalModule;
  collectionUpdated: unknown;
  kind: unknown;
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


export class SupabasePossessionQueries extends SupabaseQueriesBase {



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('currentUserModules'))),
    maxCacheCount: 50
  })
  getCurrentUserModules(
    includeInsOuts = true,
    includeManuals = false,
    orderConfig?: Partial<CurrentUserModulesOrderConfig>,
    strictErrors = false,
  ): Observable<any> {
    const prefix = `module`;
    const panelsTable: string = `${ prefix }.${ DbPaths.module_panels }`;


    const moduleColumns = `id,name,hp,description,public,created,updated,manufacturerId,standard,isApproved`;

     const columns = [
       moduleColumns,
       QueryJoins.manufacturer,
       QueryJoins.module_tags,
       QueryJoins.module_panels,
     ];
    // can be optimized to avoid calling it all the time but for now it is ok
    if (includeInsOuts) {
      columns.push(QueryJoins.insOuts);
    }

    if (includeManuals) {
      columns.push('manualURL');
    }

    const safeOrderConfig = this.getSafeCurrentUserModulesOrderConfig(orderConfig);

    return this.getUserSession$().pipe(
      switchMap(user => {
        let queryBuilder = this.supabase.from(DbPaths.user_modules)
          .select(
            `kind,collectionUpdated:updated,
              ${ prefix }:modules!user_modules_moduleid_fkey(
                ${ columns.join(',') })`
          )
          .order(`color`, {
            foreignTable: panelsTable,
            ascending: true
          })
          .limit(1, {foreignTable: panelsTable})
          .filter('profileid', 'eq', user.id);

        if (safeOrderConfig.key === 'moduleName') {
          queryBuilder = queryBuilder
            .order('name', {
              foreignTable: prefix,
              ascending: safeOrderConfig.direction === 'asc'
            })
            .order('id', {
              foreignTable: prefix,
              ascending: true
            });
        } else {
          queryBuilder = queryBuilder
            .order('updated', {ascending: safeOrderConfig.direction === 'asc'})
            .order('name', {
              foreignTable: prefix,
              ascending: true
            })
            .order('id', {
              foreignTable: prefix,
              ascending: true
            });
        }

        return rxFrom(queryBuilder).pipe(
          remapErrors(),
          throwIfSupabaseErrorWhen<{data: CurrentUserModulePossessionRow[] | null}>(strictErrors),
          map((x: any) => (x.data ?? []).map((y: any) => ({
            ...y.module,
            collectionUpdated: y.collectionUpdated,
            possessionKind: y.kind
          })))
        );
      }),
    );
  }



  private getSafeCurrentUserModulesOrderConfig(
    orderConfig?: Partial<CurrentUserModulesOrderConfig>
  ): CurrentUserModulesOrderConfig {
    const key: CurrentUserModulesOrderKey = orderConfig?.key === 'moduleName'
      ? 'moduleName'
      : 'collectionUpdated';

    const direction: CurrentUserModulesOrderDirection = orderConfig?.direction === 'asc'
      ? 'asc'
      : orderConfig?.direction === 'desc'
        ? 'desc'
        : key === 'moduleName'
          ? 'asc'
          : 'desc';

    return {key, direction};
  }



  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('userModuleTags'))),
  })
  getMyVotes(): Observable<number[]> {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase
          .from(DbPaths.user_module_tags)
          .select('moduletagid')
          .filter('authorid', 'eq', user.id)
      )),
      remapErrors(),
      map(x => ((x.data as any) ?? []).map((row: any) => row.moduletagid as number))
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    maxCacheCount: 100,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modulePossessionCounts') || x.includes('currentUserModules'))),
  })
  getModulePossessionCounts(moduleId: number): Observable<{ hasCount: number; wantsCount: number; sellsCount: number }> {
    return rxFrom(
      this.supabase.from(DbPaths.user_modules)
        .select('kind')
        .eq('moduleid', moduleId)
    ).pipe(
      map((x: any) => {
        const rows: { kind: string }[] = x.data ?? [];
        const counts = { hasCount: 0, wantsCount: 0, sellsCount: 0 };
        for (const row of rows) {
          if (row.kind === 'HAS') counts.hasCount++;
          else if (row.kind === 'WANTS') counts.wantsCount++;
          else if (row.kind === 'SELLS') counts.sellsCount++;
        }
        return counts;
      })
    );
  }



  getUserModuleAcquisitionsForModule(moduleId: number): Observable<UserModuleAcquisition[]> {
    return this.getUserSession$().pipe(
      switchMap(user => {
        if (!user) return of([]);
        return rxFrom(
          this.supabase
            .from(DbPaths.user_module_acquisitions)
            .select('id,profileid,moduleid,acquired_at,price_amount_minor,currency,source,note,created_at,updated_at')
            .eq('profileid', user.id)
            .eq('moduleid', moduleId)
            .order('acquired_at', {ascending: false})
            .order('id', {ascending: false})
        );
      }),
      remapErrors(),
      map(response => (response.data ?? []) as UserModuleAcquisition[])
    );
  }
}
