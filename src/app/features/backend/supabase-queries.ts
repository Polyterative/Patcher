import {
  forkJoin,
  from as rxFrom,
  Observable,
  of
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


interface ManufacturerModuleStats {
  moduleCount: number;
  latestModuleUpdatedAt: string | null;
  latestModuleUpdatedAtMs: number | null;
  changedModulesLast30Days: number;
}

export interface CurrentUserContributorStats {
  modulesSubmitted: number;
  approvedModules: number;
  pendingModules: number;
  commentsPosted: number;
  moduleFlagsSubmitted: number;
}

export interface PublicUserContributorStats {
  approvedPublicModules: number;
}

export interface PublicApplicationStatistics {
  publicModules: number;
  publicRacks: number;
  publicPatches: number;
}

type ModuleActivityRow = {
  manufacturerId: number;
  updated: string
};


export class SupabaseQueriesService {
  private static readonly PUBLIC_AUTHOR_GATE_ALIAS = 'author_profile_gate';
  private static readonly MAX_QUERY_ROWS = 500;
  
  private static readonly EMPTY_STATS: ManufacturerModuleStats = {
    moduleCount: 0,
    latestModuleUpdatedAt: null,
    latestModuleUpdatedAtMs: null,
    changedModulesLast30Days: 0
  };

  private static readonly EMPTY_CONTRIBUTOR_STATS: CurrentUserContributorStats = {
    modulesSubmitted: 0,
    approvedModules: 0,
    pendingModules: 0,
    commentsPosted: 0,
    moduleFlagsSubmitted: 0
  };

  constructor(
    private supabase: SupabaseClient<Database>,
    private getUserSession$: () => Observable<SimpleUserModel | null>,
    private defaultPag: number
  ) {
  }

  private countRows(
    table:
      | typeof DbPaths.modules
      | typeof DbPaths.comments
      | typeof DbPaths.module_flags
      | typeof DbPaths.racks
      | typeof DbPaths.patches,
    applyFilters: (query: any) => any
  ): Observable<number> {
    return rxFrom(
      applyFilters(this.supabase.from(table))
    ).pipe(
      remapErrors(),
      map((result: any) => result.count ?? 0)
    );
  }

  private stripPublicAuthorGate<T>(response: any) {
    const gateAlias = SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS;
    const data = Array.isArray(response?.data)
      ? response.data.map((row: any) => {
        if (!row || typeof row !== 'object') {
          return row;
        }
        const {
          [gateAlias]: _gate,
          ...sanitizedRow
        } = row;
        return sanitizedRow as T;
      })
      : response?.data;

    return {
      ...response,
      data
    };
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
    description?: string,
    onlyPublic = true,
    tagIds?: number[]) {
    const hasTagFilter = tagIds && tagIds.length > 0;
    const moduleTagsJoin = hasTagFilter
      ? `tags:${ DbPaths.module_tags }!inner(id,tag:${ DbPaths.tags }(*),voteCount:${ DbPaths.user_module_tags }(moduletagid))`
      : QueryJoins.module_tags;

    let query = this.supabase.from(DbPaths.modules)
      .select(`
                              id,name,hp,description,public,created,updated,
                              ${ QueryJoins.manufacturer },
                              ${ QueryJoins.standard },
                              ${ QueryJoins.module_panels },
                              ${ moduleTagsJoin }
                            `, {count: 'exact'});
    
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
    
    if (hasTagFilter) {
      query = (query as any).filter(`${ DbPaths.module_tags }.tagid`, 'in', `(${ tagIds.join(',') })`);
    }
    
    
    return rxFrom(
      query
        .order(`color`, {foreignTable: DbPaths.module_panels, ascending: true})
        .limit(1, {foreignTable: DbPaths.module_panels})
        .ilike('name', `%${ normalizeForSearch(name) }%`)
        .range(from, to)
        .order(orderBy ? orderBy : 'name', {ascending: orderDirection === 'asc'})
    )
      .pipe(
        remapErrors()
      );
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
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getUserPatchesPaginated(from = 0, to: number = this.defaultPag) {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase.from(DbPaths.patches)
          .select(`*, ${ QueryJoins.author }`, {count: 'exact'})
          .filter('authorid', 'eq', user.id)
          .order('updated', {ascending: false})
          .range(from, to)
      )),
      remapErrors(),
    );
  }

  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getPublicUserPatchesPaginated(authorId: string, from = 0, to: number = this.defaultPag) {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);

    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`*, ${ QueryJoins.author }, ${ publicAuthorGateJoin }`, {count: 'exact'})
        .filter('authorid', 'eq', authorId)
        .filter('public', 'eq', true)
        .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
        .order('updated', {ascending: false})
        .range(from, to)
    ).pipe(
      remapErrors(),
      map(response => this.stripPublicAuthorGate<Patch>(response))
    );
  }

  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getUserRacksPaginated(from = 0, to: number = this.defaultPag) {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase.from(DbPaths.racks)
          .select(`*, ${ QueryJoins.author }`, {count: 'exact'})
          .filter('authorid', 'eq', user.id)
          .order('updated', {ascending: false})
          .range(from, to)
      )),
      remapErrors(),
    );
  }

  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('racksMinimal'))),
    maxCacheCount: 50,
  })
  getPublicUserRacksPaginated(authorId: string, from = 0, to: number = this.defaultPag) {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);

    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`*, ${ QueryJoins.author }, ${ publicAuthorGateJoin }`, {count: 'exact'})
        .filter('authorid', 'eq', authorId)
        .filter('public', 'eq', true)
        .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
        .order('updated', {ascending: false})
        .range(from, to)
    ).pipe(
      remapErrors(),
      map(response => this.stripPublicAuthorGate<Rack>(response))
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
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
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
            .select(`*,profile:profiles(id,username)`, {count: 'exact'})
            .filter('authorId', 'eq', user.id)
            .order('created', {ascending: false})
            .range(from, to)
        )),
        remapErrors(),
      );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('modules')
      || x.includes('comments')
      || x.includes('module_flags')
    )),
    maxCacheCount: 50,
  })
  getCurrentUserContributorStats(): Observable<CurrentUserContributorStats> {
    return this.getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user?.id) {
            return of(SupabaseQueriesService.EMPTY_CONTRIBUTOR_STATS);
          }

          return forkJoin({
            modulesSubmitted: this.countRows(
              DbPaths.modules,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('submitter', 'eq', user.id)
            ),
            approvedModules: this.countRows(
              DbPaths.modules,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('submitter', 'eq', user.id)
                .filter('isApproved', 'eq', true)
            ),
            commentsPosted: this.countRows(
              DbPaths.comments,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('authorId', 'eq', user.id)
            ),
            moduleFlagsSubmitted: this.countRows(
              DbPaths.module_flags,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('user_id', 'eq', user.id)
            ),
          }).pipe(
            map((stats) => ({
              ...stats,
              pendingModules: Math.max(stats.modulesSubmitted - stats.approvedModules, 0)
            }))
          );
        })
      );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules'))),
    maxCacheCount: 50,
  })
  getPublicUserContributorStats(authorId: string): Observable<PublicUserContributorStats> {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);

    return this.countRows(
      DbPaths.modules,
      query => query
        .select(`id, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
        .filter('submitter', 'eq', authorId)
        .filter('public', 'eq', true)
        .filter('isApproved', 'eq', true)
        .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
    ).pipe(
      map((approvedPublicModules) => ({approvedPublicModules}))
    );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('modules')
      || x.includes('patches')
      || x.includes('rackWithId')
      || x.includes('racksMinimal')
    )),
    maxCacheCount: 20,
  })
  getApplicationStatistics(): Observable<PublicApplicationStatistics> {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);
    const connectedPatchJoin = 'patch_connections!inner(patchid)';

    return forkJoin({
      publicModules: this.countRows(
        DbPaths.modules,
        query => query
          .select('id', {count: 'exact', head: true})
          .filter('public', 'eq', true)
      ),
      publicRacks: this.countRows(
        DbPaths.racks,
        query => query
          .select(`id, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
      ),
      publicPatches: this.countRows(
        DbPaths.patches,
        query => query
          .select(`id, ${ connectedPatchJoin }, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
      )
    });
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

    if (name) {
      queryBuilder = queryBuilder.ilike('name', `%${ normalizeForSearch(name) }%`);
    }

    return rxFrom(queryBuilder.range(from, to))
      .pipe(
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
      .select(columns)
      .filter('id', 'eq', id);
    
    if (columns.includes(QueryJoins.module_panels)) {
      queryBuilder$ = queryBuilder$.order(`color`, {
        referencedTable: DbPaths.module_panels,
        ascending: true
      });
    }
    
    if (columns.includes(QueryJoins.insOuts)) {
      queryBuilder$ = queryBuilder$
        .order('id', {referencedTable: DbPaths.moduleINs})
        .order('id', {referencedTable: DbPaths.moduleOUTs});
    }
    
    
    return rxFrom(queryBuilder$.single())
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
  getComments(
    entityId: number,
    entityType: number,
    from = 0,
    to = 24
  ): Observable<{ data: DbComment[] | null; count: number | null }> {
    return rxFrom(
      this.supabase.from(DbPaths.comments)
        .select(`*,profile:profiles(id,username)`, { count: 'exact' })
        .filter('entityId', 'eq', entityId)
        .filter('entityType', 'eq', entityType)
        .order('created', { ascending: false })
        .range(from, to)
    )
      .pipe(
        remapErrors(),
        map(x => ({ data: x.data, count: x.count }))
      );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('manufacturers'))),
  })
  getManufacturers(from = 0, to = this.defaultPag, columns = '*', orderBy?: string) {
    return rxFrom(
      this.fetchManufacturersRange(
        this.normalizePaginationBound(from),
        this.normalizePaginationBound(to, this.defaultPag),
        columns,
        orderBy ? orderBy : 'name'
      )
    )
      .pipe(
        remapErrors()
      );
  }

  private async fetchManufacturersRange(
    from: number,
    to: number,
    columns: string,
    orderBy: string
  ): Promise<{ data: any[]; error: null; count: number | null } | { data: any[] | null; error: any; count: number | null }> {
    const safeTo = Math.max(from, to);
    const data: any[] = [];
    let count: number | null = null;

    for (let chunkFrom = from; chunkFrom <= safeTo; chunkFrom += SupabaseQueriesService.MAX_QUERY_ROWS) {
      const chunkTo = Math.min(chunkFrom + SupabaseQueriesService.MAX_QUERY_ROWS - 1, safeTo);
      const response = await this.supabase.from(DbPaths.manufacturers)
        .select(columns, {count: 'exact'})
        .range(chunkFrom, chunkTo)
        .order(orderBy);

      if (response.error) {
        return {
          data: response.data,
          error: response.error,
          count: response.count ?? count
        };
      }

      if (count === null) {
        count = response.count ?? null;
      }

      const chunkData = Array.isArray(response.data) ? response.data : [];
      data.push(...chunkData);

      if (chunkData.length < (chunkTo - chunkFrom + 1)) {
        break;
      }
    }

    return {
      data,
      error: null,
      count
    };
  }

  private normalizePaginationBound(value: number | undefined, fallback: number = 0): number {
    const normalized = Number.isFinite(value) ? Math.trunc(value as number) : fallback;
    return Math.max(0, normalized);
  }
  
  getManufacturersPaginated(
    from: number = 0,
    to?: number,
    name?: string,
    orderBy: string = 'name',
    orderDirection: string = 'asc'
  ) {
    const effectiveTo = to ?? this.defaultPag;
    const normalizedName = normalizeForSearch((name ?? '').trim());
    
    if (orderBy === 'module_updated') {
      return this.getManufacturersPaginatedByModuleActivity(
        from,
        effectiveTo,
        normalizedName,
        orderDirection
      );
    }
    
    let query = this.supabase.from(DbPaths.manufacturers)
      .select('id,name,logo,websiteURL,adminUser', {count: 'exact'})
      .range(from, effectiveTo)
      .order(orderBy, {ascending: orderDirection === 'asc'});
    
    if (normalizedName.length > 0) {
      query = query.ilike('name', `%${ normalizedName }%`);
    }
    
    return rxFrom(query).pipe(
      remapErrors(),
      switchMap((response: any) => {
        const manufacturers = Array.isArray(response?.data) ? response.data : [];
        if (manufacturers.length === 0) {
          return rxFrom(Promise.resolve(response));
        }
        
        const manufacturerIds = manufacturers
          .map((x: any) => x.id)
          .filter((id: unknown): id is number => typeof id === 'number');
        if (manufacturerIds.length === 0) {
          return rxFrom(Promise.resolve(response));
        }
        
        return rxFrom((async () => {
          const modulesActivityResponse = await this.fetchAllModuleActivityRowsForManufacturers(manufacturerIds);
          if (modulesActivityResponse.error) {
            return {
              ...response,
              error: modulesActivityResponse.error
            };
          }
          const statsByManufacturerId = this.buildManufacturerModuleStats(modulesActivityResponse.data);
          return {
            ...response,
            data: manufacturers.map((manufacturer: any) =>
              this.withManufacturerModuleStats(
                manufacturer,
                statsByManufacturerId.get(manufacturer.id)
              )
            )
          };
        })());
      })
    );
  }
  
  private getManufacturersPaginatedByModuleActivity(
    from: number,
    to: number,
    normalizedName: string,
    orderDirection: string
  ) {
    return rxFrom((async () => {
      let manufacturersQuery = this.supabase.from(DbPaths.manufacturers)
        .select('id,name,logo,websiteURL,adminUser', {count: 'exact'})
        .order('name', {ascending: true});
      
      if (normalizedName.length > 0) {
        manufacturersQuery = manufacturersQuery.ilike('name', `%${ normalizedName }%`);
      }
      
      const manufacturersResponse = await manufacturersQuery;
      if (manufacturersResponse.error) {
        return manufacturersResponse;
      }
      
      const manufacturers = manufacturersResponse.data ?? [];
      if (manufacturers.length === 0) {
        return {
          ...manufacturersResponse,
          count: manufacturersResponse.count ?? 0,
          data: []
        };
      }
      
      const manufacturerIds = manufacturers
        .map(x => x.id)
        .filter((id): id is number => typeof id === 'number');
      
      if (manufacturerIds.length === 0) {
        return {
          ...manufacturersResponse,
          count: manufacturersResponse.count ?? 0,
          data: []
        };
      }
      
      const effectiveOrderDirection: 'asc' | 'desc' = orderDirection === 'asc' ? 'asc' : 'desc';
      const modulesActivityResponse = await this.fetchAllModuleActivityRowsGlobally(
        effectiveOrderDirection
      );
      if (modulesActivityResponse.error) {
        return {
          ...manufacturersResponse,
          error: modulesActivityResponse.error
        };
      }
      
      const allowedManufacturerIds = new Set<number>(manufacturerIds);
      const filteredActivityRows = modulesActivityResponse.data
        .filter((row) => allowedManufacturerIds.has(row.manufacturerId));
      
      const statsByManufacturerId = this.buildManufacturerModuleStats(filteredActivityRows);
      const activityRankByManufacturerId = this.buildManufacturerActivityRank(filteredActivityRows);
      const sortedManufacturers = [...manufacturers].sort((a, b) =>
        this.compareManufacturersByLatestModuleActivity(
          a,
          b,
          activityRankByManufacturerId
        )
      );
      const pagedManufacturers = sortedManufacturers
        .slice(from, to + 1)
        .map((manufacturer: any) =>
          this.withManufacturerModuleStats(
            manufacturer,
            statsByManufacturerId.get(manufacturer.id)
          )
        );

      return {
        ...manufacturersResponse,
        count: manufacturersResponse.count ?? manufacturers.length,
        data: pagedManufacturers
      };
    })());
  }
  
  private async fetchAllModuleActivityRows(
    orderDirection: 'asc' | 'desc' = 'desc',
    manufacturerIds?: number[]
  ): Promise<{
    data: {
      manufacturerId: number;
      updated: string
    }[];
    error: any
  }> {
    const pageSize = 1000;
    const rows: {
      manufacturerId: number;
      updated: string
    }[] = [];
    const chunkSize = 200;
    
    const idChunks: (number[] | null)[] = manufacturerIds
      ? Array.from({length: Math.ceil(manufacturerIds.length / chunkSize)}, (_, i) =>
        manufacturerIds.slice(i * chunkSize, (i + 1) * chunkSize))
      : [null]; // null means "no IN filter" (global fetch)
    
    for (const chunk of idChunks) {
      let offset = 0;
      while (true) {
        let q = this.supabase.from(DbPaths.modules)
          .select('id,manufacturerId,updated')
          .order('updated', {ascending: orderDirection === 'asc'})
          .order('id', {ascending: orderDirection === 'asc'})
          .range(offset, offset + pageSize - 1);
        
        if (chunk) { q = q.in('manufacturerId', chunk); }
        
        const response = await q;
        if (response.error) { return {data: [], error: response.error}; }
        
        const pageRows = (response.data ?? []).map((x: any) => ({
          manufacturerId: x.manufacturerId,
          updated: x.updated
        }));
        rows.push(...pageRows);
        
        if (pageRows.length < pageSize) { break; }
        offset += pageSize;
      }
    }
    return {data: rows, error: null};
  }
  
  private async fetchAllModuleActivityRowsForManufacturers(
    manufacturerIds: number[],
    orderDirection: 'asc' | 'desc' = 'desc'
  ) {
    return this.fetchAllModuleActivityRows(orderDirection, manufacturerIds);
  }
  
  private async fetchAllModuleActivityRowsGlobally(orderDirection: 'asc' | 'desc' = 'desc') {
    return this.fetchAllModuleActivityRows(orderDirection);
  }
  
  private buildManufacturerActivityRank(rows: ModuleActivityRow[]): Map<number, number> {
    const rankByManufacturerId = new Map<number, number>();
    let rank = 0;
    
    for (const row of rows) {
      if (typeof row?.manufacturerId !== 'number') {
        continue;
      }
      if (!rankByManufacturerId.has(row.manufacturerId)) {
        rankByManufacturerId.set(row.manufacturerId, rank);
        rank += 1;
      }
    }
    
    return rankByManufacturerId;
  }
  
  private parseModuleUpdatedTimestampMs(rawUpdated: unknown): number | null {
    if (typeof rawUpdated !== 'string' || rawUpdated.trim().length === 0) { return null; }
    let s = rawUpdated.trim();
    // Normalise Postgres variants so Date.parse can handle them:
    // 1. Space separator → T  (e.g. "2026-03-01 10:00:00" → "2026-03-01T10:00:00")
    s = s.replace(' ', 'T');
    // 2. Truncate microseconds to milliseconds  (.123456 → .123)
    s = s.replace(/(\.\d{3})\d+/, '$1');
    // 3. Short UTC offset without minutes: +00 / -05 → +00:00 / -05:00
    s = s.replace(/([+-]\d{2})$/, '$1:00');
    // 4. Four-digit offset without colon: +0000 → +00:00
    s = s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const ms = Date.parse(s);
    return isNaN(ms) ? null : ms;
  }
  
  private buildManufacturerModuleStats(rows: ModuleActivityRow[]): Map<number, ManufacturerModuleStats> {
    const stats = new Map<number, ManufacturerModuleStats>();
    const thresholdMs = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    for (const row of rows) {
      if (typeof row?.manufacturerId !== 'number') {
        continue;
      }
      const current = stats.get(row.manufacturerId) ?? {...SupabaseQueriesService.EMPTY_STATS};
      current.moduleCount += 1;
      
      const updatedMs = this.parseModuleUpdatedTimestampMs(row.updated);
      if (updatedMs !== null) {
        if (current.latestModuleUpdatedAtMs === null || updatedMs > current.latestModuleUpdatedAtMs) {
          current.latestModuleUpdatedAtMs = updatedMs;
          current.latestModuleUpdatedAt = row.updated;
        }
        if (updatedMs >= thresholdMs) {
          current.changedModulesLast30Days += 1;
        }
      }
      
      stats.set(row.manufacturerId, current);
    }
    
    return stats;
  }
  
  private withManufacturerModuleStats(manufacturer: any, stats: ManufacturerModuleStats | undefined) {
    return {
      ...manufacturer,
      moduleCount: stats?.moduleCount ?? 0,
      latestModuleUpdatedAt: stats?.latestModuleUpdatedAt ?? null,
      changedModulesLast30Days: stats?.changedModulesLast30Days ?? 0
    };
  }
  
  private compareManufacturersByLatestModuleActivity(
    aManufacturer: any,
    bManufacturer: any,
    activityRankByManufacturerId: Map<number, number>
  ): number {
    const aRank = activityRankByManufacturerId.get(aManufacturer.id);
    const bRank = activityRankByManufacturerId.get(bManufacturer.id);
    const aHasModules = typeof aRank === 'number';
    const bHasModules = typeof bRank === 'number';
    const aName = (aManufacturer?.name ?? '').toString();
    const bName = (bManufacturer?.name ?? '').toString();
    
    // Keep manufacturers with modules before empty ones in both directions.
    if (aHasModules !== bHasModules) {
      return aHasModules ? -1 : 1;
    }
    
    if (!aHasModules || !bHasModules) {
      return aName.localeCompare(bName);
    }
    
    if (aRank !== bRank) {
      return (aRank as number) - (bRank as number);
    }
    
    return aName.localeCompare(bName);
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
    const prefix = `module`;
    const panelsTable: string = `${ prefix }.${ DbPaths.module_panels }`;
    
    
    const moduleColumns = `id,name,hp,description,public,created,updated,manufacturerId,standard,isApproved`;
    
    const columns = [
      moduleColumns,
      QueryJoins.manufacturer,
      QueryJoins.module_panels,
    ];
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
