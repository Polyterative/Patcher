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


export class SupabaseCollectionQueries extends SupabaseQueriesBase {


  private moduleCollectionSummarySelect(): string {
    return [
      'id',
      'authorid',
      'name',
      'description',
      'image',
      'public',
      'public_id',
      'created',
      'updated',
      QueryJoins.collectionAuthor,
      `entries:${ DbPaths.module_collection_entries }(id)`
    ].join(',');
  }



  private moduleCollectionDetailSelect(): string {
    return [
      'id',
      'authorid',
      'name',
      'description',
      'image',
      'public',
      'public_id',
      'created',
      'updated',
      QueryJoins.collectionAuthor,
      `entries:${ DbPaths.module_collection_entries }!module_collection_entries_collection_id_fkey(id,ordinal,note,${ QueryJoins.collectionEntryModule })`
    ].join(',');
  }



  private mapModuleCollectionSummary(row: any): ModuleCollectionSummary {
    return {
      id: row.id,
      authorid: row.authorid,
      author: row.author,
      name: row.name,
      description: row.description,
      image: row.image,
      public: row.public,
      public_id: row.public_id,
      created: row.created,
      updated: row.updated,
      module_count: row.module_count ?? row.entries?.length ?? 0
    };
  }



  private mapModuleCollectionDetail(row: any): ModuleCollectionDetail | undefined {
    if (!row) {
      return undefined;
    }

    const entries = ((row.entries ?? []) as any[])
      .filter(entry => !!entry.module)
      .sort((a, b) => a.ordinal - b.ordinal);

    return {
      ...this.mapModuleCollectionSummary(row),
      entries,
      module_count: entries.length
    };
  }



  private buildPublicModuleCollectionsQuery(
    from = 0,
    to = 24,
    search = '',
    order: 'updated_desc' | 'created_desc' | 'name_asc' = 'updated_desc',
    includeCount = false
  ) {
    let query = this.supabase
      .from(DbPaths.module_collections)
      .select(this.moduleCollectionSummarySelect(), includeCount ? {count: 'exact'} : undefined)
      .filter('public', 'eq', true);

    const searchQuery = search.trim();
    if (searchQuery) {
      query = (query as any).ilike('name', `%${searchQuery}%`);
    }

    if (order === 'name_asc') {
      query = (query as any).order('name', { ascending: true });
    } else if (order === 'created_desc') {
      query = (query as any).order('created', { ascending: false });
    } else {
      query = (query as any).order('updated', { ascending: false });
    }

    return (query as any).order('id', { ascending: false }).range(from, to);
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    maxCacheCount: 40,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('moduleCollections') || x.includes('moduleCollectionWithId')
    )),
  })
  getPublicModuleCollections(from = 0, to = 24, search = '', order: 'updated_desc' | 'created_desc' | 'name_asc' = 'updated_desc'): Observable<ModuleCollectionSummary[]> {
    return rxFrom(this.buildPublicModuleCollectionsQuery(from, to, search, order)).pipe(
      remapErrors(),
      map((response: any) => ((response.data ?? []) as any[])
        .map(row => this.mapModuleCollectionSummary(row))
      )
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    maxCacheCount: 40,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('moduleCollections') || x.includes('moduleCollectionWithId')
    )),
  })
  getPublicModuleCollectionsPage(
    from = 0,
    to = 24,
    search = '',
    order: 'updated_desc' | 'created_desc' | 'name_asc' = 'updated_desc'
  ): Observable<ModuleCollectionPage> {
    return rxFrom(this.buildPublicModuleCollectionsQuery(from, to, search, order, true)).pipe(
      remapErrors(),
      map((response: any) => {
        const items = ((response.data ?? []) as any[])
          .map(row => this.mapModuleCollectionSummary(row));
        const total = response.count ?? items.length;
        return {
          items,
          total,
          remaining: Math.max(total - (to + 1), 0)
        };
      })
    );
  }



  getCurrentUserModuleCollections(from = 0, to = 24): Observable<ModuleCollectionSummary[]> {
    return this.getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          this.supabase
            .from(DbPaths.module_collections)
            .select(this.moduleCollectionSummarySelect())
            .filter('authorid', 'eq', user.id)
            .order('updated', {ascending: false})
            .order('id', {ascending: false})
            .range(from, to)
        );
      }),
      remapErrors(),
      map((response: any) => ((response.data ?? []) as any[])
        .map(row => this.mapModuleCollectionSummary(row))
      )
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    maxCacheCount: 50,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('moduleCollectionWithId') || x.includes('moduleCollections')
    )),
  })
  getPublicModuleCollectionByPublicId(publicId: string): Observable<ModuleCollectionDetail | undefined> {
    return rxFrom(
      this.supabase
        .from(DbPaths.module_collections)
        .select(this.moduleCollectionDetailSelect())
        .filter('public_id', 'eq', publicId)
        .filter('public', 'eq', true)
        .maybeSingle()
    ).pipe(
      remapErrors(),
      map((response: any) => this.mapModuleCollectionDetail(response.data))
    );
  }



  getCurrentUserModuleCollectionById(collectionId: number): Observable<ModuleCollectionDetail | undefined> {
    return this.getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          this.supabase
            .from(DbPaths.module_collections)
            .select(this.moduleCollectionDetailSelect())
            .filter('id', 'eq', collectionId)
            .filter('authorid', 'eq', user.id)
            .maybeSingle()
        );
      }),
      remapErrors(),
      map((response: any) => this.mapModuleCollectionDetail(response.data))
    );
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    maxCacheCount: 50,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('moduleCollectionsByModule') || x.includes('moduleCollections')
    )),
  })
  getModuleCollectionsForModule(moduleId: number): Observable<ModuleCollectionSummary[]> {
    return rxFrom(
      this.supabase
        .from(DbPaths.module_collection_entries)
        .select(`collection:${ DbPaths.module_collections }!inner(${ this.moduleCollectionSummarySelect() })`)
        .filter('module_id', 'eq', moduleId)
        .filter('collection.public', 'eq', true)
    ).pipe(
      remapErrors(),
      map((response: any) => ((response.data ?? []) as any[])
        .map(row => row.collection)
        .filter(Boolean)
        .map(row => this.mapModuleCollectionSummary(row))
      )
    );
  }
}
