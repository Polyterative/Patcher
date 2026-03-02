import {
  forkJoin,
  from as rxFrom,
  Observable,
  of,
  zip
} from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';
import {
  DbPaths,
  QueryJoins
} from './DatabaseStrings';
import { remapErrors } from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import { SupabaseQueriesService } from './supabase-queries';


export function createGetNamespace(
  supabase: SupabaseClient<Database>,
  queries: SupabaseQueriesService,
  defaultPag: number,
  getUserSession$: () => Observable<SimpleUserModel | null>
) {
  return {
    currentUserPatches: (): Observable<Patch[]> => getUserSession$().pipe(
      switchMap((user: SimpleUserModel | null) => user?.id
        ? queries.getCurrentUserPatchesForAuthor(user.id)
        : of([])
      )
    ),
    // if authorid is not provided, we will run it for the current user
    currentUserRacks: (authorid?: string): Observable<Rack[]> => {
      if (authorid) {
        return queries.getCurrentUserRacksForAuthor(authorid);
      }
      return getUserSession$().pipe(
        switchMap((user: SimpleUserModel | null) => user?.id
          ? queries.getCurrentUserRacksForAuthor(user.id)
          : of([])
        )
      );
    },
    rackedModules: (rackid: number) => rxFrom(
      supabase.from(DbPaths.rack_modules)
        .select(`*, ${ QueryJoins.module_fk_rackmodules }`)
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
    
    racksWithModule: (moduleid: number, from = 0, to: number = defaultPag, orderBy?: string, orderDirection?: 'asc' | 'desc') => rxFrom(
      supabase.from(DbPaths.rack_modules_grouped_by_moduleid)
        .select(`*,${ QueryJoins.rack }`, {count: 'exact'})
        .filter('moduleid', 'eq', moduleid)
        // postgrest show racks only once
        .range(from, to)
        .order(orderBy ? orderBy : 'updated', {ascending: orderDirection === 'asc'})
    )
      .pipe(
        remapErrors(),
      ),
    patchWithId: (id: number, columns = '*') => rxFrom(
      supabase.from(DbPaths.patches)
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(
        remapErrors()
      ),
    patchesWithModule: (moduleid: number, from = 0, to: number = defaultPag, orderBy?: string, orderDirection?: 'asc' | 'desc') => {
      const patchIdList$ = rxFrom(
        supabase.from(DbPaths.patches_for_modules)
          .select('moduleid,patchid', {count: 'exact'})
          .filter('moduleid', 'eq', moduleid)
          .range(from, to)
      );

      return patchIdList$.pipe(
        switchMap(x => {
            const getPatchData$ = forkJoin(
              x.data.map(resultFromView =>
                rxFrom(supabase.from(DbPaths.patches)
                  .select(`id,name,description,${ QueryJoins.author },updated,created `)
                  .filter('id', 'eq', resultFromView.patchid)
                  .filter('public', 'eq', true)
                  .maybeSingle())
                  .pipe(map(x => x.data))
              )
            ).pipe(map(results => results.filter(Boolean)));
            
            return x.data.length > 0 ? getPatchData$ : of([]);
          }
        )
      );
    },
    modulesBySameManufacturer: (manufacturerId: any, from = 0, to: number = defaultPag, columns = '*') => rxFrom(
      supabase.from(DbPaths.modules)
        .select(`${ columns },
          ${ QueryJoins.manufacturer },
          ${ QueryJoins.standard },
          ${ QueryJoins.module_panels },
          ${ QueryJoins.module_tags }
          `)
        .filter('manufacturerId', 'eq', manufacturerId)
        .limit(1, {foreignTable: DbPaths.module_panels})
        .order(`color`, {foreignTable: DbPaths.module_panels, ascending: true})
        .order('updated', {ascending: false})
        .order('id', {ascending: false})
        .range(from, to)
    )
      .pipe(
        remapErrors(),
        map((x => x.data))
      ),
    manufacturerWithId: (id: number, from = 0, to: number = defaultPag, columns = '*') => rxFrom(
      supabase.from(DbPaths.manufacturers)
        .select(columns)
        .range(from, to)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(remapErrors()),
    standards: () => rxFrom(
      supabase.from(DbPaths.standards)
        .select('*')
    )
      .pipe(
        remapErrors(),
      ),
    userWithId: (id: string, columns = '*') => rxFrom(
      supabase.from(DbPaths.profiles)
        .select(columns)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(remapErrors()),
    myVotes: () => queries.getMyVotes(),
    allTags: () => queries.getAllTagsCached(),
    tagVotesForModule: (moduleTagIds: number[]) => rxFrom(
      supabase
        .from(DbPaths.user_module_tags)
        .select('moduletagid')
        .in('moduletagid', moduleTagIds)
    ).pipe(
      remapErrors(),
      map(x => {
        const rows: {
          moduletagid: number
        }[] = (x.data as any) ?? [];
        const countMap = new Map<number, number>();
        for (const row of rows) {
          countMap.set(row.moduletagid, (countMap.get(row.moduletagid) ?? 0) + 1);
        }
        return Array.from(countMap.entries()).map(([moduleTagId, count]) => ({moduleTagId, count}));
      })
    ),
    statistics: () => zip(
      rxFrom(
        supabase.from(DbPaths.modules)
          .select('id', {count: 'exact'})
      )
        .pipe(remapErrors())
        .pipe(map(((x: any) => x.count))),
      rxFrom(
        supabase.from(DbPaths.racks)
          .select('id', {count: 'exact'})
      )
        .pipe(remapErrors())
        .pipe(map(((x: any) => x.count))),
      rxFrom(
        supabase.from(DbPaths.patches)
          .select('id', {count: 'exact'})
      )
        .pipe(remapErrors())
        .pipe(map(((x: any) => x.count)))
    )
  };
}
