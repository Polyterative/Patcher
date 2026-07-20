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
    applyFilters: (query: any) => any
  ): Observable<number> {
    return rxFrom(
      applyFilters(this.supabase.from(table))
    ).pipe(
      remapErrors(),
      map((result: any) => result.count ?? 0)
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
    buildQuery: (query: any) => any
  ): Promise<{data: T[]; error: any}> {
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




  protected stripPublicAuthorGate<T>(response: any) {
    const gateAlias = PUBLIC_AUTHOR_GATE_ALIAS;
    const data = Array.isArray(response?.data)
      ? response.data.map((row: any) => {
        if (!row || typeof row !== 'object') {
          return row;
        }
        const {
          [gateAlias]: _gate,
          ...sanitizedRow
        } = row;
        return sanitizedRow as T;
      })
      : response?.data;

    return {
      ...response,
      data
    };
  }
}
