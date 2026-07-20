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


export class SupabaseManufacturerQueries extends SupabaseQueriesBase {


  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('manufacturers'))),
  })
  getManufacturers(from = 0, to = this.defaultPag, columns = '*', orderBy?: string) {
    return rxFrom(
      this.fetchManufacturersRange(
        this.normalizePaginationBound(from),
        this.normalizePaginationBound(to, this.defaultPag),
        columns,
        orderBy ? orderBy : 'name'
      )
    )
      .pipe(
        remapErrors()
      );
  }



  private async fetchManufacturersRange(
    from: number,
    to: number,
    columns: string,
    orderBy: string
  ): Promise<{ data: any[]; error: null; count: number | null } | { data: any[] | null; error: any; count: number | null }> {
    const safeTo = Math.max(from, to);
    const data: any[] = [];
    let count: number | null = null;

    for (let chunkFrom = from; chunkFrom <= safeTo; chunkFrom += MAX_QUERY_ROWS) {
      const chunkTo = Math.min(chunkFrom + MAX_QUERY_ROWS - 1, safeTo);
      const response = await this.supabase.from(DbPaths.manufacturers)
        .select(columns, {count: 'exact'})
        .range(chunkFrom, chunkTo)
        .order(orderBy);

      if (response.error) {
        return {
          data: response.data,
          error: response.error,
          count: response.count ?? count
        };
      }

      if (count === null) {
        count = response.count ?? null;
      }

      const chunkData = Array.isArray(response.data) ? response.data : [];
      data.push(...chunkData);

      if (chunkData.length < (chunkTo - chunkFrom + 1)) {
        break;
      }
    }

    return {
      data,
      error: null,
      count
    };
  }



  private normalizePaginationBound(value: number | undefined, fallback: number = 0): number {
    const normalized = Number.isFinite(value) ? Math.trunc(value as number) : fallback;
    return Math.max(0, normalized);
  }



  getManufacturersPaginated(
    from: number = 0,
    to?: number,
    name?: string,
    orderBy: string = 'name',
    orderDirection: string = 'asc'
  ) {
    const effectiveTo = to ?? this.defaultPag;
    const nameQuery = (name ?? '').trim();

    if (orderBy === 'module_updated') {
      return this.getManufacturersPaginatedByModuleActivity(
        from,
        effectiveTo,
        nameQuery,
        orderDirection
      );
    }

    let query = this.supabase.from(DbPaths.manufacturers)
      .select('id,name,logo,websiteURL,adminUser', {count: 'exact'})
      .order(orderBy, {ascending: orderDirection === 'asc'});

    if (nameQuery.length === 0) {
      query = query.range(from, effectiveTo);
    }

    return rxFrom(query).pipe(
      remapErrors(),
      switchMap((response: any) => {
        const filteredResponse = nameQuery.length > 0
          ? applyClientSideSearchFilter(response, from, effectiveTo, (manufacturer: any) =>
            matchesSearchQuery(nameQuery, manufacturer?.name)
          )
          : response;
        const manufacturers = Array.isArray(filteredResponse?.data) ? filteredResponse.data : [];
        if (manufacturers.length === 0) {
          return rxFrom(Promise.resolve(filteredResponse));
        }

        const manufacturerIds = manufacturers
          .map((x: any) => x.id)
          .filter((id: unknown): id is number => typeof id === 'number');
        if (manufacturerIds.length === 0) {
          return rxFrom(Promise.resolve(filteredResponse));
        }

        return rxFrom((async () => {
          const modulesActivityResponse = await this.fetchAllModuleActivityRowsForManufacturers(manufacturerIds);
          if (modulesActivityResponse.error) {
            return {
              ...filteredResponse,
              error: modulesActivityResponse.error
            };
          }
          const statsByManufacturerId = buildManufacturerModuleStats(modulesActivityResponse.data);
          return {
            ...filteredResponse,
            data: manufacturers.map((manufacturer: any) =>
              withManufacturerModuleStats(
                manufacturer,
                statsByManufacturerId.get(manufacturer.id)
              )
            )
          };
        })());
      })
    );
  }



  private getManufacturersPaginatedByModuleActivity(
    from: number,
    to: number,
    nameQuery: string,
    orderDirection: string
  ) {
    return rxFrom((async () => {
      const manufacturersQuery = this.supabase.from(DbPaths.manufacturers)
        .select('id,name,logo,websiteURL,adminUser', {count: 'exact'})
        .order('name', {ascending: true});

      const manufacturersResponse = await manufacturersQuery;
      if (manufacturersResponse.error) {
        return manufacturersResponse;
      }

      const manufacturers = (manufacturersResponse.data ?? []).filter((manufacturer: any) =>
        matchesSearchQuery(nameQuery, manufacturer?.name)
      );
      if (manufacturers.length === 0) {
        return {
          ...manufacturersResponse,
          count: 0,
          data: []
        };
      }

      const manufacturerIds = manufacturers
        .map(x => x.id)
        .filter((id): id is number => typeof id === 'number');

      if (manufacturerIds.length === 0) {
        return {
          ...manufacturersResponse,
          count: manufacturersResponse.count ?? 0,
          data: []
        };
      }

      const effectiveOrderDirection: 'asc' | 'desc' = orderDirection === 'asc' ? 'asc' : 'desc';
      const modulesActivityResponse = await this.fetchAllModuleActivityRowsGlobally(
        effectiveOrderDirection
      );
      if (modulesActivityResponse.error) {
        return {
          ...manufacturersResponse,
          error: modulesActivityResponse.error
        };
      }

      const allowedManufacturerIds = new Set<number>(manufacturerIds);
      const filteredActivityRows = modulesActivityResponse.data
        .filter((row) => allowedManufacturerIds.has(row.manufacturerId));

      const statsByManufacturerId = buildManufacturerModuleStats(filteredActivityRows);
      const activityRankByManufacturerId = buildManufacturerActivityRank(filteredActivityRows);
      const sortedManufacturers = [...manufacturers].sort((a, b) =>
        compareManufacturersByLatestModuleActivity(
          a,
          b,
          activityRankByManufacturerId
        )
      );
      const pagedManufacturers = sortedManufacturers
        .slice(from, to + 1)
        .map((manufacturer: any) =>
          withManufacturerModuleStats(
            manufacturer,
            statsByManufacturerId.get(manufacturer.id)
          )
        );

      return {
        ...manufacturersResponse,
        count: manufacturers.length,
        data: pagedManufacturers
      };
    })());
  }



  private async fetchAllModuleActivityRows(
    orderDirection: 'asc' | 'desc' = 'desc',
    manufacturerIds?: number[]
  ): Promise<{
    data: {
      manufacturerId: number;
      updated: string
    }[];
    error: any
  }> {
    const pageSize = MAX_QUERY_ROWS;
    const rows: {
      manufacturerId: number;
      updated: string
    }[] = [];
    const chunkSize = 200;

    const idChunks: (number[] | null)[] = manufacturerIds
      ? Array.from({length: Math.ceil(manufacturerIds.length / chunkSize)}, (_, i) =>
        manufacturerIds.slice(i * chunkSize, (i + 1) * chunkSize))
      : [null]; // null means "no IN filter" (global fetch)

    for (const chunk of idChunks) {
      let offset = 0;
      while (true) {
        let q = this.supabase.from(DbPaths.modules)
          .select('id,manufacturerId,updated')
          .filter('public', 'eq', true)
          .order('updated', {ascending: orderDirection === 'asc'})
          .order('id', {ascending: orderDirection === 'asc'})
          .range(offset, offset + pageSize - 1);

        if (chunk) { q = q.in('manufacturerId', chunk); }

        const response = await q;
        if (response.error) { return {data: [], error: response.error}; }

        const pageRows = (response.data ?? []).map((x: any) => ({
          manufacturerId: x.manufacturerId,
          updated: x.updated
        }));
        rows.push(...pageRows);

        if (pageRows.length < pageSize) { break; }
        offset += pageSize;
      }
    }
    return {data: rows, error: null};
  }



  private async fetchAllModuleActivityRowsForManufacturers(
    manufacturerIds: number[],
    orderDirection: 'asc' | 'desc' = 'desc'
  ) {
    return this.fetchAllModuleActivityRows(orderDirection, manufacturerIds);
  }



  private async fetchAllModuleActivityRowsGlobally(orderDirection: 'asc' | 'desc' = 'desc') {
    return this.fetchAllModuleActivityRows(orderDirection);
  }
}
