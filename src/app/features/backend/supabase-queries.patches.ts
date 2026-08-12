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
  throwIfSupabaseError,
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


export class SupabasePatchQueries extends SupabaseQueriesBase {


  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getCurrentUserPatchesForAuthor(authorid: string, strictErrors = false): Observable<Patch[]> {
    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`id,name,description,public_id,tags,created,updated, ${ QueryJoins.author }`)
        .filter('authorid', 'eq', authorid)
        .order('updated', {ascending: false})
    ).pipe(
      remapErrors(),
      throwIfSupabaseErrorWhen<{data: Patch[] | null}>(strictErrors),
      map(x => (x.data as Patch[]) ?? [])
    );
  }



  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getUserPatchesPaginated(from = 0, to: number = this.defaultPag) {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase.from(DbPaths.patches)
          .select(`*, ${ QueryJoins.author }`, {count: 'exact'})
          .filter('authorid', 'eq', user.id)
          .order('updated', {ascending: false})
          .range(from, to)
      )),
      remapErrors(),
    );
  }



  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicUserPatchesPaginated(authorId: string, from = 0, to: number = this.defaultPag) {
    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`*, ${ QueryJoins.author }`, {count: 'exact'})
        .filter('authorid', 'eq', authorId)
        .filter('public', 'eq', true)
        .order('updated', {ascending: false})
        .range(from, to)
    ).pipe(
      remapErrors()
    );
  }



  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicPatchesByIds(patchIds: number[], strictErrors = false): Observable<Patch[]> {
    const uniquePatchIds = [...new Set(patchIds)].filter(id => Number.isFinite(id));

    if (uniquePatchIds.length === 0) {
      return of([]);
    }

    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(PUBLIC_AUTHOR_GATE_ALIAS);
    const columns = [
      'id',
      'name',
      'description',
      'image',
      'linked_rack_id',
      'tags',
      'public',
      'created',
      'updated',
      'authorid',
      'public_id',
      QueryJoins.author,
      publicAuthorGateJoin
    ].join(',');

    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(columns)
        .filter('public', 'eq', true)
        .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
        .in('id', uniquePatchIds)
    ).pipe(
      remapErrors(),
      throwIfSupabaseErrorWhen<{data: Patch[] | null}>(strictErrors),
      map(response => this.stripPublicAuthorGate<Patch>(response)),
      map((response: { data: Patch[] | null }) => response.data ?? [])
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicPatchWithId(id: number, columns = '*') {
    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
        .filter('public', 'eq', true)
        .single()
    )
      .pipe(remapErrors());
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getPatchCommentContext(id: number): Observable<{ data: PatchCommentContextRow | null; error: unknown }> {
    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select('id,name,public_id')
        .filter('id', 'eq', id)
        .single<PatchCommentContextRow>()
    ).pipe(
      remapErrors()
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getPatchCommentContexts(ids: number[]): Observable<PatchCommentContextRow[]> {
    const uniqueIds = Array.from(new Set(ids)).filter(id => Number.isFinite(id));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select('id,name,public_id')
        .in('id', uniqueIds)
    ).pipe(
      remapErrors(),
      throwIfSupabaseError<{data: PatchCommentContextRow[] | null}>(),
      map(x => x.data ?? [])
    );
  }



  /**
   * Token-gated patch read. SECURITY DEFINER RPC — see getRackByPublicId.
   */
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPatchByPublicId(publicId: string) {
    return rxFrom(
      this.supabase.rpc('get_patch_by_public_id', {p_public_id: publicId})
    )
      .pipe(
        remapErrors(),
        map((response: any) => {
          const row = Array.isArray(response?.data) ? response.data[0] : response?.data;
          return {data: row ?? null, error: response?.error ?? null};
        })
      );
  }



  /**
   * Resolve a legacy numeric patch id to its public_id — succeeds only for
   * PUBLIC patches.
   */
  resolvePublicPatchLegacyId(id: number) {
    return rxFrom(
      this.supabase.rpc('resolve_public_patch_legacy_id', {p_id: id})
    )
      .pipe(remapErrors());
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
    async: true
  })
  getPatches(
    from = 0,
    to: number = this.defaultPag,
    name?: string,
    orderBy?: string,
    orderDirection?: string,
    columns: string = `id,name,description,${ QueryJoins.author },updated,created`,
    includeCount = true
  ) {
    const connections = `,patch_connections!inner(patchid)`; // Ensures only patches with connections are included
    const nameQuery = (name ?? '').trim();

    let queryBuilder = this.supabase
      .from(DbPaths.patches)
      .select(`${ columns + connections }`, includeCount ? {count: 'exact'} : undefined)
      .filter("public", "eq", true)
      .order(orderBy ?? 'name', {ascending: orderDirection === 'asc'});

    if (nameQuery.length === 0) {
      queryBuilder = queryBuilder.range(from, to);
    }

    return rxFrom(queryBuilder)
      .pipe(
        remapErrors(),
        map((response: any) => {
          if (nameQuery.length === 0) {
            return response;
          }

          return applyClientSideSearchFilter(response, from, to, (patch: any) =>
            matchesSearchQuery(nameQuery, patch?.name)
          );
        })
      );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patchConnections'))),
    maxCacheCount: 50,
    async: true
  })
  getPatchConnections(patchid: number) {
    return rxFrom(
      this.supabase.from(DbPaths.patch_connections)
        .select(`
          notes,
          instance_id_a,
          instance_id_b,
          ${ QueryJoins.patch },
          a(${ QueryJoins.patchConnectionCv },module:modules!moduleOUTs_moduleId_fkey(${ QueryJoins.patchConnectionModule })),
          b(${ QueryJoins.patchConnectionCv },module:modules!moduleINs_moduleId_fkey(${ QueryJoins.patchConnectionModule }))
          `)
        .filter('patchid', 'eq', patchid)
        .order('ordinal')
    )
      .pipe(
        remapErrors(),
        map((x => x.data))
      );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patchModuleInstances'))),
    maxCacheCount: 50,
    async: true
  })
  getPatchModuleInstances(patch_id: number) {
    return rxFrom(
      this.supabase.from(DbPaths.patch_module_instances)
        .select('id,patch_id,module_id,instance_label,module:modules(name,manufacturer:manufacturers(name))')
        .filter('patch_id', 'eq', patch_id)
        .order('id')
    ).pipe(
      remapErrors(),
      map(x => x.data as PatchModuleInstance[])
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    maxCacheCount: 50,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('patches') || x.includes('patchModuleInstances') || x.includes('patchesWithModule')
    )),
  })
  getPatchesWithModule(
    moduleid: number,
    from = 0,
    to: number = this.defaultPag,
    orderBy?: string,
    orderDirection?: 'asc' | 'desc'
  ): Observable<Patch[]> {
    return rxFrom(
      this.supabase.rpc('get_public_patches_for_module', {
        p_module_id: moduleid,
        p_from: from,
        p_to: to,
        p_order_by: orderBy ?? 'updated',
        p_order_direction: orderDirection ?? 'desc'
      })
    ).pipe(
      remapErrors(),
      map((response: any) => (response.data ?? []) as Patch[])
    );
  }
}
