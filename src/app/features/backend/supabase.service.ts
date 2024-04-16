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
  NEVER,
  Observable,
  ObservedValueOf,
  of,
  ReplaySubject,
  shareReplay,
  throwError,
  zip
} from 'rxjs';
import {
  catchError,
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
  
  
  private supabase = createClient<Database>(environment.supabase.url, environment.supabase.key);
  add = {
    module_tags: (data: Tag[]) => rxFrom(
      this.supabase
        .from(DbPaths.module_tags)
        .upsert(data)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
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
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))
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
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
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
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
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
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)));
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
        catchError(() => this.standardErrorMessageAndBlock()),
        this.errorMsg()
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
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
    moduleOUTs: (data: CV[], moduleid: number) => rxFrom(
      this.supabase
        .from(DbPaths.moduleOUTs)
        .insert(data.map(x => ({
          ...x,
          moduleid
        })))
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
    manufacturers: (data: Partial<DBManufacturer>[]) => rxFrom(
      this.supabase
        .from(DbPaths.manufacturers)
        .insert(data)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
    panel: (data: Partial<ModulePanel>[]) => rxFrom(
      this.supabase
        .from(DbPaths.module_panels)
        .insert(data)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
  };
  get = {
    userModules: () => {
      let prefix = `module`;
      let panelsTable: string = `${ prefix }.${ DbPaths.module_panels }`;
      
      const columns = `
    ${ prefix }:modules!user_modules_moduleid_fkey(
      *,
      ${ QueryJoins.module_panels },
      ${ QueryJoins.manufacturer },
      ${ QueryJoins.insOuts }
    )
  `;
      return this.getUserSession$().pipe(
        switchMap(user =>
          rxFrom(
            this.supabase.from(DbPaths.user_modules)
              .select(columns)
              // only approved panels
              .filter(`${ prefix }.${ DbPaths.module_panels }.isApproved`, 'eq', true)
              // order panel by color
              .order(`color`, {
                foreignTable: panelsTable,
                ascending: true
              })
              .limit(1, {foreignTable: panelsTable})
              .filter('profileid', 'eq', user.id)
          ).pipe(
            switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
            map((x: any) => x), // map type as any , TODO: fix this
            map((x => x.data.map(y => y.module)))
          )
        ),
      );
    }
    ,
    patchConnections: (patchid: number) => rxFrom(
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
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
        map((x: any) => x), // map type as any , TODO: fix this
        map((x => x.data))
      )
    ,
    
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
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
        map((x: any) => x),// map type as any , TODO: fix this
      ),
    userPatches: () => {
      return this.getUserSession$().pipe(
        switchMap(user => rxFrom(
            this.supabase.from(DbPaths.patches)
              .select(`*, ${ QueryJoins.author }`)
              .filter('authorid', 'eq', user.id)
              .order('updated', {ascending: false})
          ).pipe(
          switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
            map((x: any) => x), // map type as any , TODO: fix this
            map((x => x.data))
          )
        ),
      );
    },
    // if authorid is not provided, we will run it for the current user
    userRacks: (authorid?: string) => rxFrom(this.getUserSession$()
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
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
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
    modulesFull: (from = 0, to: number = this.defaultPag, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.modules)
        .select(`${ columns },
          ${ QueryJoins.manufacturer },
          ${ QueryJoins.insOuts },
          ${ QueryJoins.standard },
          ${ QueryJoins.module_tags },
          ${ QueryJoins.module_panels }
          `)
        .range(from, to)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
      .pipe(map((x => x.data))),
    tags: () => rxFrom(
      this.supabase.from(DbPaths.tags)
        .select('*')
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
      .pipe(map((x => x.data))),
    modulesMinimal: (
      from = 0,
      to: number = this.defaultPag,
      name?: string,
      orderBy?: string,
      orderDirection?: string,
      manufacturerId?: number,
      withHP?: number,
      withHpCondition?: "=" | ">" | "<" | ">=" | "<=" | "!=" | undefined,
      onlyPublic = true
    ) => {
      let query = this.supabase.from(DbPaths.modules)
        .select(`
                              id,name,hp,description,public,created,updated,
                              ${ QueryJoins.manufacturer },
                              ${ QueryJoins.standard },
                              ${ QueryJoins.module_panels },
                              ${ QueryJoins.module_tags }
                            `, {count: 'exact'})
      
      if (onlyPublic) {
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
      
      
      return rxFrom(
        query.filter(`${ DbPaths.module_panels }.isApproved`, 'eq', true) // only approved panels
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
          switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
          map((x: any) => x), // map type as any , TODO: fix this
        )
    },
    racksMinimal: (from = 0, to: number = this.defaultPag, name?: string, orderBy?: string, orderDirection?: string) => rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`id,name,hp,rows,description,created,updated,authorid,${ QueryJoins.author }`, {count: 'exact'})
        .ilike(`name,hp,rows, ${ QueryJoins.author }`, `%${ name }%`)
        .range(from, to)
        .order(orderBy ? orderBy : 'name', {ascending: orderDirection === 'asc'})
    )
      .pipe(
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
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
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
        map((x: any) => x)// map type as any , TODO: fix this
      )
    ,
    moduleWithId: (id: number, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.modules)
        .select(`${ columns },
           ${ QueryJoins.manufacturer },
            ${ QueryJoins.standard },
            ${ QueryJoins.insOuts },
            ${ QueryJoins.module_tags },
            ${ QueryJoins.module_panels }
            `)
        .filter('id', 'eq', id)
        .filter(`${ DbPaths.module_panels }.isApproved`, 'eq', true) // only approved panels
        .order(`color`, {                                // order panel by color
          foreignTable: DbPaths.module_panels,
          ascending: true
        })
        // .limit(1, {                                // take only one panel
        //   foreignTable: DatabasePaths.module_panels
        // })
        .order('id', {foreignTable: DbPaths.moduleINs})
        .order('id', {foreignTable: DbPaths.moduleOUTs})
        .single()
    )
      .pipe(
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
        map((x: any) => x)// map type as any , TODO: fix this
      ),
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
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
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
        .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)));
      
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
        .filter(`${ DbPaths.module_panels }.isApproved`, 'eq', true) // only approved panels
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
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
        map((x: any) => x),// map type as any , TODO: fix this
        map((x => x.data))
      ),
    rackWithId: (id: number, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.racks)
        // .select(`${ columns }, manufacturer:manufacturerId(name), ${ QueryJoins.insOuts }`)
        .select(`${ columns }, ${ QueryJoins.author }`)
        // .range(from, to)
        .filter('id', 'eq', id)
        // .order('id', {foreignTable: DatabasePaths.moduleINs})
        // .order('id', {foreignTable: DatabasePaths.moduleOUTs})
        .single()
    )
      .pipe(
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
        map((x: any) => x)// map type as any , TODO: fix this
      ),
    manufacturerWithId: (id: number, from = 0, to: number = this.defaultPag, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.manufacturers)
        .select(columns)
        .range(from, to)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
    manufacturers: (from = 0, to = this.defaultPag, columns = '*', orderBy?: string) => rxFrom(
      this.supabase.from(DbPaths.manufacturers)
        .select(columns)
        .range(from, to)
        .order(orderBy ? orderBy : 'name')
    )
      .pipe(
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
        map((x: any) => x),// map type as any , TODO: fix this
      ),
    standards: () => rxFrom(
      this.supabase.from(DbPaths.standards)
        .select('*')
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
    userWithId: (id: string, columns = '*') => rxFrom(
      this.supabase.from(DbPaths.profiles)
        .select(columns)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
    statistics: () => zip(
      rxFrom(
        this.supabase.from(DbPaths.modules)
          .select('id', {count: 'exact'})
      )
        .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
        .pipe(map(((x: any) => x.count))),
      rxFrom(
        this.supabase.from(DbPaths.racks)
          .select('id', {count: 'exact'})
      )
        .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
        .pipe(map(((x: any) => x.count))),
      rxFrom(
        this.supabase.from(DbPaths.patches)
          .select('id', {count: 'exact'})
      )
        .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
        .pipe(map(((x: any) => x.count)))
    )
    
  };
  
  delete = {
    userModule: (id: number) => this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase.from(DbPaths.user_modules)
          .delete()
          .filter('profileid', 'eq', user.id)
          .filter('moduleid', 'eq', id)
      )),
      switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))
    )
    ,
    rackedModule: (id: number) => rxFrom(
      this.supabase.from(DbPaths.rack_modules)
        .delete()
        .filter('id', 'eq', id)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
    ,
    modulesOfRack: (rackId: number) => rxFrom(
      this.supabase.from(DbPaths.rack_modules)
        .delete()
        .filter('rackid', 'eq', rackId)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
    ,
    patch: (id: number) => rxFrom(
      this.supabase.from(DbPaths.patches)
        .delete()
        // .filter('profileid', 'eq', this.getUser().id)
        .filter('id', 'eq', id)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
    ,
    patchConnectionsForPatch: (id: number) => rxFrom(
      this.supabase.from(DbPaths.patch_connections)
        .delete()
        .filter('patchid', 'eq', id)
      // .filter('moduleid', 'eq', id)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
    ,
    userPatch: (id: number) => this.getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          this.supabase.from(DbPaths.patches)
            .delete()
            .filter('authorid', 'eq', user.id)
            .filter('id', 'eq', id)
        )),
        switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))
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
        switchMap((x) => (x.error ? this.throwAsyncError('errorMessageToCustomize') : of(x))),
        this.errorMsg()
      )
    ,
    modules: (from = 0, to: number = this.defaultPag) => rxFrom(
      this.supabase.from(DbPaths.modules)
        .delete()
        .range(from, to)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x))),
    manufacturers: (from = 0, to = this.defaultPag) => rxFrom(
      this.supabase.from(DbPaths.manufacturers)
        .delete()
        .range(from, to)
    )
      .pipe(switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)))
  };
  
  
  private errorMsg() {
    return SharedConstants.errorHandlerOperation(this.snackBar);
  }
  
  private throwAsyncError(message: string) {
    return throwError(() => new Error(message));
  }
  
  update = {
    module: (data: DbModule) => {
      data.manufacturer = undefined;
      data.ins = undefined;
      data.outs = undefined;
      data.tags = undefined; // todo handle tags
      data.panels = undefined;
      data.updated = new Date().toISOString();
      
      return rxFrom(
        this.supabase.from(DbPaths.modules)
          .update(data)
          .eq('id', data.id)
        // .single()
      )
        .pipe(tap(() => SharedConstants.showSuccessUpdate(this.snackBar)));
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
          switchMap(x => x.error ? this.throwAsyncError(x.error.message) : of(x)),
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
            locked: data.locked
          }).select('id')
      );
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
        .pipe(tap(() => SharedConstants.showSuccessUpdate(this.snackBar)));
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
        .pipe(tap(() => SharedConstants.showSuccessUpdate(this.snackBar)));
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
          catchError(err => this.standardErrorMessageAndBlock()),
          tap(() => SharedConstants.showSuccessUpdate(this.snackBar))
        );
    },
    patchConnections: (data: PatchConnection[]) => this.buildPatchConnectionInserter(data)
      .pipe(tap(x => SharedConstants.showSuccessUpdate(this.snackBar)))
  };
  
  private standardErrorMessageAndBlock(): Observable<never> {
    SharedConstants.errorHandlerOperation(this.snackBar);
    return NEVER;
  }
  
  
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
        .pipe(map(x => filenameAndExtension));
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