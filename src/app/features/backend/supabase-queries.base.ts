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


export const PUBLIC_AUTHOR_GATE_ALIAS = 'author_profile_gate';
export const MAX_QUERY_ROWS = 500;

/**
 * Minimal structural view of a Supabase wire response. Concrete query methods
 * refine `data` with their own row types; helpers here only need `unknown`.
 *
 * Declared as a `type` alias (not an `interface`) so object-literal response
 * shapes keep their implicit index signature — several helpers constrain
 * responses with `Record<string, unknown>`, which interfaces never satisfy.
 */
export type SupabaseWireResponse = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

/**
 * Minimal structural view of the pre-select table builder (`supabase.from(t)`).
 * Only `select` is needed here: callers refine the chain from there.
 */
export interface SupabaseTableQuery {
  select(columns?: string, options?: Record<string, unknown>): ChainableSupabaseQuery;
}

/**
 * Minimal chainable subset of the Postgrest filter builder used by the
 * `countRows` / `fetchAllRows` helpers. Structural (not the generated
 * generics) so conditional chaining (`let query = ...; query = query.order(...)`)
 * and cross-table lambdas don't hit excessively-deep type instantiation.
 */
export interface ChainableSupabaseQuery extends PromiseLike<SupabaseWireResponse> {
  select(columns?: string, options?: Record<string, unknown>): ChainableSupabaseQuery;
  filter(column: string, operator: string, value: unknown): ChainableSupabaseQuery;
  order(column: string, options?: Record<string, unknown>): ChainableSupabaseQuery;
  range(from: number, to: number): ChainableSupabaseQuery;
  ilike(column: string, pattern: string): ChainableSupabaseQuery;
  limit(count: number, options?: Record<string, unknown>): ChainableSupabaseQuery;
}

export const EMPTY_CONTRIBUTOR_STATS: CurrentUserContributorStats = {
  modulesSubmitted: 0,
  approvedModules: 0,
  pendingModules: 0,
  commentsPosted: 0,
  moduleFlagsSubmitted: 0
};


export class SupabaseQueriesBase {
  constructor(
    protected readonly supabase: SupabaseClient<Database>,
    protected readonly getUserSession$: () => Observable<SimpleUserModel | null>,
    protected readonly defaultPag: number
  ) {
  }



  protected countRows(
    table:
      | typeof DbPaths.modules
      | typeof DbPaths.comments
      | typeof DbPaths.module_flags
      | typeof DbPaths.manufacturers
      | typeof DbPaths.patch_connections
      | typeof DbPaths.profiles
      | typeof DbPaths.racks
      | typeof DbPaths.patches,
    applyFilters: (query: SupabaseTableQuery) => ChainableSupabaseQuery
  ): Observable<number> {
    return rxFrom(
      applyFilters(this.supabase.from(table))
    ).pipe(
      remapErrors(),
      map((result: SupabaseWireResponse) => result.count ?? 0)
    );
  }



  protected getLastThirtyDaysIso(): string {
    return this.getLastNDaysStartDate(30).toISOString();
  }



  protected getNow(): Date {
    return new Date();
  }



  protected getLastNDaysStartDate(days: number): Date {
    const startDate = this.getNow();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - Math.max(days - 1, 0));
    return startDate;
  }



  protected async fetchAllRows<T>(
    table:
      | typeof DbPaths.modules
      | typeof DbPaths.racks
      | typeof DbPaths.patches
      | typeof DbPaths.manufacturers,
    buildQuery: (query: SupabaseTableQuery) => ChainableSupabaseQuery
  ): Promise<{data: T[]; error: unknown}> {
    const pageSize = MAX_QUERY_ROWS;
    const rows: T[] = [];
    let offset = 0;

    while (true) {
      const response = await buildQuery(this.supabase.from(table))
        .range(offset, offset + pageSize - 1);

      if (response.error) {
        return {data: [], error: response.error};
      }

      const pageRows = (response.data ?? []) as T[];
      rows.push(...pageRows);

      if (pageRows.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    return {data: rows, error: null};
  }




  /**
   * Strip the public-author gate join from list responses. The input is always
   * a list-shaped wire response in practice; the `data` member comes back
   * typed as `T[]` while the runtime value passes through untouched.
   */
  protected stripPublicAuthorGate<T>(response: SupabaseWireResponse): SupabaseWireResponse & {data: T[]} {
    const gateAlias = PUBLIC_AUTHOR_GATE_ALIAS;
    const rows: unknown[] = Array.isArray(response?.data) ? response.data : [];
    const data = (Array.isArray(response?.data)
      ? rows.map((row: unknown) => {
        if (!row || typeof row !== 'object') {
          return row as T;
        }
        const {
          [gateAlias]: _gate,
          ...sanitizedRow
        } = row as Record<string, unknown>;
        return sanitizedRow as T;
      })
      : response?.data as T[]);

    return {
      ...response,
      data
    };
  }
}
