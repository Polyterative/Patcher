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


export class SupabaseRackQueries extends SupabaseQueriesBase {


  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getCurrentUserRacksForAuthor(authorid: string, strictErrors = false): Observable<Rack[]> {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`${ QueryJoins.currentUserRackListColumns }, ${ QueryJoins.author }`)
        .filter('authorid', 'eq', authorid)
        .order('updated', {ascending: false})
    ).pipe(
      remapErrors(),
      throwIfSupabaseErrorWhen<{data: Rack[] | null}>(strictErrors),
      map(x => (x.data as Rack[]) ?? [])
    );
  }



  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getUserRacksPaginated(from = 0, to: number = this.defaultPag) {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase.from(DbPaths.racks)
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
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('racksMinimal') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicUserRacksPaginated(authorId: string, from = 0, to: number = this.defaultPag) {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(PUBLIC_AUTHOR_GATE_ALIAS);

    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(
          `id,name,hp,rows,description,created,updated,authorid,public_id,image,${ QueryJoins.author },${ publicAuthorGateJoin }`,
          {count: 'exact'}
        )
        .filter('authorid', 'eq', authorId)
        .filter('public', 'eq', true)
        .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
        .order('updated', {ascending: false})
        .range(from, to)
    ).pipe(
      remapErrors(),
      map(response => this.stripPublicAuthorGate<Rack>(response))
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicRackWithId(id: number, columns = '*') {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
        .filter('public', 'eq', true)
        .single()
    )
      .pipe(remapErrors());
  }



  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId') || x.includes('racksMinimal') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicRacksByIds(rackIds: number[], strictErrors = false): Observable<Rack[]> {
    const uniqueRackIds = [...new Set(rackIds)].filter(id => Number.isFinite(id));

    if (uniqueRackIds.length === 0) {
      return of([]);
    }

    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(PUBLIC_AUTHOR_GATE_ALIAS);
    const columns = [
      'id',
      'name',
      'hp',
      'rows',
      'description',
      'public',
      'created',
      'updated',
      'authorid',
      'public_id',
      'locked',
      'image',
      QueryJoins.author,
      publicAuthorGateJoin
    ].join(',');

    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(columns)
        .filter('public', 'eq', true)
        .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
        .in('id', uniqueRackIds)
    ).pipe(
      remapErrors(),
      throwIfSupabaseErrorWhen<{data: Rack[] | null}>(strictErrors),
      map(response => this.stripPublicAuthorGate<Rack>(response)),
      map((response: { data: Rack[] | null }) => response.data ?? [])
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getRackWithId(id: number, columns = '*') {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(
        remapErrors()
      );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getRackCommentContext(id: number): Observable<{ data: RackCommentContextRow | null; error: unknown }> {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select('id,name,public_id')
        .filter('id', 'eq', id)
        .single<RackCommentContextRow>()
    ).pipe(
      remapErrors()
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getRackCommentContexts(ids: number[]): Observable<RackCommentContextRow[]> {
    const uniqueIds = Array.from(new Set(ids)).filter(id => Number.isFinite(id));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select('id,name,public_id')
        .in('id', uniqueIds)
    ).pipe(
      remapErrors(),
      throwIfSupabaseError<{data: RackCommentContextRow[] | null}>(),
      map(x => x.data ?? [])
    );
  }



  /**
   * Token-gated rack read. Goes through a SECURITY DEFINER RPC so anonymous
   * link-holders can view even private racks. Only the holder of the full
   * ~71-bit token can hit a row.
   */
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getRackByPublicId(publicId: string) {
    return rxFrom(
      this.supabase.rpc('get_rack_by_public_id', {p_public_id: publicId})
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
   * Resolve a legacy numeric rack id to its public_id — only succeeds for
   * PUBLIC racks (private rows yield null by design, so legacy private share
   * links 404 after the URL migration).
   */
  resolvePublicRackLegacyId(id: number) {
    return rxFrom(
      this.supabase.rpc('resolve_public_rack_legacy_id', {p_id: id})
    )
      .pipe(remapErrors());
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('racksMinimal'))),
    maxCacheCount: 50,
  })
  getRacksMinimal(
    from: number = 0,
    to?: number,
    name?: string,
    orderBy?: string,
    orderDirection?: string,
    includeCount = true,
    cacheKeyVersion = 'stable-rack-pagination-v2'
  ) {
    void cacheKeyVersion;
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(PUBLIC_AUTHOR_GATE_ALIAS);
    const effectiveTo = to ?? this.defaultPag;
    const nameQuery = (name ?? '').trim();

    const columns = [
      "id",
      "name",
      "hp",
      "rows",
      "description",
      "created",
      "updated",
      "authorid",
      "public_id",
      QueryJoins.author,
      publicAuthorGateJoin,
      "image"
    ].join(",");

    const selectColumns = `${ columns }, rack_modules!inner(rackid)`;
    let query = this.supabase.from(DbPaths.racks)
      .select(selectColumns, includeCount ? {count: "exact"} : undefined)
      .filter("public", "eq", true)
      .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
      .order(orderBy ? orderBy : "name", {ascending: orderDirection === "asc"})
      .order('id', {ascending: orderDirection === "asc"});

    if (nameQuery.length === 0) {
      query = query.range(from, effectiveTo);
    }

    return rxFrom(query)
      .pipe(
        remapErrors(),
        map(response => this.stripPublicAuthorGate<Rack>(response)),
        map((response: any) => {
          if (nameQuery.length === 0) {
            return response;
          }

          return applyClientSideSearchFilter(response, from, effectiveTo, (rack: any) =>
            matchesSearchQuery(nameQuery, rack?.name)
          );
        })
      );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    maxCacheCount: 50,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('rackWithId') || x.includes('racksMinimal') || x.includes('racksWithModule')
    )),
  })
  getRacksWithModule(
    moduleid: number,
    from = 0,
    to: number = this.defaultPag,
    orderBy?: string,
    orderDirection?: 'asc' | 'desc'
  ) {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(PUBLIC_AUTHOR_GATE_ALIAS);
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(
          `id,name,hp,rows,description,created,updated,authorid,public_id,image,${ QueryJoins.author },${ publicAuthorGateJoin },rack_modules!inner(rackid,moduleid)`,
          { count: 'exact' }
        )
        .filter('public', 'eq', true)
        .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
        .filter('rack_modules.moduleid', 'eq', moduleid)
        .range(from, to)
        .order(orderBy ?? 'updated', { ascending: orderDirection === 'asc' })
    ).pipe(
      remapErrors(),
      map((response: any) => {
        const stripped = this.stripPublicAuthorGate<{ data: Rack[]; count: number | null }>(response);
        return {
          ...stripped,
          data: (stripped.data ?? []).map((rack: Rack) => ({ rack }))
        };
      })
    );
  }
}
