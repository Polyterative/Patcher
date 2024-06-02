import {
  EventEmitter,
  Injectable
} from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { ActivatedRoute } from '@angular/router';
import {
  AuthError,
  createClient,
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
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { Database } from 'src/backend/database.types';
import { environment } from 'src/environments/environment';
import { PatchConnection } from '../../models/connection';
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
import { Tag } from '../../models/tag';
import {
  DbPaths,
  QueryJoins
} from './DatabaseStrings';
import {
  Cacheable,
  GlobalCacheConfig,
  LocalStorageStrategy
} from "ts-cacheable";
import { PostgrestSingleResponse } from "@supabase/postgrest-js/src/types";
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

export type SimpleUserModel = Pick<User, 'id' | 'email' | 'created_at' | 'updated_at'>;

export type RichUserModel =
  SimpleUserModel
  & {
  username: string
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
    catchError(() => {
      SharedConstants.errorHandlerOperation(snackBar);
      return NEVER;
    })
  );
}

function remapErrors<T>() {
  return (source: Observable<PostgrestSingleResponse<T>>) => source.pipe(
    switchMap(x => x.error ? throwError(() => new Error(x.error.message)) : of(x)),
  );
}

@Injectable()
export class SupabaseService {
  constructor(
    public activated: ActivatedRoute,
    public snackBar: MatSnackBar
  ) {
    // console.clear();
    
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
    currentUserComments: typeof SupabaseService.prototype.getCurrentUserComments;
    patches: typeof SupabaseService.prototype.getPatches;
    rackWithId: typeof SupabaseService.prototype.getRackWithId;
  } = {
    currentUserModules: this.getCurrentUserModules.bind(this),
    modules: this.getModules.bind(this),
    manufacturers: this.getManufacturers.bind(this),
    comments: this.getComments.bind(this),
    tags: this.getTags.bind(this),
    moduleWithId: this.getModuleWithId.bind(this),
    patchConnections: this.getPatchConnections.bind(this),
    currentUserComments: this.getCurrentUserComments.bind(this),
    patches: this.getPatches.bind(this),
    rackWithId: this.getRackWithId.bind(this)
  };
  
  readonly cacheResetter$ = cacheBuster$;
  
  
  private supabase = createClient<Database>(environment.supabase.url, environment.supabase.key);
  readonly get = {
    
    // patches:            (from = 0, to: number = this.defaultPag, columns = '*') => fromPromise(
    //   this.supabase.from(DatabasePaths.patches)
    //       .select(`${ columns }`)
    //       .range(from, to)
    // ),
    patchesMinimal: (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string, orderDirection?: string) => rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`id,name,description,${ QueryJoins.author },updated,created `, {count: 'exact'})
        .ilike('name', `%${ name }%`)
        .range(from, to)
        .order(orderBy ? orderBy : 'name', {ascending: orderDirection === 'asc'})
    )
      .pipe(
        map((x) => x),
        remapErrors(),
        map((x: any) => x),// map type as any , TODO: fix this
      ),
    currentUserPatches: () => {
      return this.getUserSession$().pipe(
        switchMap(user => rxFrom(
            this.supabase.from(DbPaths.patches)
              .select(`*, ${ QueryJoins.author }`)
              .filter('authorid', 'eq', user.id)
              .order('updated', {ascending: false})
          ).pipe(
          remapErrors(),
            map((x: any) => x), // map type as any , TODO: fix this
            map((x => x.data))
          )
        ),
      );
    },
    // if authorid is not provided, we will run it for the current user
    currentUserRacks: (authorid?: string) => rxFrom(this.getUserSession$()
      .pipe(
        switchMap((user: SimpleUserModel) => this.supabase.from(DbPaths.racks)
          .select(`*, ${ QueryJoins.author }`)
          .filter('authorid', 'eq', authorid ? authorid : user.id)
          .order('updated', {ascending: false})
        ),
      ).pipe(
        tap((x) => /*errorHandling*/ x),
        map((x: any) => x), // map type as any , TODO: fix this
        map((x => x.data))
      )),
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
        map((x: any) => x), // map type as any , TODO: fix this
        map((x => x.data)),
        map(x => x.map(y => ({
          module: y.module,
          rackingData: {
            id: y.id,
            row: y.row,
            column: y.column,
            moduleid: y.moduleid,
            rackid: y.rackid
          }
        })))),
    racksMinimal: (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string, orderDirection?: string) => rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`id,name,hp,rows,description,created,updated,authorid,${ QueryJoins.author }`, {count: 'exact'})
        // only public
        .filter('public', 'eq', true)
        .ilike(`name,hp,rows, ${ QueryJoins.author }`, `%${ name }%`)
        .range(from, to)
        .order(orderBy ? orderBy : 'name', {ascending: orderDirection === 'asc'})
    )
      .pipe(
        remapErrors(),
        map((x: any) => x), // map type as any , TODO: fix this
      ),
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
        map((x: any) => x)// map type as any , TODO: fix this
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
        remapErrors(),
        map((x: any) => x)// map type as any , TODO: fix this
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
        map((x: any) => x),// map type as any , TODO: fix this
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
        map((x: any) => x),// map type as any , TODO: fix this
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
    module_tags: (data: Tag[]) => rxFrom(
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
    rack: (data: {
      name: string,
      authorid: string,
      rows: number,
      hp: number,
      locked: boolean
    }) => rxFrom(
      this.supabase
        .from(DbPaths.racks)
        .insert(data)
        .select('id'),
    )
      .pipe(
        remapErrors(),
        map((x: any) => x), // map type as any , TODO: fix this
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
              authorid: user.id
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
                // if it has no id, then it is a new module, so we need to insert it
                
                if (!x.id) {
                  return rxFrom(
                    this.supabase
                      .from(DbPaths.modules)
                      .insert(x)
                  );
                } else {
                  return rxFrom(
                    this.supabase
                      .from(DbPaths.modules)
                      .update(x)
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
    )
      .pipe(
        remapErrors(),
        cacheBust(['manufacturers'])
      ),
    panel: (data: Partial<ModulePanel>[]) => rxFrom(
      this.supabase
        .from(DbPaths.module_panels)
        .insert(data)
    )
      .pipe(remapErrors())
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
    module: (id: number) => rxFrom(
      this.supabase.from(DbPaths.modules)
        .delete()
        .filter('id', 'eq', id)
    )
      .pipe(
        // delete all comments for this module
        switchMap(() => rxFrom(
          this.supabase.from(DbPaths.comments)
            .delete()
            .filter('entityId', 'eq', id)
            .filter('entityType', 'eq', CommentableEntityTypes.MODULE)
        )),
        remapErrors(),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId', 'currentUserComments']),
        catchErrors(this.snackBar)
      ),
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
    userPatch: (id: number) => this.getUserSession$()
      .pipe(
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
        // delete all comments for this rack
        switchMap(() => rxFrom(
          this.supabase.from(DbPaths.comments)
            .delete()
            .filter('entityId', 'eq', id)
            .filter('entityType', 'eq', CommentableEntityTypes.RACK)
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
        remapErrors(),
        cacheBust(['manufacturers'])
      )
  };
  readonly update = {
    module: (data: Partial<DbModule>) => {
      data.manufacturer = undefined;
      data.ins = undefined;
      data.outs = undefined;
      data.tags = undefined; // todo handle tags
      data.panels = undefined;
      
      if (data.standard) {
        // @ts-ignore
        data.standard = data.standard.id;
      } else {
        data.standard = undefined;
      }
      
      
      // iso 8601 date
      data.updated = new Date().toISOString();
      
      //strip out undefined or null values
      for (const key in data) {
        if (data[key] === undefined || data[key] === null) {
          delete data[key];
        }
      }
      
      return rxFrom(
        this.supabase.from(DbPaths.modules)
          .update(data)
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
          .upsert({
            id: data.id,
            authorid: data.author.id,
            name: data.name,
            description: data.description,
            rows: data.rows,
            hp: data.hp,
            locked: data.locked,
            public: data.public
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
        .pipe(showSuccessMessage(this.snackBar));
    },
    modules: (data: DbModule[]) => {
      for (const datum of data) {
        datum.manufacturer = undefined;
        datum.ins = undefined;
        datum.outs = undefined;
        datum.created = undefined;
        datum.updated = undefined;
        datum.manualURL = undefined;
      }
      return rxFrom(
        this.supabase.from(DbPaths.modules)
          .update(data)
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
      .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)))
  };
  
  storage = {
    uploadModulePanel: (file: SupabaseStorageFile, filenameAndExtension: string, contentType: string = 'image/jpeg') => {
      
      filenameAndExtension = this.cleanUpFileName(filenameAndExtension);
      
      return rxFrom(
        this.supabase
          .storage
          .from('module-panels')
          .upload('' + filenameAndExtension, file, {
            cacheControl: '36000', // 10 hours
            upsert: false,
            contentType: contentType
          })
      )
        .pipe(
          // bust the cache for modules
          cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
          catchErrors(this.snackBar),
          map(x => filenameAndExtension)
        );
    },
    uploadRack: (file: SupabaseStorageFile, filenameAndExtension: string) => {
      
      filenameAndExtension = this.cleanUpFileName(filenameAndExtension);
      
      return rxFrom(
        this.supabase
          .storage
          .from('racks')
          .upload('' + filenameAndExtension, file, {
            cacheControl: '36000',
            upsert: false,
            contentType: 'image/jpeg'
          })
      )
        .pipe(map(x => filenameAndExtension));
    },
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
      query = query.ilike('description', `%${ description }%`);
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
        .ilike('name', `%${ name }%`)
        .range(from, to)
        .order(orderBy ? orderBy : 'name', {ascending: orderDirection === 'asc'})
    )
      .pipe(
        remapErrors(),
        map((x: any) => x), // map type as any , TODO: fix this
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
        remapErrors(),
        map((x: any) => x)// map type as any , TODO: fix this
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('currentUserComments'))),
    maxCacheCount: 50,
  })
  private getCurrentUserComments() {
    return this.getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          this.supabase.from(DbPaths.comments)
            .select(`*,profile:profiles(id,username,email)`)
            .filter('authorId', 'eq', user.id)
            .limit(20)
            .order('created', {ascending: false})
            .range(0, 20)
        )),
        remapErrors(),
        map((x => x.data))
      );
  }
  
  @Cacheable({
    maxAge: smallCacheTime,
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
        map((x: any) => x), // map type as any , TODO: fix this
        map((x => x.data))
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
        remapErrors(),
        map((x: any) => x)// map type as any , TODO: fix this
      );
  }
  
  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('comments'))),
    maxCacheCount: 100,
    async: true
  })
  private getComments(entityId: number, entityType: number) {
    return rxFrom(
      this.supabase.from(DbPaths.comments)
        .select(`*,profile:profiles(id,username,email)`)
        .filter('entityId', 'eq', entityId)
        .filter('entityType', 'eq', entityType)
      // foreign key add profile information for each comment
    
    )
      .pipe(
        // remapErrors(),
        map((x => x.data))
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
        remapErrors(),
        map((x: any) => x),// map type as any , TODO: fix this
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
          map((x: any) => x), // map type as any , TODO: fix this
          map((x => x.data.map(y => y.module)))
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
                username: usernameGetterResponse.data[0].username
              }))
            )
        }),
        shareReplay(1)
      )
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
    cacheBuster$.next([
      "comments",
      "modules",
      "currentUserModules",
      "moduleWithId",
      "manufacturers",
      "currentUserModules",
      "patchConnections",
    ]);
    return from(this.supabase.auth.signOut())
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
                .pipe(map(z => x)))
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
      ordinal: i
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
  
  private buildCVInserter(cvs: CV[], path: string, moduleId: number, authorid: string) {
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
  
  private buildCVUpdater(cvs: CV[], path: string, moduleId: number) {
    const mappedCVs = cvs.map(this.getCvMapper(moduleId))
      .filter(x => x.id > 0);
    
    // create an array of  requests to insert each cv one by one
    // doing it this way because of a limitation of supabase
    return mappedCVs.map(x => rxFrom(this.supabase.from(path)
      .update(x)
      .eq('id', x.id)));
  }
  
  
}