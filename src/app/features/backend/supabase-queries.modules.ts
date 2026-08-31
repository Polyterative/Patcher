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
  throwIfSupabaseError,
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

const MODULE_IMPORT_SEARCH_TERM_LIMIT = 80;
const MODULE_IMPORT_SEARCH_BATCH_SIZE = 8;
const MODULE_IMPORT_ALIAS_TERM_RESERVE = 24;

function normalizeModuleImportSearchTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ');
}

function isHighSignalModuleImportSearchTerm(term: string): boolean {
  const tokens = term.split(/\s+/).filter(Boolean);

  return tokens.length > 1 || /\d/.test(term);
}

function countModuleImportSearchBatches(termCount: number): number {
  return Math.ceil(termCount / MODULE_IMPORT_SEARCH_BATCH_SIZE);
}

function orderedUniqueModuleImportSearchTerms(searchTerms: string[]): string[] {
  const seenTerms = new Set<string>();
  const highSignalTerms: string[] = [];
  const aliasTerms: string[] = [];

  searchTerms
    .map(term => normalizeModuleImportSearchTerm(term))
    .filter(term => {
      if (!term || seenTerms.has(term)) {
        return false;
      }

      seenTerms.add(term);
      return true;
    })
    .forEach(term => {
      if (isHighSignalModuleImportSearchTerm(term)) {
        highSignalTerms.push(term);
      } else {
        aliasTerms.push(term);
      }
    });

  const maxQueryBatches = countModuleImportSearchBatches(MODULE_IMPORT_SEARCH_TERM_LIMIT);
  const aliasReserveBatches = Math.min(
    countModuleImportSearchBatches(aliasTerms.length),
    countModuleImportSearchBatches(MODULE_IMPORT_ALIAS_TERM_RESERVE)
  );
  const highSignalBatchBudget = aliasTerms.length > 0
    ? maxQueryBatches - aliasReserveBatches
    : maxQueryBatches;
  const selectedHighSignalTerms = highSignalTerms.slice(
    0,
    highSignalBatchBudget * MODULE_IMPORT_SEARCH_BATCH_SIZE
  );
  const remainingTermSlots = MODULE_IMPORT_SEARCH_TERM_LIMIT - selectedHighSignalTerms.length;
  const remainingBatchSlots = maxQueryBatches - countModuleImportSearchBatches(selectedHighSignalTerms.length);
  const selectedAliasTerms = aliasTerms.slice(
    0,
    Math.min(remainingTermSlots, remainingBatchSlots * MODULE_IMPORT_SEARCH_BATCH_SIZE)
  );

  return [...selectedHighSignalTerms, ...selectedAliasTerms];
}

function chunkModuleImportSearchTerms(searchTerms: string[]): string[][] {
  const batches: string[][] = [];
  let activeBatch: string[] = [];
  let activeBatchHighSignal: boolean | null = null;

  searchTerms.forEach(term => {
    const termHighSignal = isHighSignalModuleImportSearchTerm(term);
    const shouldStartBatch = activeBatch.length >= MODULE_IMPORT_SEARCH_BATCH_SIZE
      || (activeBatchHighSignal !== null && activeBatchHighSignal !== termHighSignal);

    if (shouldStartBatch) {
      batches.push(activeBatch);
      activeBatch = [];
      activeBatchHighSignal = null;
    }

    activeBatch.push(term);
    activeBatchHighSignal = termHighSignal;
  });

  if (activeBatch.length > 0) {
    batches.push(activeBatch);
  }

  return batches;
}

function moduleImportNameFilter(searchTerms: string[]): string {
  return searchTerms
    .map(term => `name.ilike.%${ escapeIlikePattern(term) }%`)
    .join(',');
}

function boundedModuleImportCandidateLimit(limit: number): number {
  return Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 0), 300)
    : 300;
}

interface ModuleImportCandidateResponse {
  data: MinimalModule[] | null;
  error: unknown;
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


export class SupabaseModuleQueries extends SupabaseQueriesBase {


  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules'))),
    maxCacheCount: 50,
    // async: true
  })
  getModules(
    from = 0,
    to: number = this.defaultPag,
    name?: string,
    orderBy?: string,
    orderDirection?: string,
    manufacturerId?: number,
    withHP?: number,
    withHpCondition?: "=" | ">" | "<" | ">=" | "<=" | "!=" | undefined,
    standard: number | undefined = undefined,
    description?: string,
    onlyPublic = true,
    tagIds?: number[],
    includeCount = true,
    maxDepth?: number) {
    const nameQuery = (name ?? '').trim();
    const descriptionQuery = (description ?? '').trim();
    const requiresClientTextFiltering = nameQuery.length > 0 || descriptionQuery.length > 0;
    const hasTagFilter = tagIds && tagIds.length > 0;
    const moduleOrderColumn = orderBy || 'name';
    const moduleOrderOptions = {
      ascending: orderDirection === 'asc',
      ...(moduleOrderColumn === 'depth' ? {nullsFirst: false} : {})
    };
    const moduleTagsJoin = hasTagFilter
      ? `tags:${ DbPaths.module_tags }!inner(id,tag:${ DbPaths.tags }(*),voteCount:${ DbPaths.user_module_tags }(moduletagid))`
      : QueryJoins.module_tags;

    const applyBaseFilters = (builtQuery: any, applyTextFilters = false) => {
      let nextQuery = builtQuery;

      if (onlyPublic === true) {
        nextQuery = nextQuery.filter('public', 'eq', true);
      }

      if (withHP) {
        if (withHpCondition === '=' || withHpCondition === undefined) {
          nextQuery = nextQuery.filter('hp', 'eq', withHP);
        } else if (withHpCondition === '>') {
          nextQuery = nextQuery.filter('hp', 'gt', withHP);
        } else if (withHpCondition === '<') {
          nextQuery = nextQuery.filter('hp', 'lt', withHP);
        } else if (withHpCondition === '>=') {
          nextQuery = nextQuery.filter('hp', 'gte', withHP);
        } else if (withHpCondition === '<=') {
          nextQuery = nextQuery.filter('hp', 'lte', withHP);
        } else if (withHpCondition === '!=') {
          nextQuery = nextQuery.filter('hp', 'neq', withHP);
        } else {
          nextQuery = nextQuery.filter('hp', 'eq', withHP);
        }
      }

      if (manufacturerId) {
        nextQuery = nextQuery.filter('manufacturerId', 'eq', manufacturerId);
      }

      if (standard !== undefined) {
        nextQuery = nextQuery.filter('standard', 'eq', standard);
      }

      if (Number.isFinite(maxDepth) && maxDepth >= 0) {
        nextQuery = nextQuery.filter('depth', 'lte', maxDepth);
      }

      if (applyTextFilters) {
        if (nameQuery.length > 0) {
          nextQuery = nextQuery.ilike('name', `%${ escapeIlikePattern(nameQuery) }%`);
        }

        if (descriptionQuery.length > 0) {
          nextQuery = nextQuery.ilike('description', `%${ escapeIlikePattern(descriptionQuery) }%`);
        }
      }

      if (hasTagFilter) {
        nextQuery = (nextQuery as any).filter(`${ DbPaths.module_tags }.tagid`, 'in', `(${ tagIds.join(',') })`);
      }

      return nextQuery;
    };

    const selectDetailedModules = (query: any) => includeCount
      ? query.select(`
                    id,name,hp,depth,description,public,created,updated,
                    ${ QueryJoins.manufacturer },
                    ${ QueryJoins.standard },
                    ${ QueryJoins.module_panels },
                    ${ moduleTagsJoin }
                  `, {count: 'exact'})
      : query.select(`
                    id,name,hp,depth,description,public,created,updated,
                    ${ QueryJoins.manufacturer },
                    ${ QueryJoins.standard },
                    ${ QueryJoins.module_panels },
                    ${ moduleTagsJoin }
                  `);

    const buildDetailedQuery = (query: any) => applyBaseFilters(
      selectDetailedModules(query)
    )
      .order(`color`, {foreignTable: DbPaths.module_panels, ascending: true})
      .limit(1, {foreignTable: DbPaths.module_panels})
      .order(moduleOrderColumn, moduleOrderOptions);

    const buildSearchRowsQuery = (query: any, applyTextFilters = false) => {
      const lightweightSelect = hasTagFilter
        ? `id,name,depth,description,${ DbPaths.module_tags }!inner(id)`
        : 'id,name,depth,description';

      const selectedQuery = includeCount
        ? query.select(lightweightSelect, {count: 'exact'})
        : query.select(lightweightSelect);

      return applyBaseFilters(selectedQuery, applyTextFilters)
        .order(moduleOrderColumn, moduleOrderOptions);
    };

    if (!requiresClientTextFiltering) {
      return rxFrom(buildDetailedQuery(this.supabase.from(DbPaths.modules)).range(from, to))
        .pipe(remapErrors());
    }

    return rxFrom((async () => {
      const filterPredicate = (module: any) =>
        matchesSearchQuery(nameQuery, module?.name)
        && matchesSearchQuery(descriptionQuery, module?.description);

      const narrowedSearchResponse = await this.fetchAllRows<any>(
        DbPaths.modules,
        (query: any) => buildSearchRowsQuery(query, true)
      );
      if (narrowedSearchResponse.error) {
        return narrowedSearchResponse;
      }

      let filteredSearchRows = applyClientSideSearchFilter(
        {
          ...narrowedSearchResponse,
          count: narrowedSearchResponse.data.length
        },
        from,
        to,
        filterPredicate
      );

      if (filteredSearchRows.count === 0) {
        const fallbackSearchResponse = await this.fetchAllRows<any>(
          DbPaths.modules,
          (query: any) => buildSearchRowsQuery(query, false)
        );
        if (fallbackSearchResponse.error) {
          return fallbackSearchResponse;
        }

        filteredSearchRows = applyClientSideSearchFilter(
          {
            ...fallbackSearchResponse,
            count: fallbackSearchResponse.data.length
          },
          from,
          to,
          filterPredicate
        );
      }

      if (filteredSearchRows.count === 0) {
        return filteredSearchRows;
      }

      const pageIds = (filteredSearchRows.data ?? [])
        .map((module: any) => module?.id)
        .filter((id: number | undefined): id is number => Number.isFinite(id));

      if (pageIds.length === 0) {
        return {
          ...filteredSearchRows,
          data: []
        };
      }

      const detailResponse = await buildDetailedQuery(this.supabase.from(DbPaths.modules))
        .filter('id', 'in', `(${ pageIds.join(',') })`)
        .range(0, pageIds.length - 1);
      if (detailResponse.error) {
        return detailResponse;
      }

      const detailRows = Array.isArray(detailResponse.data) ? detailResponse.data : [];
      const detailRowsById = new Map(detailRows.map((row: any) => [row?.id, row]));
      const orderedPageRows = pageIds
        .map((id) => detailRowsById.get(id))
        .filter(Boolean);

      return {
        ...detailResponse,
        data: orderedPageRows,
        count: filteredSearchRows.count
      };
    })()).pipe(remapErrors());
  }



  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules'))),
    maxCacheCount: 50,
  })
  getPublicModulesByIds(moduleIds: number[], strictErrors = false): Observable<MinimalModule[]> {
    const uniqueModuleIds = [...new Set(moduleIds)].filter(id => Number.isFinite(id));

    if (uniqueModuleIds.length === 0) {
      return of([]);
    }

    return rxFrom(
      this.supabase.from(DbPaths.modules)
        .select(`
          id,name,hp,description,public,created,updated,manufacturerId,
          ${ QueryJoins.manufacturer },
          ${ QueryJoins.standard },
          ${ QueryJoins.module_panels },
          ${ QueryJoins.module_tags }
        `)
        .filter('public', 'eq', true)
        .in('id', uniqueModuleIds)
        .order(`color`, {foreignTable: DbPaths.module_panels, ascending: true})
        .limit(1, {foreignTable: DbPaths.module_panels})
    ).pipe(
      remapErrors(),
      throwIfSupabaseErrorWhen<{data: MinimalModule[] | null}>(strictErrors),
      map((response: {data: MinimalModule[] | null}) => response.data ?? [])
    );
  }



  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules'))),
    maxCacheCount: 50,
  })
  getPublicModuleImportCandidates(searchTerms: string[], limit = 300): Observable<MinimalModule[]> {
    const orderedSearchTerms = orderedUniqueModuleImportSearchTerms(searchTerms);
    const candidateLimit = boundedModuleImportCandidateLimit(limit);

    if (orderedSearchTerms.length === 0 || candidateLimit === 0) {
      return of([]);
    }

    return rxFrom((async () => {
      const modulesById = new Map<number, MinimalModule>();

      for (const termBatch of chunkModuleImportSearchTerms(orderedSearchTerms)) {
        const response = await (this.supabase.from(DbPaths.modules)
          .select(`
            id,name,hp,description,public,created,updated,manufacturerId,
            ${ QueryJoins.manufacturer },
            ${ QueryJoins.standard },
            ${ QueryJoins.module_panels },
            ${ QueryJoins.module_tags }
          `)
          .filter('public', 'eq', true)
          .or(moduleImportNameFilter(termBatch))
          .order(`color`, {foreignTable: DbPaths.module_panels, ascending: true})
          .limit(1, {foreignTable: DbPaths.module_panels})
          .order('id', {ascending: true})
          .limit(candidateLimit) as unknown as PromiseLike<ModuleImportCandidateResponse>);

        if (response.error) {
          return response;
        }

        for (const module of response.data ?? []) {
          if (!modulesById.has(module.id)) {
            modulesById.set(module.id, module);
          }

          if (modulesById.size >= candidateLimit) {
            break;
          }
        }

        if (modulesById.size >= candidateLimit) {
          break;
        }
      }

      return {
        data: [...modulesById.values()].slice(0, candidateLimit),
        error: null
      };
    })()).pipe(
      remapErrors(),
      throwIfSupabaseError<ModuleImportCandidateResponse>(),
      map((response: ModuleImportCandidateResponse) => response.data ?? [])
    );
  }



  searchPublicModulesForCollection(query: string, limit = 24): Observable<MinimalModule[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return of([]);
    }

    const escapedQuery = escapeIlikePattern(normalizedQuery);

    return rxFrom(
      this.supabase
        .from(DbPaths.modules)
        .select(`
          id,name,hp,description,public,created,updated,
          ${ QueryJoins.manufacturer },
          ${ QueryJoins.standard }
        `)
        .filter('public', 'eq', true)
        .or(`name.ilike.%${ escapedQuery }%,description.ilike.%${ escapedQuery }%`)
        .order('name', {ascending: true})
        .limit(limit)
    ).pipe(
      remapErrors(),
      map((response: any) => (response.data ?? []) as MinimalModule[])
    );
  }
}
