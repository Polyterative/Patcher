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

@Injectable()
export class SupabaseService extends SubManager {
  private readonly authStateSubscription: {
    unsubscribe: () => void
  } | null = null;

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
      if (event === 'SIGNED_OUT') {
        this.user.logout$.emit();
      } else if (event === 'SIGNED_IN' && session) {
        this.user.login$.emit();
      }
    });

    if (authListener?.subscription) {
      this.authStateSubscription = authListener.subscription;
    }
    
    this.auth = createAuthNamespace(this.supabase, this.activated, this.snackBar);

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
      () => !environment.production ? of(true) : this.auth.hasAdminRole$()
    );

    this.update = createUpdateNamespace(
      this.supabase,
      this.snackBar,
      () => this.auth.getUserSession$(),
      (id: number) => this.delete.patchConnectionsForPatch(id),
      () => !environment.production ? of(true) : this.auth.hasAdminRole$()
    );

    this.queries = new SupabaseQueriesService(
      this.supabase,
      () => this.auth.getUserSession$(),
      this.defaultPag
    );

    this.GET = {
      currentUserModules: this.queries.getCurrentUserModules.bind(this.queries),
      modules: this.queries.getModules.bind(this.queries),
      manufacturers: this.queries.getManufacturers.bind(this.queries),
      manufacturersPaginated: this.queries.getManufacturersPaginated.bind(this.queries),
      comments: this.queries.getComments.bind(this.queries),
      tags: this.queries.getTags.bind(this.queries),
      moduleWithId: this.queries.getModuleWithId.bind(this.queries),
      patchConnections: this.queries.getPatchConnections.bind(this.queries),
      patchModuleInstances: this.queries.getPatchModuleInstances.bind(this.queries),
      currentUserComments: this.queries.getCurrentUserComments.bind(this.queries),
      currentUserContributorStats: this.queries.getCurrentUserContributorStats.bind(this.queries),
      patches: this.queries.getPatches.bind(this.queries),
      rackWithId: this.queries.getRackWithId.bind(this.queries),
      racksMinimal: this.queries.getRacksMinimal.bind(this.queries),
      userPatchesPaginated: this.queries.getUserPatchesPaginated.bind(this.queries),
      userRacksPaginated: this.queries.getUserRacksPaginated.bind(this.queries),
      publicUserPatchesPaginated: this.queries.getPublicUserPatchesPaginated.bind(this.queries),
      publicUserRacksPaginated: this.queries.getPublicUserRacksPaginated.bind(this.queries),
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
    manufacturers: typeof SupabaseQueriesService.prototype.getManufacturers;
    manufacturersPaginated: typeof SupabaseQueriesService.prototype.getManufacturersPaginated;
    comments: typeof SupabaseQueriesService.prototype.getComments;
    tags: typeof SupabaseQueriesService.prototype.getTags;
    moduleWithId: typeof SupabaseQueriesService.prototype.getModuleWithId;
    patchConnections: typeof SupabaseQueriesService.prototype.getPatchConnections;
    patchModuleInstances: typeof SupabaseQueriesService.prototype.getPatchModuleInstances;
    currentUserComments: typeof SupabaseQueriesService.prototype.getCurrentUserComments;
    currentUserContributorStats: typeof SupabaseQueriesService.prototype.getCurrentUserContributorStats;
    patches: typeof SupabaseQueriesService.prototype.getPatches;
    rackWithId: typeof SupabaseQueriesService.prototype.getRackWithId;
    racksMinimal: typeof SupabaseQueriesService.prototype.getRacksMinimal;
    userPatchesPaginated: typeof SupabaseQueriesService.prototype.getUserPatchesPaginated;
    userRacksPaginated: typeof SupabaseQueriesService.prototype.getUserRacksPaginated;
    publicUserPatchesPaginated: typeof SupabaseQueriesService.prototype.getPublicUserPatchesPaginated;
    publicUserRacksPaginated: typeof SupabaseQueriesService.prototype.getPublicUserRacksPaginated;
  };
  
  private readonly queries!: SupabaseQueriesService;
  readonly cacheResetter$ = cacheBuster$;
  
  private customLock: LockFunc = (name, acquireTimeout, fn) =>
    navigatorLock(name, acquireTimeout || 1, fn);

  // Initialized in constructor to allow platform-aware auth config (SSR vs browser).
  private supabase!: SupabaseClient<Database, 'public'>;
  
  readonly get!: ReturnType<typeof createGetNamespace>;
  readonly add!: ReturnType<typeof createAddNamespace>;
  readonly delete!: ReturnType<typeof createDeleteNamespace>;
  readonly update!: ReturnType<typeof createUpdateNamespace>;
  readonly storage!: ReturnType<typeof createStorageNamespace>;
}
