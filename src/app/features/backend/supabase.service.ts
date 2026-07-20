import {
  EventEmitter,
  Inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import {
  createClient,
  LockFunc,
  navigatorLock,
  Session,
  SupabaseClient
} from '@supabase/supabase-js';
import { of, ReplaySubject } from 'rxjs';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { Database } from 'src/backend/database.types';
import { environment } from 'src/environments/environment';
import { cacheBuster$ } from './supabase.cache';
import {
  CurrentUserModulesOrderConfig,
  CurrentUserModulesOrderDirection,
  CurrentUserModulesOrderKey,
  OAuthProvider,
  RichUserModel,
  SimpleUserModel,
  SupabaseLoginResponse,
  SupabaseSignupResponse,
  SupabaseStorageFile
} from './supabase.types';
import { createAddNamespace } from './supabase-add';
import { createDeleteNamespace } from './supabase-delete';
import { createUpdateNamespace } from './supabase-update';
import { createStorageNamespace } from './supabase-storage';
import { SupabaseQueriesService } from './supabase-queries';
import { createGetNamespace } from './supabase-get';
import { createAuthNamespace } from './supabase-auth';
import { createMergeNamespace } from './supabase-merge';


export type {
  CurrentUserModulesOrderConfig,
  CurrentUserModulesOrderDirection,
  CurrentUserModulesOrderKey,
  OAuthProvider,
  RichUserModel,
  SimpleUserModel,
  SupabaseLoginResponse,
  SupabaseSignupResponse,
  SupabaseStorageFile
};

@Injectable({ providedIn: 'root' })
export class SupabaseService extends SubManager {
  private readonly authStateSubscription: {
    unsubscribe: () => void
  } | null = null;
  private readonly authSession$ = new ReplaySubject<Session | null>(1);

  constructor(
    public activated: ActivatedRoute,
    public snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super();
    const isBrowser = isPlatformBrowser(platformId);
    this.supabase = createClient<Database>(
      environment.supabase.url || 'https://placeholder.supabase.co',
      environment.supabase.key || 'placeholder-anon-key-for-tests',
      {
        auth: {
          lock: isBrowser
            ? this.customLock
            : <R>(_name: string, _t: number, fn: () => Promise<R>) => fn(),
          storage: isBrowser ? undefined : {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          },
          persistSession: isBrowser,
        }
      }
    );

    const {data: authListener} = this.supabase.auth.onAuthStateChange((event, session) => {
      this.authSession$.next(session ?? null);
      if (event === 'SIGNED_OUT') {
        this.user.logout$.emit();
      } else if (event === 'SIGNED_IN' && session) {
        this.user.login$.emit();
      }
    });

    if (authListener?.subscription) {
      this.authStateSubscription = authListener.subscription;
    }
    
    this.auth = createAuthNamespace(this.supabase, this.activated, this.snackBar, this.authSession$.asObservable());

    this.add = createAddNamespace(
      this.supabase,
      this.snackBar,
      () => this.auth.getUserSession$()
    );

    this.storage = createStorageNamespace(
      this.supabase,
      this.snackBar,
      () => this.auth.getUserSession$()
    );

    this.delete = createDeleteNamespace(
      this.supabase,
      this.snackBar,
      () => this.auth.getUserSession$(),
      (filename: string) => this.storage.deletePanelFile(filename),
      this.defaultPag,
      // In dev, always privileged. In prod, requires admin JWT claim.
      () => !environment.production ? of(true) : this.auth.hasAdminRole$(),
      (storagePath: string) => this.storage.deleteMarketplaceListingImage(storagePath)
    );

    this.update = createUpdateNamespace(
      this.supabase,
      this.snackBar,
      () => this.auth.getUserSession$(),
      (id: number) => this.delete.patchConnectionsForPatch(id),
      () => !environment.production ? of(true) : this.auth.hasAdminRole$()
    );

    this.merge = createMergeNamespace(
      this.supabase,
      () => this.auth.getUserSession$(),
      (id: number) => this.delete.module(id)
    );

    this.queries = new SupabaseQueriesService(
      this.supabase,
      () => this.auth.getUserSession$(),
      this.defaultPag
    );

    this.GET = {
      currentUserModules: this.queries.getCurrentUserModules.bind(this.queries),
      modules: this.queries.getModules.bind(this.queries),
      publicModulesByIds: this.queries.getPublicModulesByIds.bind(this.queries),
      publicModuleImportCandidates: this.queries.getPublicModuleImportCandidates.bind(this.queries),
      searchPublicModulesForCollection: this.queries.searchPublicModulesForCollection.bind(this.queries),
      manufacturers: this.queries.getManufacturers.bind(this.queries),
      manufacturersPaginated: this.queries.getManufacturersPaginated.bind(this.queries),
      comments: this.queries.getComments.bind(this.queries),
      tags: this.queries.getTags.bind(this.queries),
      moduleWithId: this.queries.getModuleWithId.bind(this.queries),
      moduleCommentContext: this.queries.getModuleCommentContext.bind(this.queries),
      modulePriceListings: this.queries.getModulePriceListings.bind(this.queries),
      modulePriceHistorySnapshots: this.queries.getModulePriceHistorySnapshots.bind(this.queries),
      recentModuleMarketPrices: this.queries.getRecentModuleMarketPrices.bind(this.queries),
      patchConnections: this.queries.getPatchConnections.bind(this.queries),
      patchModuleInstances: this.queries.getPatchModuleInstances.bind(this.queries),
      currentUserComments: this.queries.getCurrentUserComments.bind(this.queries),
      currentUserContributorStats: this.queries.getCurrentUserContributorStats.bind(this.queries),
      applicationStatistics: this.queries.getApplicationStatistics.bind(this.queries),
      applicationInsightsSnapshot: this.queries.getApplicationInsightsSnapshot.bind(this.queries),
      applicationModuleDiscovery: this.queries.getApplicationModuleDiscovery.bind(this.queries),
      applicationActivitySeries: this.queries.getApplicationActivitySeries.bind(this.queries),
      applicationModuleInsights: this.queries.getApplicationModuleInsights.bind(this.queries),
      publicModuleCollections: this.queries.getPublicModuleCollections.bind(this.queries),
      publicModuleCollectionsPage: this.queries.getPublicModuleCollectionsPage.bind(this.queries),
      currentUserModuleCollections: this.queries.getCurrentUserModuleCollections.bind(this.queries),
      publicModuleCollectionByPublicId: this.queries.getPublicModuleCollectionByPublicId.bind(this.queries),
      currentUserModuleCollectionById: this.queries.getCurrentUserModuleCollectionById.bind(this.queries),
      moduleCollectionsForModule: this.queries.getModuleCollectionsForModule.bind(this.queries),
      patches: this.queries.getPatches.bind(this.queries),
      publicPatchesByIds: this.queries.getPublicPatchesByIds.bind(this.queries),
      publicPatchWithId: this.queries.getPublicPatchWithId.bind(this.queries),
      patchCommentContext: this.queries.getPatchCommentContext.bind(this.queries),
      publicUserContributorStats: this.queries.getPublicUserContributorStats.bind(this.queries),
      rackWithId: this.queries.getRackWithId.bind(this.queries),
      rackCommentContext: this.queries.getRackCommentContext.bind(this.queries),
      publicRackWithId: this.queries.getPublicRackWithId.bind(this.queries),
      rackByPublicId: this.queries.getRackByPublicId.bind(this.queries),
      resolvePublicRackLegacyId: this.queries.resolvePublicRackLegacyId.bind(this.queries),
      patchByPublicId: this.queries.getPatchByPublicId.bind(this.queries),
      resolvePublicPatchLegacyId: this.queries.resolvePublicPatchLegacyId.bind(this.queries),
      racksMinimal: this.queries.getRacksMinimal.bind(this.queries),
      userPatchesPaginated: this.queries.getUserPatchesPaginated.bind(this.queries),
      userRacksPaginated: this.queries.getUserRacksPaginated.bind(this.queries),
      publicUserPatchesPaginated: this.queries.getPublicUserPatchesPaginated.bind(this.queries),
      publicUserRacksPaginated: this.queries.getPublicUserRacksPaginated.bind(this.queries),
      activeMarketplaceListings: this.queries.getActiveMarketplaceListings.bind(this.queries),
      activeMarketplaceListingsBySellerProfileId: this.queries.getActiveMarketplaceListingsBySellerProfileId.bind(this.queries),
      marketplaceListingByPublicId: this.queries.getMarketplaceListingByPublicId.bind(this.queries),
    };
    
    this.get = createGetNamespace(
      this.supabase,
      this.queries,
      this.defaultPag,
      () => this.auth.getUserSession$()
    );
  }
  
  override ngOnDestroy(): void {
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
    }
    super.ngOnDestroy();
  }
  
  user = {
    user$: new ReplaySubject<void>(),
    login$: new EventEmitter<void>(),
    logout$: new EventEmitter<void>()
  };
  
  private defaultPag = 20;
  
  readonly auth!: ReturnType<typeof createAuthNamespace>;

  readonly GET!: {
    currentUserModules: typeof SupabaseQueriesService.prototype.getCurrentUserModules;
    modules: typeof SupabaseQueriesService.prototype.getModules;
    publicModulesByIds: typeof SupabaseQueriesService.prototype.getPublicModulesByIds;
    publicModuleImportCandidates: typeof SupabaseQueriesService.prototype.getPublicModuleImportCandidates;
    searchPublicModulesForCollection: typeof SupabaseQueriesService.prototype.searchPublicModulesForCollection;
    manufacturers: typeof SupabaseQueriesService.prototype.getManufacturers;
    manufacturersPaginated: typeof SupabaseQueriesService.prototype.getManufacturersPaginated;
    comments: typeof SupabaseQueriesService.prototype.getComments;
    tags: typeof SupabaseQueriesService.prototype.getTags;
    moduleWithId: typeof SupabaseQueriesService.prototype.getModuleWithId;
    moduleCommentContext: typeof SupabaseQueriesService.prototype.getModuleCommentContext;
    modulePriceListings: typeof SupabaseQueriesService.prototype.getModulePriceListings;
    modulePriceHistorySnapshots: typeof SupabaseQueriesService.prototype.getModulePriceHistorySnapshots;
    recentModuleMarketPrices: typeof SupabaseQueriesService.prototype.getRecentModuleMarketPrices;
    patchConnections: typeof SupabaseQueriesService.prototype.getPatchConnections;
    patchModuleInstances: typeof SupabaseQueriesService.prototype.getPatchModuleInstances;
    currentUserComments: typeof SupabaseQueriesService.prototype.getCurrentUserComments;
    currentUserContributorStats: typeof SupabaseQueriesService.prototype.getCurrentUserContributorStats;
    applicationStatistics: typeof SupabaseQueriesService.prototype.getApplicationStatistics;
    applicationInsightsSnapshot: typeof SupabaseQueriesService.prototype.getApplicationInsightsSnapshot;
    applicationModuleDiscovery: typeof SupabaseQueriesService.prototype.getApplicationModuleDiscovery;
    applicationActivitySeries: typeof SupabaseQueriesService.prototype.getApplicationActivitySeries;
    applicationModuleInsights: typeof SupabaseQueriesService.prototype.getApplicationModuleInsights;
    publicModuleCollections: typeof SupabaseQueriesService.prototype.getPublicModuleCollections;
    publicModuleCollectionsPage: typeof SupabaseQueriesService.prototype.getPublicModuleCollectionsPage;
    currentUserModuleCollections: typeof SupabaseQueriesService.prototype.getCurrentUserModuleCollections;
    publicModuleCollectionByPublicId: typeof SupabaseQueriesService.prototype.getPublicModuleCollectionByPublicId;
    currentUserModuleCollectionById: typeof SupabaseQueriesService.prototype.getCurrentUserModuleCollectionById;
    moduleCollectionsForModule: typeof SupabaseQueriesService.prototype.getModuleCollectionsForModule;
    patches: typeof SupabaseQueriesService.prototype.getPatches;
    publicPatchesByIds: typeof SupabaseQueriesService.prototype.getPublicPatchesByIds;
    publicPatchWithId: typeof SupabaseQueriesService.prototype.getPublicPatchWithId;
    patchCommentContext: typeof SupabaseQueriesService.prototype.getPatchCommentContext;
    publicUserContributorStats: typeof SupabaseQueriesService.prototype.getPublicUserContributorStats;
    rackWithId: typeof SupabaseQueriesService.prototype.getRackWithId;
    rackCommentContext: typeof SupabaseQueriesService.prototype.getRackCommentContext;
    publicRackWithId: typeof SupabaseQueriesService.prototype.getPublicRackWithId;
    rackByPublicId: typeof SupabaseQueriesService.prototype.getRackByPublicId;
    resolvePublicRackLegacyId: typeof SupabaseQueriesService.prototype.resolvePublicRackLegacyId;
    patchByPublicId: typeof SupabaseQueriesService.prototype.getPatchByPublicId;
    resolvePublicPatchLegacyId: typeof SupabaseQueriesService.prototype.resolvePublicPatchLegacyId;
    racksMinimal: typeof SupabaseQueriesService.prototype.getRacksMinimal;
    userPatchesPaginated: typeof SupabaseQueriesService.prototype.getUserPatchesPaginated;
    userRacksPaginated: typeof SupabaseQueriesService.prototype.getUserRacksPaginated;
    publicUserPatchesPaginated: typeof SupabaseQueriesService.prototype.getPublicUserPatchesPaginated;
    publicUserRacksPaginated: typeof SupabaseQueriesService.prototype.getPublicUserRacksPaginated;
    activeMarketplaceListings: typeof SupabaseQueriesService.prototype.getActiveMarketplaceListings;
    activeMarketplaceListingsBySellerProfileId: typeof SupabaseQueriesService.prototype.getActiveMarketplaceListingsBySellerProfileId;
    marketplaceListingByPublicId: typeof SupabaseQueriesService.prototype.getMarketplaceListingByPublicId;
  };
  
  private readonly queries!: SupabaseQueriesService;
  readonly cacheResetter$ = cacheBuster$;
  
  private customLock: LockFunc = (name, acquireTimeout, fn) => {
    if (acquireTimeout !== 0) {
      return navigatorLock(name, acquireTimeout ?? -1, fn);
    }

    return new Promise((resolve, reject) => {
      globalThis.navigator.locks.request(
        name,
        {
          mode: 'exclusive',
          ifAvailable: true
        },
        async lock => {
          if (!lock) {
            resolve(undefined as Awaited<ReturnType<typeof fn>>);
            return;
          }

          try {
            resolve(await fn());
          } catch (error) {
            reject(error);
          }
        }
      ).catch(reject);
    });
  };

  // Initialized in constructor to allow platform-aware auth config (SSR vs browser).
  private supabase!: SupabaseClient<Database, 'public'>;
  
  readonly get!: ReturnType<typeof createGetNamespace>;
  readonly add!: ReturnType<typeof createAddNamespace>;
  readonly delete!: ReturnType<typeof createDeleteNamespace>;
  readonly update!: ReturnType<typeof createUpdateNamespace>;
  readonly merge!: ReturnType<typeof createMergeNamespace>;
  readonly storage!: ReturnType<typeof createStorageNamespace>;
}
