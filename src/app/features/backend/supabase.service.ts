import {
  EventEmitter,
  Injectable
} from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { ActivatedRoute } from '@angular/router';
import {
  AuthError,
  createClient,
  LockFunc,
  navigatorLock,
  User
} from '@supabase/supabase-js';
import {
  forkJoin,
  from,
  from as rxFrom,
  MonoTypeOperatorFunction,
  NEVER,
  Observable,
  ObservedValueOf,
  of,
  ReplaySubject,
  shareReplay,
  Subject,
  throwError,
  zip
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { normalizeForSearch } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import { Database } from 'src/backend/database.types';
import { environment } from 'src/environments/environment';
import {
  PatchConnection,
  PatchModuleInstance
} from '../../models/connection';
import { DbComment } from '../../models/comment';
import {
  CV,
  CVwithModuleId
} from '../../models/cv';
import { DBManufacturer } from '../../models/manufacturer';
import {
  DbModule,
  ModulePanel,
  RackedModule
} from '../../models/module';
import { Patch } from '../../models/patch';
import {
  RackingData,
  RackMinimal
} from '../../models/rack';
import {
  DbPaths,
  DbStoragePaths,
  QueryJoins
} from './DatabaseStrings';
import {
  Cacheable,
  GlobalCacheConfig,
  LocalStorageStrategy
} from "ts-cacheable";
import { CommentableEntityTypes } from "src/app/components/shared-atoms/comments/comments-data.service";


GlobalCacheConfig.storageStrategy = LocalStorageStrategy;

export type SupabaseStorageFile =
  ArrayBuffer
  | ArrayBufferView
  | Blob
  | Buffer
  | File
  | FormData
  | ReadableStream
  | URLSearchParams
  | string;

export type OAuthProvider =
  'google'
  | 'apple'
  | 'github'
  | 'facebook'
  | 'azure'
  | 'twitter';

export type SimpleUserModel = Pick<User, 'id' | 'email' | 'created_at' | 'updated_at'>;

export type RichUserModel =
  SimpleUserModel
  & {
  username: string;
  auth_provider?: string; // Track which provider was used (email, google, apple, etc.)
};

export interface SupabaseLoginResponse {
  returnUrl: any;
  user: RichUserModel;
  // error: AuthError;
}

export type SupabaseSignupResponse = Observable<SupabaseLoginResponse | ObservedValueOf<Promise<{
  user: SimpleUserModel | null;
  // error: AuthError | null
}>>>;


const defaultCacheTime = 5 * 60 * 1000;
const longCacheTime = defaultCacheTime * 10;
const smallCacheTime = defaultCacheTime / 5;
type CachedEntity =
  'comments'
  | 'modules'
  | 'manufacturers'
  | 'currentUserModules'
  | 'moduleWithId'
  | 'patchConnections'
  | 'patches'
  | 'currentUserComments'
  | 'rackWithId'
  | 'racksMinimal'
  | void;
const cacheBuster$ = new Subject<CachedEntity[]>();

function cacheBust<T>(cacheKeys: CachedEntity[]): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) => source.pipe(
    tap(() => cacheBuster$.next(cacheKeys))
  );
}

function showSuccessMessage<T>(snackBar: MatSnackBar): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) => source.pipe(
    tap(() => SharedConstants.showSuccessUpdate(snackBar))
  );
}

function catchErrors<T>(snackBar: MatSnackBar): (source: Observable<T>) => Observable<T> {
  return (source: Observable<T>) => source.pipe(
    catchError((e) => {
      console.error(e);
      SharedConstants.errorHandlerOperation(snackBar);
      return NEVER;
    })
  );
}

function remapErrors<T>() {
  // In Supabase v2, errors are handled differently - just pass through
  return (source: Observable<any>) => source;
}

@Injectable()
export class SupabaseService extends SubManager {
  private authStateSubscription: {
    unsubscribe: () => void
  } | null = null;
  
  constructor(
    public activated: ActivatedRoute,
    public snackBar: MatSnackBar
  ) {
    super();
    // console.clear();
    
    // Listen to auth state changes for cross-tab synchronization
    const {data: authListener} = this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.user.logout$.emit();
      } else if (event === 'SIGNED_IN' && session) {
        this.user.login$.emit();
      }
    });
    
    // Store the subscription for cleanup on destroy
    if (authListener?.subscription) {
      this.authStateSubscription = authListener.subscription;
    }
  }
  
  override ngOnDestroy(): void {
    // Clean up auth state listener
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
    }
    super.ngOnDestroy();
  }
  
  
  user = {
    user$: new ReplaySubject(),
    login$: new EventEmitter<void>(),
    logout$: new EventEmitter<void>()
  };
  private defaultPag = 20;
  
  readonly GET: {
    // infer types and return types
    currentUserModules: typeof SupabaseService.prototype.getCurrentUserModules;
    modules: typeof SupabaseService.prototype.getModules;
    manufacturers: typeof SupabaseService.prototype.getManufacturers;
    comments: typeof SupabaseService.prototype.getComments;
    tags: typeof SupabaseService.prototype.getTags;
    moduleWithId: typeof SupabaseService.prototype.getModuleWithId;
    patchConnections: typeof SupabaseService.prototype.getPatchConnections;
    patchModuleInstances: typeof SupabaseService.prototype.getPatchModuleInstances;
    currentUserComments: typeof SupabaseService.prototype.getCurrentUserComments;
    patches: typeof SupabaseService.prototype.getPatches;
    rackWithId: typeof SupabaseService.prototype.getRackWithId;
    racksMinimal: typeof SupabaseService.prototype.getRacksMinimal;
  } = {
    currentUserModules: this.getCurrentUserModules.bind(this),
    modules: this.getModules.bind(this),
    manufacturers: this.getManufacturers.bind(this),
    comments: this.getComments.bind(this),
    tags: this.getTags.bind(this),
    moduleWithId: this.getModuleWithId.bind(this),
    patchConnections: this.getPatchConnections.bind(this),
    patchModuleInstances: this.getPatchModuleInstances.bind(this),
    currentUserComments: this.getCurrentUserComments.bind(this),
    patches: this.getPatches.bind(this),
    rackWithId: this.getRackWithId.bind(this),
    racksMinimal: this.getRacksMinimal.bind(this)
  };
  
  readonly cacheResetter$ = cacheBuster$;
  
  /**
   * Custom lock wrapper to prevent NavigatorLockAcquireTimeoutError.
   * This fixes the issue where Supabase's _autoRefreshTokenTick uses 0ms timeout,
   * which causes lock acquisition to fail when multiple locks are requested simultaneously.
   * See: https://github.com/supabase/auth-js/issues/873
   */
  private customLock: LockFunc = (name, acquireTimeout, fn) => {
    // Ensure timeout is at least 1ms to avoid the ifAvailable flag issue
    return navigatorLock(name, acquireTimeout || 1, fn);
  };
  
  private supabase = createClient<Database>(
    environment.supabase.url,
    environment.supabase.key,
    {
      auth: {
        lock: this.customLock
      }
    }
  );
  readonly get = {
    
    // patches:            (from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
    //   this.supabase.from(DatabasePaths.patches)
    //       .select(`${ columns }`)
    //       .range(from, to)
    currentUserPatches: () => {
      return this.getUserSession$().pipe(
        switchMap(user => rxFrom(
            this.supabase.from(DbPaths.patches)
              .select(`*, ${ QueryJoins.author }`)
              .filter('authorid', 'eq', user.id)
              .order('updated', {ascending: false})
          ).pipe(
          remapErrors(),
          map(x => x.data)
          )
        ),
      );
    },
    // if authorid is not provided, we will run it for the current user
    currentUserRacks: (authorid?: string) => this.getUserSession$().pipe(
      switchMap((user: SimpleUserModel) => rxFrom(
        this.supabase.from(DbPaths.racks)
          .select(`*, ${ QueryJoins.author }`)
          .filter('authorid', 'eq', authorid ? authorid : user.id)
          .order('updated', {ascending: false})
      ).pipe(
        remapErrors(),
        map(x => x.data)
      )),
    ),
    rackedModules: (rackid: number) => rxFrom(
      this.supabase.from(DbPaths.rack_modules)
        .select(`*, ${ QueryJoins.module_fk_rackmodules }`)
        // .order('module.id')
        // .select(`*`)
        .filter('rackid', 'eq', rackid)
        .order('row', {ascending: true})
        .order('column', {ascending: true})
    )
      .pipe(remapErrors())
      .pipe(
        map((x: any) => x.data),
        map(x => x.map((y: any) => ({
          module: y.module,
          rackingData: {
            id: y.id,
            row: y.row,
            column: y.column,
            moduleid: y.moduleid,
            rackid: y.rackid
          }
        })))),
    
    racksWithModule: (moduleid: number, from = 0, to: number = this.defaultPag, orderBy?: string, orderDirection?: 'asc' | 'desc') => rxFrom(
      this.supabase.from(DbPaths.rack_modules_grouped_by_moduleid)
        .select(`*,${ QueryJoins.rack }`, {count: 'exact'})
        .filter('moduleid', 'eq', moduleid)
        // postgrest show racks only once
        .range(from, to)
        .order(orderBy ? orderBy : 'updated', {ascending: orderDirection === 'asc'})
    )
      .pipe(
        remapErrors(),
      )
    ,
    patchWithId: (id: number, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.patches)
        // .select(`${ columns }, manufacturer:manufacturerId(name), ${ QueryJoins.insOuts }`)
        .select(`${ columns }, ${ QueryJoins.author }`)
        // .range(from, to)
        .filter('id', 'eq', id)
        // .order('id', {foreignTable: DatabasePaths.moduleINs})
        // .order('id', {foreignTable: DatabasePaths.moduleOUTs})
        .single()
    )
      .pipe(
        remapErrors()
      ),
    patchesWithModule: (moduleid: number, from = 0, to: number = this.defaultPag, orderBy?: string, orderDirection?: 'asc' | 'desc') => {
      const patchIdList$ = rxFrom(
        this.supabase.from(DbPaths.patches_for_modules)
          .select('moduleid,patchid', {count: 'exact'})
          // .order('updated', {
          //   ascending:    false,
          //   foreignTable: DatabasePaths.patch_connections
          // })
          .filter('moduleid', 'eq', moduleid)
          .range(from, to)
      )
      // .pipe(remapErrors());
      
      // for each patchid, get the patch in a single query, combine them in a single array at the end
      return patchIdList$.pipe(
        switchMap(x => {
            const getPatchData$ = forkJoin(
              x.data.map(resultFromView =>
                rxFrom(this.supabase.from(DbPaths.patches)
                  .select(`id,name,description,${ QueryJoins.author },updated,created `)
                  .filter('id', 'eq', resultFromView.patchid)
                  .single())
                  .pipe(map(x => x.data))
              )
            );
            
            return x.data.length > 0 ? getPatchData$ : of([]);
          }
        )
      );
    },
    modulesBySameManufacturer: (manufacturerId, from = 0, to: number = this.defaultPag, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.modules)
        .select(`${ columns },
          ${ QueryJoins.manufacturer },
          ${ QueryJoins.standard },
          ${ QueryJoins.module_panels },
          ${ QueryJoins.module_tags }
          `)
        .filter('manufacturerId', 'eq', manufacturerId)
        // .filter(`${ DbPaths.module_panels }.isApproved`, 'eq', true) // only approved panels
        .limit(1, {                                                         // take only one panel
          foreignTable: DbPaths.module_panels
        })
        .order(`color`, {                                // order panel by color
          foreignTable: DbPaths.module_panels,
          ascending: true
        })
        .order('updated', {ascending: false})
        .range(from, to)
    )
      .pipe(
        remapErrors(),
        map((x => x.data))
      ),
    manufacturerWithId: (id: number, from = 0, to: number = this.defaultPag, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.manufacturers)
        .select(columns)
        .range(from, to)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(remapErrors()),
    standards: () => rxFrom(
      this.supabase.from(DbPaths.standards)
        .select('*')
    )
      .pipe(
        remapErrors(),
      ),
    userWithId: (id: string, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.profiles)
        .select(columns)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(remapErrors()),
    statistics: () => zip(
      rxFrom(
        this.supabase.from(DbPaths.modules)
          .select('id', {count: 'exact'})
      )
        .pipe(remapErrors())
        .pipe(map(((x: any) => x.count))),
      rxFrom(
        this.supabase.from(DbPaths.racks)
          .select('id', {count: 'exact'})
      )
        .pipe(remapErrors())
        .pipe(map(((x: any) => x.count))),
      rxFrom(
        this.supabase.from(DbPaths.patches)
          .select('id', {count: 'exact'})
      )
        .pipe(remapErrors())
        .pipe(map(((x: any) => x.count)))
    )
    
  };
  
  readonly add = {
    comment: (data: {
      entityId: number,
      entityType: number,
      content: string,
      //  authorid is not provided, we will run it for the current user
    }) => this.getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          this.supabase
            .from(DbPaths.comments)
            .insert({
              entityId: data.entityId,
              entityType: data.entityType,
              content: data.content,
              authorId: user.id
            })
        )),
        cacheBust(['comments', 'currentUserComments']),
        remapErrors()
      ),
    module_tags: (data: Database['public']['Tables']['module_tags']['Insert'][]) => rxFrom(
      this.supabase
        .from(DbPaths.module_tags)
        .upsert(data)
    )
      .pipe(remapErrors()),
    userModule: (moduleId: number) => this.getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          this.supabase
            .from(DbPaths.user_modules)
            .insert({
              moduleid: moduleId,
              profileid: user.id
            })
        )),
        cacheBust(['currentUserModules']),
        remapErrors()
      ),
    rackModule: (moduleId: number, rackid: number, row?: number, column?: number) => rxFrom(
      this.supabase
        .from(DbPaths.rack_modules)
        .insert({
          moduleid: moduleId,
          rackid,
          row,
          column
        })
    )
      .pipe(remapErrors()),
    rack: (data: Omit<RackMinimal, 'author' | 'created' | 'updated' | 'id'> & {
      authorid: string
    }) => rxFrom(
      this.supabase
        .from(DbPaths.racks)
        .insert(data)
        .select('id'),
    )
      .pipe(
        remapErrors(),
      ),
    patch: (data: {
      name: string
    }) => {
      return this.getUserSession$().pipe(
        switchMap(user => rxFrom(
          this.supabase
            .from(DbPaths.patches)
            .insert({
              ...data,
              authorid: user.id,
              public: true
            })
        )),
        remapErrors());
    },
    modules: (data: DbModule[]) => {
      return this.getUserSession$().pipe(
        map(user =>
          data
            .map(x => ({
              ...x,
              submitter: user.id
            }))
            .map(x => {
              // Transform for database - extract IDs from nested objects
              const dbData: any = {...x};
              if (dbData.standard && typeof dbData.standard === 'object') {
                dbData.standard = dbData.standard.id;
              }
              if (dbData.manufacturer && typeof dbData.manufacturer === 'object') {
                dbData.manufacturerId = dbData.manufacturer.id;
                delete dbData.manufacturer;
              }
              // Remove nested arrays/objects that don't belong in the modules table
              delete dbData.ins;
              delete dbData.outs;
              delete dbData.switches;
              delete dbData.panels;
              delete dbData.tags;
                
                // if it has no id, then it is a new module, so we need to insert it
                
                if (!x.id) {
                  return rxFrom(
                    this.supabase
                      .from(DbPaths.modules)
                      .insert(dbData)
                  );
                } else {
                  return rxFrom(
                    this.supabase
                      .from(DbPaths.modules)
                      .update(dbData)
                      .eq('id', x.id)
                  );
                }
                
              }
            )),
        // for each module, build a call to insert the module
        switchMap((x) => forkJoin(x)),
        // bust the cache for modules
        cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
        catchErrors(this.snackBar)
      );
    },
    moduleINs: (data: CV[], moduleid: number) => rxFrom(
      this.supabase
        .from(DbPaths.moduleINs)
        .insert(data.map(x => ({
          ...x,
          moduleid
        })))
    )
      .pipe(remapErrors()),
    moduleOUTs: (data: CV[], moduleid: number) => rxFrom(
      this.supabase
        .from(DbPaths.moduleOUTs)
        .insert(data.map(x => ({
          ...x,
          moduleid
        })))
    )
      .pipe(remapErrors()),
    manufacturers: (data: Partial<DBManufacturer>[]) => rxFrom(
      this.supabase
        .from(DbPaths.manufacturers)
        .insert(data)
        .select('id,name')
    )
      .pipe(
        remapErrors(),
        cacheBust(['manufacturers'])
      ),
    panel: (data: Database['public']['Tables']['module_panels']['Insert'][]) => rxFrom(
      this.supabase
        .from(DbPaths.module_panels)
        .insert(data)
    )
      .pipe(remapErrors()),
    patchModuleInstance: (patch_id: number, module_id: number, instance_label?: string) => rxFrom(
      this.supabase
        .from(DbPaths.patch_module_instances)
        .insert({patch_id, module_id, instance_label: instance_label ?? null})
        .select('id,patch_id,module_id,instance_label')
        .single()
    ).pipe(
      remapErrors(),
      map(x => x.data as PatchModuleInstance),
      cacheBust(['patchConnections'])
    ),
    /** Batch insert multiple patch module instances in a single DB call */
    patchModuleInstances: (rows: {
      patch_id: number;
      module_id: number;
      instance_label: string | null
    }[]) => rxFrom(
      this.supabase
        .from(DbPaths.patch_module_instances)
        .insert(rows)
        .select('id,patch_id,module_id,instance_label')
    ).pipe(
      remapErrors(),
      map(x => x.data as PatchModuleInstance[]),
      cacheBust(['patchConnections'])
    )
  };
  
  readonly delete = {
    comment: (id: number) => rxFrom(
      this.supabase.from(DbPaths.comments)
        .delete()
        .filter('id', 'eq', id)
    )
      .pipe(
        // bust the cache for comments
        cacheBust(['comments', 'currentUserComments']),
        remapErrors()),
    commentsForRack: (id: number) => rxFrom(
      this.supabase.from(DbPaths.comments)
        .delete()
        .filter('entityId', 'eq', id)
        .filter('entityType', 'eq', CommentableEntityTypes.RACK)
    )
      .pipe(
        // bust the cache for comments
        cacheBust(['comments', 'currentUserComments']),
        remapErrors()),
    module: (id: number) => {
      const deleteAllComments$ = rxFrom(
        this.supabase.from(DbPaths.comments)
          .delete()
          .filter('entityId', 'eq', id)
          .filter('entityType', 'eq', CommentableEntityTypes.MODULE)
      );
      const deleteModule$ = rxFrom(
        this.supabase.from(DbPaths.modules)
          .delete()
          .filter('id', 'eq', id)
          .select('id')
      );
      return deleteAllComments$
        .pipe(
          switchMap(() => deleteModule$),
          remapErrors(),
          cacheBust(['modules', 'currentUserModules', 'moduleWithId', 'currentUserComments']),
          catchErrors(this.snackBar)
        );
    },
    userModule: (id: number) => this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase.from(DbPaths.user_modules)
          .delete()
          .filter('profileid', 'eq', user.id)
          .filter('moduleid', 'eq', id)
      )),
      // delete all comments for this module
      switchMap(() => rxFrom(
        this.supabase.from(DbPaths.comments)
          .delete()
          .filter('entityId', 'eq', id)
          .filter('entityType', 'eq', CommentableEntityTypes.MODULE)
      )),
      cacheBust(['currentUserModules', 'currentUserComments']),
      remapErrors()
    )
    ,
    rackedModule: (id: number) => rxFrom(
      this.supabase.from(DbPaths.rack_modules)
        .delete()
        .filter('id', 'eq', id)
    )
      .pipe(remapErrors())
    ,
    modulesOfRack: (rackId: number) => rxFrom(
      this.supabase.from(DbPaths.rack_modules)
        .delete()
        .filter('rackid', 'eq', rackId)
    )
      .pipe(remapErrors())
    ,
    patch: (id: number) => rxFrom(
      this.supabase.from(DbPaths.patches)
        .delete()
        // .filter('profileid', 'eq', this.getUser().id)
        .filter('id', 'eq', id)
    )
      .pipe(
        // delete all comments for this patch
        switchMap(() => rxFrom(
          this.supabase.from(DbPaths.comments)
            .delete()
            .filter('entityId', 'eq', id)
            .filter('entityType', 'eq', CommentableEntityTypes.PATCH)
        )),
        remapErrors()
      )
    ,
    patchConnectionsForPatch: (id: number) => rxFrom(
      this.supabase.from(DbPaths.patch_connections)
        .delete()
        .filter('patchid', 'eq', id)
      // .filter('moduleid', 'eq', id)
    )
      .pipe(remapErrors())
    ,
    patchModuleInstance: (id: number) => rxFrom(
      this.supabase.from(DbPaths.patch_module_instances)
        .delete()
        .filter('id', 'eq', id)
    ).pipe(
      remapErrors(),
      cacheBust(['patchConnections'])
    ),
    patchModuleInstancesForPatch: (patch_id: number) => rxFrom(
      this.supabase.from(DbPaths.patch_module_instances)
        .delete()
        .filter('patch_id', 'eq', patch_id)
    ).pipe(
      remapErrors(),
      cacheBust(['patchConnections'])
    ),
    userPatch: (id: number) => this.getUserSession$()
      .pipe(
        // delete module instances for this patch (FK to patches)
        switchMap(user => rxFrom(
          this.supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('patch_id', 'eq', id)
        ).pipe(map(() => user))),
        switchMap(user => rxFrom(
          this.supabase.from(DbPaths.patches)
            .delete()
            .filter('authorid', 'eq', user.id)
            .filter('id', 'eq', id)
        )),
        // delete all comments for this patch
        switchMap(() => rxFrom(
          this.supabase.from(DbPaths.comments)
            .delete()
            .filter('entityId', 'eq', id)
            .filter('entityType', 'eq', CommentableEntityTypes.PATCH)
        )),
        remapErrors()
      )
    ,
    userRack: (id: number) => this.getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          this.supabase.from(DbPaths.racks)
            .delete()
            .filter('authorid', 'eq', user.id)
            .filter('id', 'eq', id)
        )),
        remapErrors(),
        cacheBust(['rackWithId'])
      )
    ,
    modules: (from = 0, to: number = this.defaultPag) => rxFrom(
      this.supabase.from(DbPaths.modules)
        .delete()
        .range(from, to)
    )
      .pipe(
        remapErrors(),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId'])
      ),
    manufacturers: (from = 0, to = this.defaultPag) => rxFrom(
      this.supabase.from(DbPaths.manufacturers)
        .delete()
        .range(from, to)
    )
      .pipe(
        cacheBust(['manufacturers']),
        catchErrors(this.snackBar),
        remapErrors(),
      ),
    modulePanel: (data: ModulePanel) => {
      // delete the panel file from storage first
      const deletePanelFile$ = this.storage.deletePanelFile(data.filename)
      
      const deleteDatabaseEntry$ = rxFrom(
        this.supabase.from(DbPaths.module_panels)
          .delete()
          .filter('id', 'eq', data.id)
      );
      return deletePanelFile$
        .pipe(
          switchMap(() => deleteDatabaseEntry$),
          catchErrors(this.snackBar),
          remapErrors()
        );
    },
    /**
     * Deletes all user-generated data for the current user in the correct dependency order:
     * patch_connections → patches → rack_modules → racks → user_modules → comments
     *
     * Note: This does NOT delete the auth user record (requires a server-side Edge Function
     * with service_role key). After calling this, the caller should sign the user out.
     */
    allUserData: () => this.getUserSession$().pipe(
      switchMap(user => {
        const uid = user.id;
        // Step 1 — delete patch connections for all patches authored by this user
        const deletePatchConnections$ = rxFrom(
          this.supabase.from(DbPaths.patch_connections)
            .delete()
            .in('patchid',
              this.supabase.from(DbPaths.patches).select('id').eq('authorid', uid) as any
            )
        ).pipe(remapErrors());
        
        // Step 1.5 — delete module instances for all patches authored by this user
        const deletePatchModuleInstances$ = rxFrom(
          this.supabase.from(DbPaths.patch_module_instances)
            .delete()
            .in('patch_id',
              this.supabase.from(DbPaths.patches).select('id').eq('authorid', uid) as any
            )
        ).pipe(remapErrors());

        // Step 2 — delete patches
        const deletePatches$ = rxFrom(
          this.supabase.from(DbPaths.patches).delete().eq('authorid', uid)
        ).pipe(remapErrors());

        // Step 3 — delete rack modules for all racks authored by this user
        const deleteRackModules$ = rxFrom(
          this.supabase.from(DbPaths.rack_modules)
            .delete()
            .in('rackid',
              this.supabase.from(DbPaths.racks).select('id').eq('authorid', uid) as any
            )
        ).pipe(remapErrors());

        // Step 4 — delete racks
        const deleteRacks$ = rxFrom(
          this.supabase.from(DbPaths.racks).delete().eq('authorid', uid)
        ).pipe(remapErrors());

        // Step 5 — delete user module collection entries
        const deleteUserModules$ = rxFrom(
          this.supabase.from(DbPaths.user_modules).delete().eq('profileid', uid)
        ).pipe(remapErrors());

        // Step 6 — delete all comments authored by this user
        const deleteComments$ = rxFrom(
          this.supabase.from(DbPaths.comments).delete().eq('authorId', uid)
        ).pipe(remapErrors());

        return deletePatchConnections$.pipe(
          switchMap(() => deletePatchModuleInstances$),
          switchMap(() => deletePatches$),
          switchMap(() => deleteRackModules$),
          switchMap(() => deleteRacks$),
          switchMap(() => deleteUserModules$),
          switchMap(() => deleteComments$),
          cacheBust(['modules', 'currentUserModules', 'moduleWithId', 'patches', 'patchConnections', 'rackWithId', 'racksMinimal', 'comments', 'currentUserComments'])
        );
      })
    )
  };
  
  readonly update = {
    module: (data: Partial<DbModule>) => {
      data.manufacturer = undefined;
      data.ins = undefined;
      data.outs = undefined;
      data.tags = undefined; // todo handle tags
      data.panels = undefined;
      
      // Transform data for database compatibility
      const dbData: any = {...data};
      if (dbData.standard && typeof dbData.standard === 'object') {
        dbData.standard = dbData.standard.id;
      }
      if (!dbData.standard) {
        dbData.standard = undefined;
      }
      
      
      // iso 8601 date
      dbData.updated = new Date().toISOString();
      
      //strip out undefined or null values
      for (const key in dbData) {
        if (dbData[key] === undefined || dbData[key] === null) {
          delete dbData[key];
        }
      }
      
      return rxFrom(
        this.supabase.from(DbPaths.modules)
          .update(dbData)
          .eq('id', data.id)
          .select('id,updated,created')
      )
        .pipe(
          showSuccessMessage(this.snackBar),
          // bust the cache for modules
          cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
        );
    },
    rackedModules: (data: RackedModule[]) => {
      // upload all modules that already have an id
      const toSimplyUpdate = data.filter(x => x.rackingData.id !== undefined)
        .map(rackedModule => rackedModule.rackingData);
      
      return rxFrom(
        // keep this an upsert, because otherwise you need to put an update parameter and send requests one by one
        this.supabase.from(DbPaths.rack_modules).upsert(toSimplyUpdate)
      )
        .pipe(
          // insert where id is undefined, meaning they are new and have not been inserted yet
          switchMap(x => {
            
            // we need to avoid passing an id in the object to the insert, otherwise it will fail
            const newRackedModules: Omit<RackingData, 'id'>[] = data
              .filter(x => x.rackingData.id === undefined)
              .map(rackedModule => ({
                moduleid: rackedModule.rackingData.moduleid,
                rackid: rackedModule.rackingData.rackid,
                row: rackedModule.rackingData.row,
                column: rackedModule.rackingData.column
              }));
            
            const insertNew$ = rxFrom(
              this.supabase.from(DbPaths.rack_modules)
                .insert(newRackedModules)
            );
            
            // call database for insert if there is any to insert
            return newRackedModules.length > 0 ? insertNew$ : of(x);
          })
          // this updated rack after its modules are updated
          // switchMap(x => this.supabase.from(DatabasePaths.racks)
          //                    .upsert({
          //                      id: rackId
          //                    })
          //                    .filter('id', 'eq', rackId) // forces updated refresh
          // );
        )
        .pipe(
          // if data.error is true, then we have an error, throw it down the pipe
          remapErrors(),
        );
    },
    rack: (data: RackMinimal) => {
      return rxFrom(
        this.supabase.from(DbPaths.racks)
          // do not use spread operator, because it will include unintended properties
          .upsert({
            id: data.id,
            authorid: data.author.id,
            name: data.name,
            description: data.description,
            rows: data.rows,
            hp: data.hp,
            locked: data.locked,
            public: data.public,
            image: data.image
          }).select('id')
      )
        .pipe(
          cacheBust(['rackWithId']),
        )
      // .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)));
    },
    patch: (data: Patch) => {
      data.author = undefined;
      return rxFrom(
        this.supabase.from(DbPaths.patches)
          .update(data)
          .eq('id', data.id)
          .single()
      )
        .pipe(
          showSuccessMessage(this.snackBar),
          cacheBust(['patches', 'patchConnections'])
        );
    },
    modules: (data: DbModule[]) => {
      const transformedData = data.map(datum => {
        const dbData: any = {...datum};
        // Remove nested objects/arrays
        dbData.manufacturer = undefined;
        dbData.ins = undefined;
        dbData.outs = undefined;
        dbData.created = undefined;
        dbData.updated = undefined;
        dbData.manualURL = undefined;
        
        // Transform standard object to ID
        if (dbData.standard && typeof dbData.standard === 'object') {
          dbData.standard = dbData.standard.id;
        }
        
        return dbData;
      });
      
      return rxFrom(
        this.supabase.from(DbPaths.modules)
          .upsert(transformedData)
      )
        .pipe(
          // bust the cache for modules
          cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
          showSuccessMessage(this.snackBar)
        );
    },
    moduleINsOUTs: (moduleId: number, ins: CV[], outs: CV[], authorid: string = '') => {
      return this.getUserSession$()
        .pipe(
          switchMap(user => {
            const controlVoltageUpdates$ = [
              this.buildCVInserter(ins, DbPaths.moduleINs, moduleId, authorid || user.id),
              this.buildCVUpdater(ins, DbPaths.moduleINs, moduleId),
              this.buildCVInserter(outs, DbPaths.moduleOUTs, moduleId, authorid || user.id),
              this.buildCVUpdater(outs, DbPaths.moduleOUTs, moduleId)
            ].flatMap(x => x);
            return forkJoin(controlVoltageUpdates$);
          }),
          // bust the cache for modules
          cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
          catchErrors(this.snackBar),
          showSuccessMessage(this.snackBar)
        );
    },
    patchConnections: (data: PatchConnection[]) => this.buildPatchConnectionInserter(data)
      .pipe(
        tap(x => SharedConstants.showSuccessUpdate(this.snackBar)),
        cacheBust(['patchConnections', 'patches'])
      ),
    patchModuleInstanceLabel: (id: number, instance_label: string | null) => rxFrom(
      this.supabase.from(DbPaths.patch_module_instances)
        .update({instance_label})
        .eq('id', id)
        .select('id,patch_id,module_id,instance_label')
        .single()
    ).pipe(
      remapErrors(),
      map(x => x.data as PatchModuleInstance),
      cacheBust(['patchConnections'])
    )
  };
  
  storage = {
    uploadModulePanel: (file: SupabaseStorageFile, filenameAndExtension: string, contentType: string = 'image/jpeg') => {
      
      filenameAndExtension = this.cleanUpFileName(filenameAndExtension);
      
      let uploadNewPanel$ = rxFrom(
        this.supabase
          .storage
          .from(DbStoragePaths.module_panels)
          .upload(filenameAndExtension, file, {
            cacheControl: '360000', // 100 hours
            upsert: true,
            contentType: contentType
          })
      );
      
      let deleteThePossibleOldPanel$ = this.storage.deletePanelFile(filenameAndExtension);
      
      return forkJoin([deleteThePossibleOldPanel$, uploadNewPanel$])
        .pipe(
          // bust the cache for modules
          cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
          catchErrors(this.snackBar),
          map(x => filenameAndExtension)
        );
    },
    uploadRackImage: (file: SupabaseStorageFile, filenameAndExtension: string) => {
      
      filenameAndExtension = this.cleanUpFileName(filenameAndExtension);
      
      // prefix precise date and time to the filename,just before the extension,which can change
      // use best practices regarding special symbols and stuff
      filenameAndExtension = filenameAndExtension.split('.').join(`_${ new Date().toISOString().replace(/:/g, '-').replace(/[^0-9-]/g, '') }.`);
      return this.getUserSession$()
        .pipe(
          switchMap(() => {
            return rxFrom(
              this.supabase
                .storage
                .from(DbStoragePaths.racks)
                .upload(filenameAndExtension, file, {
                  cacheControl: '360',
                  contentType: 'image/jpeg'
                })
            )
              .pipe(
                // bust the cache
                cacheBust(['rackWithId']),
                map(_ => filenameAndExtension));
          })
        );
    },
    deleteRackImage: (filenameAndExtension: string) => {
      filenameAndExtension = this.cleanUpFileName(filenameAndExtension);
      return rxFrom(
        this.supabase
          .storage
          .from(DbStoragePaths.racks)
          .remove([filenameAndExtension])
      )
        .pipe(
          // bust the cache for modules
          cacheBust(['rackWithId']),
          catchErrors(this.snackBar)
        );
      
    },
    deletePanelFile: (path: string) => {
      return rxFrom(
        this.supabase
          .storage
          .from(DbStoragePaths.module_panels)
          .remove([path])
      )
        .pipe(
          // bust the cache for modules
          cacheBust(['modules', 'currentUserModules', 'moduleWithId', "rackWithId"]),
          catchErrors(this.snackBar)
        );
    }
    
  };
  
  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules'))),
    maxCacheCount: 50,
    // async: true
  })
  private getModules(
    from = 0,
    to: number = this.defaultPag,
    name?: string,
    orderBy?: string,
    orderDirection?: string,
    manufacturerId?: number,
    withHP?: number,
    withHpCondition?: "=" | ">" | "<" | ">=" | "<=" | "!=" | undefined,
    standard: number | undefined = undefined,
    description: string = undefined,
    onlyPublic = true) {
    let query = this.supabase.from(DbPaths.modules)
      .select(`
                              id,name,hp,description,public,created,updated,
                              ${ QueryJoins.manufacturer },
                              ${ QueryJoins.standard },
                              ${ QueryJoins.module_panels },
                              ${ QueryJoins.module_tags }
                            `, {count: 'exact'})
    
    if (onlyPublic === true) {
      query = query.filter('public', 'eq', true);
    }
    
    if (withHP) {
      if (withHpCondition === '=' || withHpCondition === undefined) {
        query = query.filter('hp', 'eq', withHP);
      } else if (withHpCondition === '>') {
        query = query.filter('hp', 'gt', withHP);
      } else if (withHpCondition === '<') {
        query = query.filter('hp', 'lt', withHP);
      } else if (withHpCondition === '>=') {
        query = query.filter('hp', 'gte', withHP);
      } else if (withHpCondition === '<=') {
        query = query.filter('hp', 'lte', withHP);
      } else if (withHpCondition === '!=') {
        query = query.filter('hp', 'neq', withHP);
      } else {
        query = query.filter('hp', 'eq', withHP);
      }
    }
    
    if (manufacturerId) {
      query = query.filter('manufacturerId', 'eq', manufacturerId);
    }
    
    if (standard !== undefined) {
      query = query.filter('standard', 'eq', standard);
    }
    
    if (description) {
      query = query.ilike('description', `%${ normalizeForSearch(description) }%`);
    }
    
    
    return rxFrom(
      query
        // .filter(`${ DbPaths.module_panels }.isApproved`, 'eq', true) // only approved panels
        .order(`color`, {                                // order panel by color
          foreignTable: DbPaths.module_panels,
          ascending: true
        })
        .limit(1, {                                // take only one panel
          foreignTable: DbPaths.module_panels
        })
        .ilike('name', `%${ normalizeForSearch(name) }%`)
        .range(from, to)
        .order(orderBy ? orderBy : 'name', {ascending: orderDirection === 'asc'})
    )
      .pipe(
        remapErrors()
      )
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  private getRackWithId(id: number, columns = '*') {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        // .select(`${ columns }, manufacturer:manufacturerId(name), ${ QueryJoins.insOuts }`)
        .select(`${ columns }, ${ QueryJoins.author }`)
        // .range(from, to)
        .filter('id', 'eq', id)
        // .filter('public', 'eq', true)
        
        // .order('id', {foreignTable: DatabasePaths.moduleINs})
        // .order('id', {foreignTable: DatabasePaths.moduleOUTs})
        .single()
    )
      .pipe(
        remapErrors()
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('racksMinimal'))),
    maxCacheCount: 50,
  })
  private getRacksMinimal(
    from: number = 0,
    to?: number,
    name?: string,
    orderBy?: string,
    orderDirection?: string
  ) {
    const effectiveTo = to ?? this.defaultPag;
    
    const columns = [
      "id",
      "name",
      "hp",
      "rows",
      "description",
      "created",
      "updated",
      "authorid",
      QueryJoins.author,
      "image"
    ].join(",");
    
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`${ columns }, rack_modules!inner(rackid)`, {count: "exact"})
        .filter("public", "eq", true)
        .ilike(`name,hp,rows,${ QueryJoins.author }`, `%${ normalizeForSearch(name.trim()) }%`)
        .range(from, effectiveTo)
        .order(orderBy ? orderBy : "name", {ascending: orderDirection === "asc"})
    )
      .pipe(
        remapErrors(),
      );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('currentUserComments'))),
    maxCacheCount: 50,
  })
  private getCurrentUserComments(
    from = 0,
    to: number = this.defaultPag
  ) {
    return this.getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          this.supabase.from(DbPaths.comments)
            .select(`*,profile:profiles(id,username,email)`)
            .filter('authorId', 'eq', user.id)
            .limit(20)
            .order('created', {ascending: false})
            .range(from, to)
        )),
        remapErrors(),
        map((x => x.data))
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
    async: true
  })
  private getPatches(
    from = 0,
    to: number = this.defaultPag,
    name?: string,
    orderBy?: string,
    orderDirection?: string,
    columns: string = `id,name,description,${ QueryJoins.author },updated,created`
  ) {
    const connections = `,patch_connections!inner(patchid,a,b)`; // Ensures only patches with connections are included
    
    let queryBuilder = this.supabase
      .from(DbPaths.patches)
      .select(columns + connections, {count: 'exact'})
      .filter("public", "eq", true)
      .order(orderBy ?? 'name', {ascending: orderDirection === 'asc'});
    
    if (columns.includes('name')) {
      queryBuilder = queryBuilder.order(orderBy ?? 'name', {ascending: orderDirection === 'asc'});
    }
    
    if (name) {
      queryBuilder = queryBuilder.ilike('name', `%${ normalizeForSearch(name) }%`);
    }
    
    return rxFrom(queryBuilder.range(from, to))
      .pipe(
        map((x) => x),
        remapErrors(),
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patchConnections'))),
    maxCacheCount: 50,
    async: true
  })
  private getPatchConnections(patchid: number) {
    return rxFrom(
      this.supabase.from(DbPaths.patch_connections)
        // .select(`module:moduleid(*, ${ QueryJoins.manufacturer }, ${ QueryJoins.insOuts })`)
        //   .select(`*,a(*,${ QueryJoins.module })`)
        //   .select(`*,a(*,module:moduleid(*,manufacturer:manufacturerId(name,id,logo)))`)
        .select(`
          *,
          ${ QueryJoins.patch },
          a(*,module:modules!moduleOUTs_moduleId_fkey(*, ${ QueryJoins.manufacturer },${ QueryJoins.module_panels })),
          b(*,module:modules!moduleINs_moduleId_fkey(*,${ QueryJoins.manufacturer },${ QueryJoins.module_panels }))
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
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patchConnections'))),
    maxCacheCount: 50,
    async: true
  })
  private getPatchModuleInstances(patch_id: number) {
    return rxFrom(
      this.supabase.from(DbPaths.patch_module_instances)
        .select('id,patch_id,module_id,instance_label')
        .filter('patch_id', 'eq', patch_id)
        .order('id')
    ).pipe(
      remapErrors(),
      map(x => x.data as PatchModuleInstance[])
    );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('moduleWithId'))),
    maxCacheCount: 50
  })
  private getModuleWithId(id: number, columns = `*,
           ${ QueryJoins.manufacturer },
            ${ QueryJoins.standard },
            ${ QueryJoins.insOuts },
            ${ QueryJoins.module_tags },
            ${ QueryJoins.module_panels }
            `) {
    let queryBuilder$ = this.supabase.from(DbPaths.modules)
      .select(
        columns
      )
      .filter('id', 'eq', id);
    
    if (columns.includes(QueryJoins.module_panels)) {
      // order panel by color
      queryBuilder$ = queryBuilder$.order(`color`, {
        referencedTable: DbPaths.module_panels,
        ascending: true
      })
    }
    
    if (columns.includes(QueryJoins.insOuts)) {
      // order inputs and outputs
      queryBuilder$ = queryBuilder$
        .order('id', {referencedTable: DbPaths.moduleINs})
        .order('id', {referencedTable: DbPaths.moduleOUTs})
    }
    
    
    return rxFrom(
      queryBuilder$
        // .filter(`${ DbPaths.module_panels }.isApproved`, 'eq', true) // only approved panels
        // .limit(1, {                                // take only one panel
        //   foreignTable: DatabasePaths.module_panels
        // })
        .single()
    )
      .pipe(
        remapErrors()
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('comments'))),
    maxCacheCount: 100,
    async: true
  })
  private getComments(entityId: number, entityType: number): Observable<DbComment[] | null | undefined> {
    return rxFrom(
      this.supabase.from(DbPaths.comments)
        .select(`*,profile:profiles(id,username,email)`)
        .filter('entityId', 'eq', entityId)
        .filter('entityType', 'eq', entityType)
      // foreign key add profile information for each comment
    
    )
      .pipe(
        // remapErrors(),
        map(x => x.data)
      );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('manufacturers'))),
  })
  private getManufacturers(from = 0, to = this.defaultPag, columns = '*', orderBy?: string) {
    return rxFrom(
      this.supabase.from(DbPaths.manufacturers)
        .select(columns)
        .range(from, to)
        .order(orderBy ? orderBy : 'name')
    )
      .pipe(
        remapErrors()
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('currentUserModules'))),
    maxCacheCount: 50
  })
  private getCurrentUserModules(
    includeInsOuts = true,
    includeManuals = false,
  ): Observable<any> {
    let prefix = `module`;
    let panelsTable: string = `${ prefix }.${ DbPaths.module_panels }`;
    
    
    let moduleColumns = `id,name,hp,description,public,created,updated,manufacturerId,standard,isApproved`;
    
    let columns = [
      moduleColumns,
      QueryJoins.manufacturer,
      QueryJoins.module_panels,
    ]
    // can be optimized to avoid calling it all the time but for now it is ok
    if (includeInsOuts) {
      columns.push(QueryJoins.insOuts);
    }
    
    if (includeManuals) {
      columns.push('manualURL');
    }
    
    return this.getUserSession$().pipe(
      switchMap(user =>
        rxFrom(
          this.supabase.from(DbPaths.user_modules)
            .select(
              `${ prefix }:modules!user_modules_moduleid_fkey(
                ${ columns.join(',') })`
            )
            // only approved panels
            // .filter(`${ prefix }.${ DbPaths.module_panels }.isApproved`, 'eq', true)
            // order panel by color
            .order(`color`, {
              foreignTable: panelsTable,
              ascending: true
            })
            .order('updated', {ascending: false})
            .limit(1, {foreignTable: panelsTable})
            .filter('profileid', 'eq', user.id)
        ).pipe(
          remapErrors(),
          map((x: any) => x.data.map((y: any) => y.module))
        )
      ),
    );
  }
  
  private getTags() {
    return rxFrom(
      this.supabase.from(DbPaths.tags)
        .select('*')
    )
      .pipe(
        // remapErrors(),
        map((x => x.data))
      );
  }
  
  private errorMsg() {
    return SharedConstants.errorHandlerOperation(this.snackBar);
  }
  
  private cleanUpFileName(filenameAndExtension: string) {
    return filenameAndExtension.toLowerCase().trim()
  }
  
  login$(email: string, password: string): Observable<SupabaseLoginResponse> {
    const params$ = of('')
      .pipe(withLatestFrom(this.activated.queryParams), map(([x, data]) => data));
    
    return rxFrom(this.supabase.auth.signInWithPassword({
      email,
      password
    }))
      .pipe(
        switchMap(authResponse => {
            const updateConfirmed$ = rxFrom(
              this.supabase
                .from(DbPaths.profiles)
                .update({
                  confirmed: true
                })
                .filter('id', 'eq', authResponse.data.user.id)
            )
              .pipe(map(z => authResponse));
          
          return authResponse.error ? of(authResponse) : updateConfirmed$.pipe(
              map(x => authResponse)
            );
          }
        ),
        withLatestFrom(params$),
        switchMap(([authResponse, params]) => {
            // now select the user profile of the current user
          
          return rxFrom(
              this.supabase
                .from(DbPaths.profiles)
                .select('username')
                .filter('id', 'eq', authResponse.data.user.id)
            )
              .pipe(
                map(usernameGetterResponse => ({
                  returnUrl: params.returnUrl,
                  user: {
                    ...authResponse.data.user,
                    username: usernameGetterResponse.data[0].username
                  }
                }))
              )
          }
        ),
      );
  }
  
  /**
   * Initiates OAuth login with a social provider (Google, Apple, GitHub, etc.)
   * This will redirect the user to the provider's login page
   * After successful authentication, the user will be redirected to the callback URL
   *
   * @param provider - The OAuth provider to use
   * @param redirectTo - Optional custom redirect URL after successful authentication
   * @returns Observable that completes after initiating the OAuth flow
   */
  loginWithOAuth$(provider: OAuthProvider, redirectTo?: string): Observable<void> {
    const redirectUrl = redirectTo || `${ window.location.origin }/auth/callback`;
    
    return from(
      this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          // Request email scope to ensure we get the user's email
          scopes: 'email'
        }
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        // OAuth flow initiated successfully
        // User will be redirected to provider's login page
        return void 0;
      })
    );
  }
  
  /**
   * Handles the OAuth callback after user returns from provider
   * This should be called on the callback page to complete the authentication
   *
   * @returns Observable with the authenticated user or null if authentication failed
   */
  handleOAuthCallback$(): Observable<RichUserModel | null> {
    return from(this.supabase.auth.getSession()).pipe(
      switchMap((sessionResponse) => {
        if (sessionResponse.error || !sessionResponse.data.session) {
          return of(null);
        }
        
        const user = sessionResponse.data.session.user;
        
        // Check if user has a profile/username already
        return this.getRichUserSession$().pipe(
          switchMap((richUser) => {
            // If no username exists, this is a new OAuth user
            if (!richUser || !richUser.username) {
              // Create profile entry if it doesn't exist
              return this.ensureOAuthUserProfile$(user).pipe(
                map(() => richUser)
              );
            }
            return of(richUser);
          })
        );
      })
    );
  }
  
  /**
   * Ensures an OAuth user has a profile entry
   * Creates a profile with a temporary username that the user can change later
   *
   * @param user - The authenticated Supabase user
   * @returns Observable that completes when profile is created/verified
   */
  private ensureOAuthUserProfile$(user: User): Observable<void> {
    const email = user.email || '';
    // Generate a temporary username from email or user_id
    const tempUsername = email.split('@')[0] || `user_${ user.id.substring(0, 8) }`;
    
    return rxFrom(
      this.supabase
        .from(DbPaths.profiles)
        .upsert({
          id: user.id,
          email: email,
          username: tempUsername,
          confirmed: true,
          created_at: user.created_at,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
    ).pipe(
      map(() => void 0)
    );
  }
  
  signup$(username: string, email: string, password: string): SupabaseSignupResponse {
    return from(this.supabase.auth.signUp({
      email,
      password
    }))
      .pipe(switchMap(x => x.error ? of(x.data) : this.updateUserProfile(email, password, username)));
  }
  
  getUserSession$(): Observable<SimpleUserModel | null> {
    return from(rxFrom(this.supabase.auth.getSession())
    )
      .pipe(
        switchMap(sessionOutput => {
          
          // perform additional checks,and if data is not good to throw error
          if (sessionOutput.data.session == null) {
            // console.log('User is not logged in')
            return of(null);
          }
          
          // console.log('User is currently logged in')
          
          const userFullData: SimpleUserModel = {
            id: sessionOutput.data.session.user.id,
            email: sessionOutput.data.session.user.email,
            created_at: sessionOutput.data.session.user.created_at,
            updated_at: sessionOutput.data.session.user.updated_at
          };
          
          return of(userFullData);
        }),
        shareReplay(1)
      );
  }
  
  getRichUserSession$(): Observable<RichUserModel | null> {
    return this.getUserSession$()
      .pipe(
        switchMap(simpleUserData => {
          if (simpleUserData == null) {
            return of(null);
          }
          // TODO in some situation this is getting called twice, and it should not,for example when logging in
          return this.getUserNameFromDatabase(simpleUserData.id)
            .pipe(
              map(usernameGetterResponse => ({
                ...simpleUserData,
                username: usernameGetterResponse.data[0].username,
                email: simpleUserData.email // Ensure email is retained
              }))
            );
        }),
        shareReplay(1)
      );
  }
  
  private getUserNameFromDatabase(userId: string) {
    return rxFrom(
      this.supabase
        .from(DbPaths.profiles)
        .select('username')
        .filter('id', 'eq', userId)
    );
  }
  
  logoff$(): Observable<{
    error: AuthError | null
  }> {
    // burst the caches, all of them
    this.burstAllCaches();
    return from(this.supabase.auth.signOut())
  }
  
  private burstAllCaches() {
    cacheBuster$.next([
      "comments",
      "modules",
      "currentUserModules",
      "moduleWithId",
      "manufacturers",
      "currentUserModules",
      "patchConnections",
      "rackWithId",
      "patches",
      "currentUserComments"
    ]);
  }

// logs in, updates profile, logs out
  private updateUserProfile(email: string, password: string, username: string): Observable<SupabaseLoginResponse> {
    return this.login$(email, password)
      .pipe(
        switchMap(x => rxFrom(
            this.supabase
              .from(DbPaths.profiles)
              .update({
                confirmed: true,
                username
              })
              .eq('id', x.user.id)
          )
            .pipe(
              map(() => x),
              switchMap(x => rxFrom(this.supabase.auth.signOut())
                .pipe(map(_ => x)))
            )
        )
      );
  }
  
  private buildPatchConnectionInserter(connections: PatchConnection[]) {
    
    const toInsert = connections.map((conn, i) => ({
      patchid: conn.patch.id,
      a: conn.a.id,
      b: conn.b.id,
      notes: conn.notes,
      ordinal: i,
      instance_id_a: conn.instance_id_a ?? null,
      instance_id_b: conn.instance_id_b ?? null
    }));
    
    const inserter$ = rxFrom(
      this.supabase.from(DbPaths.patch_connections)
        .insert(toInsert)
        .select('patchid')
    )
      .pipe(tap(x => /*errorHandling*/ x));
    
    if (connections.length > 0) {
      return this.delete.patchConnectionsForPatch(connections[0].patch.id)
        .pipe(
          tap(x => /*errorHandling*/ x),
          switchMap(() => inserter$)
        );
    }
    
    return inserter$;
  }
  
  private getCvMapper(moduleid: number) {
    const mapper: (cv) => CVwithModuleId = (cv: CV) => ({
      ...cv,
      moduleid
    });
    
    return mapper;
  }
  
  private buildCVInserter(cvs: CV[], path: 'module_ins' | 'module_outs', moduleId: number, authorid: string) {
    const mappedCVs = cvs.map(this.getCvMapper(moduleId))
      .filter(x => x.id === 0)
      .map(x => {
        x.id = undefined;
        return x;
      })
      .map(x => ({
        ...x,
        authorid
      }));
    
    // create an array of  requests to insert each cv one by one
    // doing it this way because of a limitation of supabase
    return mappedCVs.map(x => rxFrom(this.supabase.from(path)
      .insert(x)));
  }
  
  private buildCVUpdater(cvs: CV[], path: 'module_ins' | 'module_outs', moduleId: number) {
    const mappedCVs = cvs.map(this.getCvMapper(moduleId))
      .filter(x => x.id > 0);
    
    // create an array of  requests to insert each cv one by one
    // doing it this way because of a limitation of supabase
    return mappedCVs.map(x => rxFrom(this.supabase.from(path)
      .update(x)
      .eq('id', x.id)));
  }
  
  /**
   * Handles both sending a password reset email and resetting the password with a token.
   * If newPassword is provided, performs a token-based password reset. Otherwise, sends a reset email.
   * @param emailOrToken The email address (for email-based) or token (for token-based).
   * @param newPassword The new password to set (for token-based reset).
   */
  resetPassword$(emailOrToken: string, newPassword?: string): Observable<void> {
    if (newPassword) {
      // Token-based password reset
      return from(
        this.supabase.auth.updateUser({
          password: newPassword
        })
      ).pipe(
        map((response) => {
          // Check for errors in the response
          if (response.error) {
            throw this.createPasswordResetError(response.error);
          }
          console.log(SharedConstants.messages.resetPassword?.resetPasswordTitle);
        }),
        catchError((error) => {
          console.error(SharedConstants.messages.resetPassword?.resetFailed, error);
          // Parse and format the error
          const formattedError = this.createPasswordResetError(error);
          return throwError(() => formattedError);
        })
      );
    } else {
      // Email-based password reset
      if (!this.isValidEmail(emailOrToken)) {
        return throwError(() => new Error('Invalid email address.'));
      }
      const redirectTo = `${ window.location.origin }/auth/reset-password`;
      return from(this.supabase.auth.resetPasswordForEmail(emailOrToken, {redirectTo})).pipe(
        map((response) => {
          if (response.error) {
            throw new PasswordResetError('Failed to send password reset email.', response.error.message);
          }
        }),
        catchError((error) => {
          console.error('Password reset request failed:', error);
          return throwError(() => error);
        })
      );
    }
  }
  
  /**
   * Creates a formatted error from Supabase error responses
   */
  private createPasswordResetError(error: any): PasswordResetError {
    // Handle various error formats from Supabase
    let errorCode = error?.error_code || error?.code || error?.name;
    let message = error?.msg || error?.message || error?.error_description;
    let statusCode = error?.code;
    
    // Map error codes to user-friendly messages
    const errorMessages = SharedConstants.messages.resetPassword;
    
    if (errorCode === 'same_password' || message?.toLowerCase().includes('same password')) {
      return new PasswordResetError(errorMessages.samePassword, errorCode, statusCode);
    }
    
    if (errorCode === 'weak_password' || message?.toLowerCase().includes('weak password')) {
      return new PasswordResetError(errorMessages.weakPassword, errorCode, statusCode);
    }
    
    if (errorCode === 'invalid_credentials' || errorCode === 'invalid_grant' ||
      message?.toLowerCase().includes('invalid') || message?.toLowerCase().includes('expired')) {
      return new PasswordResetError(errorMessages.invalidSession, errorCode, statusCode);
    }
    
    if (errorCode === 'network_error' || message?.toLowerCase().includes('network') ||
      message?.toLowerCase().includes('fetch')) {
      return new PasswordResetError(errorMessages.networkError, errorCode, statusCode);
    }
    
    // Default error message
    const defaultMessage = message || errorMessages.unknownError;
    return new PasswordResetError(defaultMessage, errorCode, statusCode);
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private isValidPassword(password: string): boolean {
    return password.length >= 8; // Add more complexity checks if needed
  }
  
  /**
   * Updates the username in the profiles table for the current user
   * This works for both email/password and SSO users
   *
   * @param userId - The user ID to update
   * @param newUsername - The new username to set
   * @returns Observable that completes when username is updated
   */
  updateUsername$(userId: string, newUsername: string): Observable<void> {
    const trimmedUsername = newUsername.trim();
    
    if (!trimmedUsername || trimmedUsername.length < 3) {
      return throwError(() => new Error('Username must be at least 3 characters long.'));
    }
    
    if (trimmedUsername.length > 30) {
      return throwError(() => new Error('Username must be 30 characters or less.'));
    }
    
    // Check if username contains only valid characters (alphanumeric, underscore, hyphen)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(trimmedUsername)) {
      return throwError(() => new Error('Username can only contain letters, numbers, underscores, and hyphens.'));
    }
    
    return rxFrom(
      this.supabase
        .from(DbPaths.profiles)
        .update({
          username: trimmedUsername,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    ).pipe(
      map((response) => {
        if (response.error) {
          // Check for unique constraint violation
          if (response.error.code === '23505' || response.error.message?.includes('unique')) {
            throw new Error('This username is already taken. Please choose another one.');
          }
          throw new Error(response.error.message || 'Failed to update username.');
        }
        return void 0;
      }),
      catchError((error) => {
        console.error('Username update failed:', error);
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Changes the password for the currently authenticated user.
   * Requires an active session — this is for in-app password change, not password reset.
   *
   * @param newPassword - The new password to set (min 8 characters)
   * @returns Observable that completes when the password is updated
   */
  updatePassword$(newPassword: string): Observable<void> {
    return from(
      this.supabase.auth.updateUser({password: newPassword})
    ).pipe(
      map((response) => {
        if (response.error) {
          throw new Error(response.error.message || 'Password update failed.');
        }
        return void 0;
      }),
      catchError((error) => {
        console.error('Password change failed:', error);
        return throwError(() => error);
      })
    );
  }
}

class PasswordResetError extends Error {
  constructor(
    public message: string,
    public errorCode?: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'PasswordResetError';
  }
}