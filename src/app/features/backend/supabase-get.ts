import {
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


export interface AdminFlagRow {
  id: number;
  module_id: number;
  module: { id: number; name: string };
  user_id: string;
  category: string;
  note: string | null;
  created_at: string;
  resolved: boolean;
}

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
    currentUserRacks: (): Observable<Rack[]> => getUserSession$().pipe(
      switchMap((user: SimpleUserModel | null) => user?.id
        ? queries.getCurrentUserRacksForAuthor(user.id)
        : of([])
      )
    ),
    currentUserContributorStats: () => queries.getCurrentUserContributorStats(),
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
            rackid: y.rackid,
            selectedPanelId: y.selected_panel_id ?? null
          }
        })))),
    
    racksWithModule: (moduleid: number, from = 0, to: number = defaultPag, orderBy?: string, orderDirection?: 'asc' | 'desc') =>
      queries.getRacksWithModule(moduleid, from, to, orderBy, orderDirection),
    patchWithId: (id: number, columns = '*') => rxFrom(
      supabase.from(DbPaths.patches)
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(
        remapErrors()
      ),
    patchesWithModule: (moduleid: number, from = 0, to: number = defaultPag, orderBy?: string, orderDirection?: 'asc' | 'desc') =>
      queries.getPatchesWithModule(moduleid, from, to, orderBy, orderDirection),
    moduleUsageSummary: (moduleid: number) => rxFrom(
      supabase.rpc('get_module_usage_summary_bucketed', {
        p_module_id: moduleid
      })
    ).pipe(
      remapErrors(),
      map((response: any) => response.data?.[0] ?? {
        public_rack_count: 0,
        hidden_rack_bucket: 'none',
        public_patch_count: 0,
        hidden_patch_bucket: 'none'
      })
    ),
    modulesBySameManufacturer: (manufacturerId: any, from = 0, to: number = defaultPag, columns = '*') =>
      queries.getModulesBySameManufacturer(manufacturerId, from, to, columns),
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
    publicProfileByUsername: (
      username: string,
      columns = 'id,username,public,website,avatar_url'
    ) => rxFrom(
      supabase.from(DbPaths.profiles)
        .select(columns)
        .filter('username', 'eq', username)
        .maybeSingle()
    ).pipe(remapErrors()),
    myVotes: () => queries.getMyVotes(),
    allTags: () => queries.getAllTagsCached(),
    modulePossessionCounts: (moduleId: number) => queries.getModulePossessionCounts(moduleId),
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
    moduleFlagCount: (moduleId: number) => rxFrom(
      supabase.rpc('get_module_open_flag_count', {p_module_id: moduleId})
    ).pipe(
      remapErrors(),
      map(x => ((x as any).data as number) ?? 0)
    ),
    allModuleFlags: () => rxFrom(
      supabase
        .from(DbPaths.module_flags)
        .select('*, module:module_id(id, name)')
        .order('resolved', {ascending: true})
        .order('created_at', {ascending: false})
    ).pipe(
      remapErrors(),
      map(x => ((x as any).data ?? []) as AdminFlagRow[])
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
