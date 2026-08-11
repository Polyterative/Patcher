import { Observable } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import { SimpleUserModel } from './supabase.types';
import { SupabaseQueriesBase } from './supabase-queries.base';
import { SupabaseApplicationInsightsQueries } from './supabase-queries.application-insights-data';
import { SupabaseApplicationInsightsSnapshotQueries } from './supabase-queries.application-insights-snapshot';
import { SupabaseApplicationStatisticsQueries } from './supabase-queries.application-statistics';
import { SupabaseContributorStatsQueries } from './supabase-queries.contributor-stats';
import { SupabaseCommentReactionQueries } from './supabase-queries.comments-reactions';
import { SupabaseManufacturerQueries } from './supabase-queries.manufacturers';
import { SupabaseModuleQueries } from './supabase-queries.modules';
import { SupabaseModuleDetailQueries } from './supabase-queries.module-details';
import { SupabaseModulePriceQueries } from './supabase-queries.price-data';
import { SupabaseCollectionQueries } from './supabase-queries.collections';
import { SupabasePatchQueries } from './supabase-queries.patches';
import { SupabasePossessionQueries } from './supabase-queries.possessions';
import { SupabaseRackQueries } from './supabase-queries.racks';
import { SupabaseShippingAddressQueries } from './supabase-queries.shipping-addresses';
import { SupabaseMarketplaceListingQueries } from './supabase-queries.marketplace-listings';

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

type ConstructorPrototype = { prototype: object };

function applyMixins(
  derivedConstructor: ConstructorPrototype,
  baseConstructors: ConstructorPrototype[]
): void {
  for (const baseConstructor of baseConstructors) {
    for (const name of Object.getOwnPropertyNames(baseConstructor.prototype)) {
      if (name === 'constructor') {
        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(baseConstructor.prototype, name);
      if (descriptor) {
        Object.defineProperty(derivedConstructor.prototype, name, descriptor);
      }
    }
  }
}


export class SupabaseQueriesService extends SupabaseQueriesBase {
  constructor(
    supabase: SupabaseClient<Database>,
    getUserSession$: () => Observable<SimpleUserModel | null>,
    defaultPag: number
  ) {
    super(supabase, getUserSession$, defaultPag);
  }
}

export interface SupabaseQueriesService
  extends Pick<
    SupabaseModuleQueries,
    'getModules'
      | 'getPublicModulesByIds'
      | 'getPublicModuleImportCandidates'
      | 'searchPublicModulesForCollection'
  >,
  Pick<
    SupabaseModuleDetailQueries,
    'getModuleWithId'
      | 'getModuleCommentContext'
      | 'getTags'
      | 'getModulesBySameManufacturer'
      | 'getAllTagsCached'
  >,
  Pick<
    SupabaseRackQueries,
    'getCurrentUserRacksForAuthor'
      | 'getUserRacksPaginated'
      | 'getPublicUserRacksPaginated'
      | 'getPublicRackWithId'
      | 'getPublicRacksByIds'
      | 'getRackWithId'
      | 'getRackCommentContext'
      | 'getRackByPublicId'
      | 'resolvePublicRackLegacyId'
      | 'getRacksMinimal'
      | 'getRacksWithModule'
  >,
  Pick<
    SupabasePatchQueries,
    'getCurrentUserPatchesForAuthor'
      | 'getUserPatchesPaginated'
      | 'getPublicUserPatchesPaginated'
      | 'getPublicPatchesByIds'
      | 'getPublicPatchWithId'
      | 'getPatchCommentContext'
      | 'getPatchByPublicId'
      | 'resolvePublicPatchLegacyId'
      | 'getPatches'
      | 'getPatchConnections'
      | 'getPatchModuleInstances'
      | 'getPatchesWithModule'
  >,
  Pick<
    SupabaseContributorStatsQueries,
    'getCurrentUserContributorStats'
      | 'getPublicUserContributorStats'
  >,
  Pick<
    SupabaseApplicationStatisticsQueries,
    'getApplicationStatistics'
      | 'getApplicationActivitySeries'
  >,
  Pick<
    SupabaseApplicationInsightsQueries,
    'getApplicationModuleInsights'
  >,
  Pick<
    SupabaseApplicationInsightsSnapshotQueries,
    'getApplicationInsightsSnapshot'
      | 'getApplicationModuleDiscovery'
  >,
  Pick<
    SupabaseCommentReactionQueries,
    'getCurrentUserComments'
      | 'getCurrentUserReactions'
      | 'getReactionCount'
      | 'getReactionCountsForEntities'
      | 'getComments'
  >,
  Pick<
    SupabaseManufacturerQueries,
    'getManufacturers'
      | 'getManufacturersPaginated'
      | 'getStandards'
  >,
  Pick<
    SupabaseModulePriceQueries,
    'getModulePriceListings'
      | 'getModulePriceHistorySnapshots'
      | 'getRecentModuleMarketPrices'
  >,
  Pick<
    SupabasePossessionQueries,
    'getCurrentUserModules'
      | 'getMyVotes'
      | 'getModulePossessionCounts'
      | 'getUserModuleAcquisitionsForModule'
  >,
  Pick<
    SupabaseShippingAddressQueries,
    'getCurrentUserShippingAddresses'
  >,
  Pick<
    SupabaseMarketplaceListingQueries,
    'getActiveMarketplaceListings'
      | 'getActiveMarketplaceListingsBySellerProfileId'
      | 'getMarketplaceListingByPublicId'
      | 'getCurrentUserMarketplaceListings'
  >,
  Pick<
    SupabaseCollectionQueries,
    'getPublicModuleCollections'
      | 'getPublicModuleCollectionsPage'
      | 'getCurrentUserModuleCollections'
      | 'getPublicModuleCollectionByPublicId'
      | 'getCurrentUserModuleCollectionById'
      | 'getModuleCollectionsForModule'
  > {
}

applyMixins(SupabaseQueriesService, [
  SupabaseModuleQueries,
  SupabaseModuleDetailQueries,
  SupabaseRackQueries,
  SupabasePatchQueries,
  SupabaseContributorStatsQueries,
  SupabaseApplicationStatisticsQueries,
  SupabaseApplicationInsightsQueries,
  SupabaseApplicationInsightsSnapshotQueries,
  SupabaseCommentReactionQueries,
  SupabaseManufacturerQueries,
  SupabaseModulePriceQueries,
  SupabasePossessionQueries,
  SupabaseShippingAddressQueries,
  SupabaseMarketplaceListingQueries,
  SupabaseCollectionQueries
]);
