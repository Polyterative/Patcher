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
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
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


export class SupabaseApplicationStatisticsQueries extends SupabaseQueriesBase {


  private async fetchAllUpdatedRows(
    table:
      | typeof DbPaths.modules
      | typeof DbPaths.racks
      | typeof DbPaths.patches,
    // Select strings mix raw joins across three differently-shaped tables, so the
    // Postgrest query builder generics can't be narrowed here without hitting
    // excessively-deep type instantiation; the concrete row shape is asserted below.
    buildQuery: (query: any) => any
  ): Promise<{data: {updated: string}[]; error: PostgrestError | null}> {
    const pageSize = MAX_QUERY_ROWS;
    const rows: {updated: string}[] = [];
    let offset = 0;

    while (true) {
      const response = await buildQuery(this.supabase.from(table))
        .order('updated', {ascending: true})
        .order('id', {ascending: true})
        .range(offset, offset + pageSize - 1) as {
          data: {updated: string}[] | null;
          error: PostgrestError | null;
        };

      if (response.error) {
        return {data: [], error: response.error};
      }

      const pageRows = (response.data ?? [])
        .map((row: {updated: string}) => ({updated: row.updated}))
        .filter((row: {updated: string}) => !!row.updated);

      rows.push(...pageRows);

      if (pageRows.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    return {data: rows, error: null};
  }



  private buildPublicActivitySeries(
    days: number,
    startDate: Date,
    modules: {updated: string}[],
    racks: {updated: string}[],
    patches: {updated: string}[]
  ): PublicApplicationActivityPoint[] {
    const points = Array.from({length: days}, (_, index) => {
      const pointDate = new Date(startDate);
      pointDate.setUTCDate(startDate.getUTCDate() + index);
      return {
        date: pointDate.toISOString().slice(0, 10),
        modules: 0,
        racks: 0,
        patches: 0
      };
    });

    const pointsByDate = new Map(points.map((point) => [point.date, point]));
    const increment = (rows: {updated: string}[], key: 'modules' | 'racks' | 'patches') => {
      rows.forEach((row) => {
        const dateKey = row.updated.slice(0, 10);
        const point = pointsByDate.get(dateKey);
        if (point) {
          point[key] += 1;
        }
      });
    };

    increment(modules, 'modules');
    increment(racks, 'racks');
    increment(patches, 'patches');

    return points;
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('modules')
      || x.includes('manufacturers')
      || x.includes('patches')
      || x.includes('profiles')
      || x.includes('rackWithId')
      || x.includes('racksMinimal')
    )),
    maxCacheCount: 20,
  })
  getApplicationStatistics(): Observable<PublicApplicationStatistics> {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(PUBLIC_AUTHOR_GATE_ALIAS);
    const connectedPatchJoin = 'patch_connections!inner(patchid)';
    const publicPatchJoin = 'patch:patches!patch_connections_patchid_fkey!inner(id)';
    const lastThirtyDaysIso = this.getLastThirtyDaysIso();

    return forkJoin({
      publicModules: this.countRows(
        DbPaths.modules,
        query => query
          .select('id', {count: 'exact', head: true})
          .filter('public', 'eq', true)
      ),
      publicModulesUpdatedLast30Days: this.countRows(
        DbPaths.modules,
        query => query
          .select('id', {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter('updated', 'gte', lastThirtyDaysIso)
      ),
      publicManufacturers: this.countRows(
        DbPaths.manufacturers,
        query => query
          .select('id, public_modules:modules!inner(id)', {count: 'exact', head: true})
          .filter('public_modules.public', 'eq', true)
      ),
      publicProfiles: this.countRows(
        DbPaths.profiles,
        query => query
          .select('id', {count: 'exact', head: true})
          .filter('public', 'eq', true)
      ),
      publicRacks: this.countRows(
        DbPaths.racks,
        query => query
          .select(`id, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
      ),
      publicRacksUpdatedLast30Days: this.countRows(
        DbPaths.racks,
        query => query
          .select(`id, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
          .filter('updated', 'gte', lastThirtyDaysIso)
      ),
      publicRackAuthors: this.countRows(
        DbPaths.profiles,
        query => query
          .select('id, public_racks:racks!inner(id)', {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter('public_racks.public', 'eq', true)
      ),
      publicPatches: this.countRows(
        DbPaths.patches,
        query => query
          .select(`id, ${ connectedPatchJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
      ),
      publicPatchesUpdatedLast30Days: this.countRows(
        DbPaths.patches,
        query => query
          .select(`id, ${ connectedPatchJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter('updated', 'gte', lastThirtyDaysIso)
      ),
      publicPatchConnections: this.countRows(
        DbPaths.patch_connections,
        query => query
          .select(`patchid, ${ publicPatchJoin }`, {count: 'exact', head: true})
          .filter('patch.public', 'eq', true)
      ),
      publicPatchAuthors: this.countRows(
        DbPaths.profiles,
        query => query
          .select('id, public_patches:patches!inner(id, patch_connections!inner(patchid))', {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter('public_patches.public', 'eq', true)
      )
    });
  }



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
  getApplicationActivitySeries(days = 30): Observable<PublicApplicationActivityPoint[]> {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(PUBLIC_AUTHOR_GATE_ALIAS);
    const connectedPatchJoin = 'patch_connections!inner(patchid)';
    const startDate = this.getLastNDaysStartDate(days);
    const startIso = startDate.toISOString();

    return rxFrom((async () => {
      const [modulesResponse, racksResponse, patchesResponse] = await Promise.all([
        this.fetchAllUpdatedRows(
          DbPaths.modules,
          query => query
            .select('id,updated')
            .filter('public', 'eq', true)
            .filter('updated', 'gte', startIso)
        ),
        this.fetchAllUpdatedRows(
          DbPaths.racks,
          query => query
            .select(`id,updated,${ publicAuthorGateJoin }`)
            .filter('public', 'eq', true)
            .filter(`${ PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
            .filter('updated', 'gte', startIso)
        ),
        this.fetchAllUpdatedRows(
          DbPaths.patches,
          query => query
            .select(`id,updated,${ connectedPatchJoin }`)
            .filter('public', 'eq', true)
            .filter('updated', 'gte', startIso)
        )
      ]);

      if (modulesResponse.error) { throw modulesResponse.error; }
      if (racksResponse.error) { throw racksResponse.error; }
      if (patchesResponse.error) { throw patchesResponse.error; }

      return this.buildPublicActivitySeries(
        days,
        startDate,
        modulesResponse.data,
        racksResponse.data,
        patchesResponse.data
      );
    })());
  }
}
