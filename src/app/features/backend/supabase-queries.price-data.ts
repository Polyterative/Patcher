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


export class SupabaseModulePriceQueries extends SupabaseQueriesBase {


  @Cacheable({
    maxAge: priceHubCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('priceHub'))),
    cacheKey: 'priceHubModulePriceListings',
    maxCacheCount: 100
  })
  getModulePriceListings(moduleId: number): Observable<ModulePriceListing[]> {
    if (!Number.isFinite(moduleId) || moduleId <= 0) {
      return of([]);
    }

    return rxFrom(
      this.supabase
        .from(DbPaths.module_store_listings)
        .select(`
          id,
          module_id,
          store_id,
          product_url,
          verification_status,
          last_checked_at,
          store:${ DbPaths.stores }!module_store_listings_store_id_fkey(
            id,
            slug,
            name,
            country_code,
            currency_hint
          ),
          latestSnapshot:${ DbPaths.module_price_snapshots }!module_price_snapshots_listing_id_fkey(
            id,
            listing_id,
            observed_at,
            price_amount_minor,
            currency,
            availability,
            source
          )
        `)
        .filter('module_id', 'eq', moduleId)
        .filter('active', 'eq', true)
        .order('store_id', {ascending: true})
        .order('observed_at', {referencedTable: DbPaths.module_price_snapshots, ascending: false})
        .order('id', {referencedTable: DbPaths.module_price_snapshots, ascending: false})
        .limit(1, {referencedTable: DbPaths.module_price_snapshots})
    ).pipe(
      remapErrors(),
      map((listingResponse: {data: ModuleStoreListingRow[] | null}) =>
        this.mapModulePriceListings(listingResponse.data ?? [])
      )
    );
  }



  @Cacheable({
    maxAge: priceHubCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('priceHub'))),
    cacheKey: 'priceHubModulePriceHistorySnapshots',
    maxCacheCount: 100
  })
  getModulePriceHistorySnapshots(moduleId: number, snapshotLimit = 240): Observable<ModulePriceHistorySnapshot[]> {
    if (!Number.isFinite(moduleId) || moduleId <= 0) {
      return of([]);
    }

    const boundedSnapshotLimit = Math.min(Math.max(Math.trunc(snapshotLimit), 1), 500);
    const observedSince = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    return rxFrom(
      this.supabase
        .from(DbPaths.module_store_listings)
        .select(`
          id,
          module_id,
          store_id
        `)
        .filter('module_id', 'eq', moduleId)
        .filter('active', 'eq', true)
        .order('store_id', {ascending: true})
    ).pipe(
      remapErrors(),
      switchMap((listingResponse: {data: ModulePriceHistoryListingRow[] | null}) => {
        const listings = listingResponse.data ?? [];
        const listingIds = listings.map(listing => listing.id);
        if (listingIds.length === 0) {
          return of([]);
        }

        const storeIdByListingId = new Map(
          listings.map(listing => [listing.id, listing.store_id])
        );

        return rxFrom(
          this.supabase
            .from(DbPaths.module_price_snapshots)
            .select(`
              id,
              listing_id,
              observed_at,
              price_amount_minor,
              currency,
              availability,
              source
            `)
            .in('listing_id', listingIds)
            .gte('observed_at', observedSince)
            .order('observed_at', {ascending: false})
            .order('id', {ascending: false})
            .limit(boundedSnapshotLimit + 1)
        ).pipe(
          remapErrors(),
          map((snapshotResponse: {data: ModulePriceHistorySnapshotRow[] | null}) => {
            const snapshots = snapshotResponse.data ?? [];
            if (snapshots.length > boundedSnapshotLimit) {
              return [];
            }

            return this.mapModulePriceHistorySnapshots(
              snapshots,
              storeIdByListingId
            );
          })
        );
      })
    );
  }



  @Cacheable({
    maxAge: priceHubCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('priceHub'))),
    cacheKey: 'priceHubRecentModuleMarketPrices',
    cacheHasher: ([moduleIds]) => [SupabaseModulePriceQueries.normalizeModulePriceIds(moduleIds)],
    maxCacheCount: 100
  })
  getRecentModuleMarketPrices(moduleIds: number[]): Observable<ModuleRecentMarketPrice[]> {
    const ids = SupabaseModulePriceQueries.normalizeModulePriceIds(moduleIds);

    if (ids.length === 0) {
      return of([]);
    }

    return rxFrom(
      this.supabase
        .from(DbPaths.module_store_listings)
        .select(`
          module_id,
          store_id,
          latestSnapshot:${ DbPaths.module_price_snapshots }!module_price_snapshots_listing_id_fkey(
            observed_at,
            price_amount_minor,
            currency,
            availability
          )
        `)
        .in('module_id', ids)
        .filter('active', 'eq', true)
        .order('module_id', {ascending: true})
        .order('store_id', {ascending: true})
        .order('observed_at', {referencedTable: DbPaths.module_price_snapshots, ascending: false})
        .order('id', {referencedTable: DbPaths.module_price_snapshots, ascending: false})
        .limit(1, {referencedTable: DbPaths.module_price_snapshots})
    ).pipe(
      remapErrors(),
      map((listingResponse: {data: ModuleRecentMarketPriceListingRow[] | null}) => {
        const listingsByModuleId = new Map<number, ModuleRecentMarketPriceListing[]>();

        for (const listing of this.mapRecentModuleMarketPriceListings(listingResponse.data ?? [])) {
          const listings = listingsByModuleId.get(listing.moduleId) ?? [];
          listings.push(listing);
          listingsByModuleId.set(listing.moduleId, listings);
        }

        return ids
          .map(moduleId => getModuleRecentMarketPrice(
            moduleId,
            listingsByModuleId.get(moduleId) ?? []
          ))
          .filter((summary): summary is ModuleRecentMarketPrice => summary !== null);
      })
    );
  }



  private mapModulePriceListings(
    listings: readonly ModuleStoreListingRow[]
  ): ModulePriceListing[] {
    return listings
      .filter((listing): listing is ModuleStoreListingRow & {store: NonNullable<ModuleStoreListingRow['store']>} => !!listing.store)
      .map((listing) => ({
        listingId: listing.id,
        moduleId: listing.module_id,
        storeId: listing.store_id,
        storeSlug: listing.store.slug,
        storeName: listing.store.name,
        countryCode: listing.store.country_code,
        currencyHint: listing.store.currency_hint,
        productUrl: listing.product_url,
        verificationStatus: listing.verification_status,
        lastCheckedAt: listing.last_checked_at,
        latestSnapshot: this.mapLatestModulePriceSnapshot(listing.latestSnapshot?.[0] ?? null)
      }));
  }



  private static normalizeModulePriceIds(moduleIds: unknown): number[] {
    return [...new Set(
      (Array.isArray(moduleIds) ? moduleIds : [])
        .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0)
        .map(id => Math.trunc(id))
    )].sort((first, second) => first - second);
  }



  private mapRecentModuleMarketPriceListings(
    listings: readonly ModuleRecentMarketPriceListingRow[]
  ): ModuleRecentMarketPriceListing[] {
    return listings.map((listing) => ({
      moduleId: listing.module_id,
      storeId: listing.store_id,
      latestSnapshot: this.mapLatestRecentModulePriceSnapshot(listing.latestSnapshot?.[0] ?? null)
    }));
  }



  private mapLatestRecentModulePriceSnapshot(
    snapshot: NonNullable<ModuleRecentMarketPriceListingRow['latestSnapshot']>[number] | null
  ): ModuleRecentMarketPriceListing['latestSnapshot'] {
    if (!snapshot) {
      return null;
    }

    return {
      observedAt: snapshot.observed_at,
      priceAmountMinor: snapshot.price_amount_minor,
      currency: snapshot.currency,
      availability: snapshot.availability
    };
  }



  private mapModulePriceHistorySnapshots(
    snapshots: readonly ModulePriceHistorySnapshotRow[],
    storeIdByListingId: ReadonlyMap<number, number>
  ): ModulePriceHistorySnapshot[] {
    return snapshots
      .filter(snapshot => storeIdByListingId.has(snapshot.listing_id))
      .map(snapshot => ({
        id: snapshot.id,
        listingId: snapshot.listing_id,
        storeId: storeIdByListingId.get(snapshot.listing_id)!,
        observedAt: snapshot.observed_at,
        priceAmountMinor: snapshot.price_amount_minor,
        currency: snapshot.currency,
        availability: snapshot.availability,
        source: snapshot.source
      }));
  }



  private mapLatestModulePriceSnapshot(snapshot: ModulePriceSnapshotRow | null): ModulePriceLatestSnapshot | null {
    if (!snapshot) {
      return null;
    }

    return {
      id: snapshot.id,
      observedAt: snapshot.observed_at,
      priceAmountMinor: snapshot.price_amount_minor,
      currency: snapshot.currency,
      availability: snapshot.availability,
      source: snapshot.source
    };
  }
}
