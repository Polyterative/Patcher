import {
  from as rxFrom,
  Observable
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
  remapErrors,
  smallCacheTime
} from './supabase.cache';
import {
  CurrentUserModulesOrderConfig,
  CurrentUserModulesOrderDirection,
  CurrentUserModulesOrderKey,
  SimpleUserModel
} from './supabase.types';
import { normalizeForSearch } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';


export class SupabaseQueriesService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private getUserSession$: () => Observable<SimpleUserModel | null>,
    private defaultPag: number
  ) {
  }
  
  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules'))),
    maxCacheCount: 50,
    // async: true
  })
  getModules(
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
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getCurrentUserPatchesForAuthor(authorid: string): Observable<Patch[]> {
    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`*, ${ QueryJoins.author }`)
        .filter('authorid', 'eq', authorid)
        .order('updated', {ascending: false})
    ).pipe(
      remapErrors(),
      map(x => (x.data as Patch[]) ?? [])
    );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getCurrentUserRacksForAuthor(authorid: string): Observable<Rack[]> {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`*, ${ QueryJoins.author }`)
        .filter('authorid', 'eq', authorid)
        .order('updated', {ascending: false})
    ).pipe(
      remapErrors(),
      map(x => (x.data as Rack[]) ?? [])
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
  getRacksMinimal(
    from: number = 0,
    to?: number,
    name?: string,
    orderBy?: string,
    orderDirection?: string
  ) {
    const effectiveTo = to ?? this.defaultPag;
    const normalizedName = normalizeForSearch((name ?? '').trim());
    
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
    
    let query = this.supabase.from(DbPaths.racks)
      .select(`${ columns }, rack_modules!inner(rackid)`, {count: "exact"})
      .filter("public", "eq", true)
      .range(from, effectiveTo)
      .order(orderBy ? orderBy : "name", {ascending: orderDirection === "asc"});
    
    if (normalizedName.length > 0) {
      query = query.ilike('name', `%${ normalizedName }%`);
    }
    
    return rxFrom(query)
      .pipe(
        remapErrors(),
      );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('currentUserComments'))),
    maxCacheCount: 50,
  })
  getCurrentUserComments(
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
  getPatches(
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
  getPatchConnections(patchid: number) {
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
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patchModuleInstances'))),
    maxCacheCount: 50,
    async: true
  })
  getPatchModuleInstances(patch_id: number) {
    return rxFrom(
      this.supabase.from(DbPaths.patch_module_instances)
        .select('id,patch_id,module_id,instance_label,module:modules(name,manufacturer:manufacturers(name))')
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
  getModuleWithId(id: number, columns = `*,
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
  getComments(entityId: number, entityType: number): Observable<DbComment[] | null | undefined> {
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
  getManufacturers(from = 0, to = this.defaultPag, columns = '*', orderBy?: string) {
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
  getCurrentUserModules(
    includeInsOuts = true,
    includeManuals = false,
    orderConfig?: Partial<CurrentUserModulesOrderConfig>,
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
    
    const safeOrderConfig = this.getSafeCurrentUserModulesOrderConfig(orderConfig);
    
    return this.getUserSession$().pipe(
      switchMap(user => {
        let queryBuilder = this.supabase.from(DbPaths.user_modules)
          .select(
            `collectionUpdated:updated,
              ${ prefix }:modules!user_modules_moduleid_fkey(
                ${ columns.join(',') })`
          )
          // only approved panels
          // .filter(`${ prefix }.${ DbPaths.module_panels }.isApproved`, 'eq', true)
          // order panel by color
          .order(`color`, {
            foreignTable: panelsTable,
            ascending: true
          })
          .limit(1, {foreignTable: panelsTable})
          .filter('profileid', 'eq', user.id);
        
        if (safeOrderConfig.key === 'moduleName') {
          queryBuilder = queryBuilder
            .order('name', {
              foreignTable: prefix,
              ascending: safeOrderConfig.direction === 'asc'
            })
            .order('id', {
              foreignTable: prefix,
              ascending: true
            });
        } else {
          queryBuilder = queryBuilder
            .order('updated', {ascending: safeOrderConfig.direction === 'asc'})
            .order('name', {
              foreignTable: prefix,
              ascending: true
            })
            .order('id', {
              foreignTable: prefix,
              ascending: true
            });
        }
        
        return rxFrom(queryBuilder).pipe(
          remapErrors(),
          map((x: any) => (x.data ?? []).map((y: any) => ({
            ...y.module,
            collectionUpdated: y.collectionUpdated
          })))
        );
      }),
    );
  }
  
  private getSafeCurrentUserModulesOrderConfig(
    orderConfig?: Partial<CurrentUserModulesOrderConfig>
  ): CurrentUserModulesOrderConfig {
    const key: CurrentUserModulesOrderKey = orderConfig?.key === 'moduleName'
      ? 'moduleName'
      : 'collectionUpdated';
    
    const direction: CurrentUserModulesOrderDirection = orderConfig?.direction === 'asc'
      ? 'asc'
      : orderConfig?.direction === 'desc'
        ? 'desc'
        : key === 'moduleName'
          ? 'asc'
          : 'desc';
    
    return {key, direction};
  }
  
  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('userModuleTags'))),
  })
  getMyVotes(): Observable<number[]> {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase
          .from(DbPaths.user_module_tags)
          .select('moduletagid')
          .filter('authorid', 'eq', user.id)
      )),
      remapErrors(),
      map(x => ((x.data as any) ?? []).map((row: any) => row.moduletagid as number))
    );
  }
  
  getTags() {
    return rxFrom(
      this.supabase.from(DbPaths.tags)
        .select('*')
    )
      .pipe(
        // remapErrors(),
        map((x => x.data))
      );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
  })
  getAllTagsCached(): Observable<any[]> {
    return rxFrom(
      this.supabase.from(DbPaths.tags)
        .select('*')
        .order('type', {ascending: true})
        .order('name', {ascending: true})
    ).pipe(
      map((x: any) => (x.data ?? []))
    );
  }
}