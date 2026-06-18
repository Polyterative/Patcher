import { SupabaseClient } from '@supabase/supabase-js';
import {
  firstValueFrom,
  from as rxFrom,
  Observable,
  throwError,
  timeout
} from 'rxjs';
import {
  switchMap,
  take
} from 'rxjs/operators';
import { Database } from 'src/backend/database.types';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBust
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import {
  SupabaseTableRow,
} from './supabase-db.types';

export interface MergeModuleResult {
  sourceId: number;
  targetId: number;
  duplicateOwnershipRowsRemoved: number;
  duplicateTagRowsRemoved: number;
  ownershipRowsMoved: number;
  tagRowsMoved: number;
  rackModuleRowsMoved: number;
}

type MergeModuleRow = Pick<SupabaseTableRow<'modules'>, 'id' | 'name' | 'manufacturerId' | 'hp' | 'standard'>;
type UserModuleMergeRow = Pick<SupabaseTableRow<'user_modules'>, 'profileid' | 'kind'>;
type ModuleTagMergeRow = Pick<SupabaseTableRow<'module_tags'>, 'id' | 'tagid'>;
type RackModuleMergeRow = Pick<SupabaseTableRow<'rack_modules'>, 'id' | 'rackid' | 'row' | 'column'>;
type LooseSupabaseResponse = { data?: unknown[] | null; error?: unknown };
interface LooseSupabaseQuery extends PromiseLike<LooseSupabaseResponse> {
  select(columns: string): LooseSupabaseQuery;
  eq(column: string, value: number | string): LooseSupabaseQuery;
  limit(count: number): LooseSupabaseQuery;
  update(payload: Record<string, number>): LooseSupabaseQuery;
}

export function createMergeNamespace(
  supabase: SupabaseClient<Database>,
  getUserSession$: () => Observable<SimpleUserModel | null>,
  deleteModule: (id: number) => Observable<unknown>
) {
  return {
    moduleInto: (sourceId: number, targetId: number): Observable<MergeModuleResult> => getUserSession$().pipe(
      take(1),
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(mergeModuleInto(supabase, deleteModule, sourceId, targetId));
      }),
      cacheBust([
        'modules',
        'currentUserModules',
        'modulePossessionCounts',
        'moduleWithId',
        'currentUserComments',
        'rackWithId',
        'racksMinimal',
        'racksWithModule',
        'userModuleTags',
        'modulesBySameManufacturer',
        'moduleCollectionsByModule'
      ])
    )
  };
}

async function mergeModuleInto(
  supabase: SupabaseClient<Database>,
  deleteModule: (id: number) => Observable<unknown>,
  sourceId: number,
  targetId: number
): Promise<MergeModuleResult> {
  validateIds(sourceId, targetId);

  const modulesResponse = await supabase
    .from(DbPaths.modules as 'modules')
    .select('id,name,manufacturerId,hp,standard')
    .in('id', [sourceId, targetId]);
  throwIfSupabaseResponseError(modulesResponse);

  const modules = (modulesResponse.data ?? []) as MergeModuleRow[];
  const source = modules.find(module => module.id === sourceId);
  const target = modules.find(module => module.id === targetId);

  if (!source) {
    throw new Error(`Source module ${ sourceId } was not found.`);
  }
  if (!target) {
    throw new Error(`Target module ${ targetId } was not found.`);
  }

  await assertNoPatchPortBlockers(supabase, sourceId);

  const [sourceOwnership, targetOwnership, sourceTags, targetTags, sourceRackModules, targetRackModules] = await Promise.all([
    selectUserModules(supabase, sourceId),
    selectUserModules(supabase, targetId),
    selectModuleTags(supabase, sourceId),
    selectModuleTags(supabase, targetId),
    selectRackModules(supabase, sourceId),
    selectRackModules(supabase, targetId)
  ]);

  assertNoRackPlacementConflicts(sourceRackModules, targetRackModules, sourceId, targetId);

  const targetProfileIds = new Set(targetOwnership.map(row => row.profileid));
  const duplicateProfileIds = sourceOwnership
    .filter(row => targetProfileIds.has(row.profileid))
    .map(row => row.profileid);

  const duplicateOwnershipRowsRemoved = await deleteDuplicateOwnership(supabase, sourceId, duplicateProfileIds);

  const targetTagIds = new Set(targetTags.map(row => row.tagid));
  const duplicateModuleTagIds = sourceTags
    .filter(row => targetTagIds.has(row.tagid))
    .map(row => row.id);

  const duplicateTagRowsRemoved = await deleteDuplicateTags(supabase, duplicateModuleTagIds);
  const ownershipRowsMoved = await moveRowsToTarget(supabase, DbPaths.user_modules, sourceId, targetId, 'moduleid', 'profileid,kind,moduleid');
  const tagRowsMoved = await moveRowsToTarget(supabase, DbPaths.module_tags, sourceId, targetId, 'moduleid', 'id,tagid,moduleid');
  const rackModuleRowsMoved = await moveRowsToTarget(supabase, DbPaths.rack_modules, sourceId, targetId, 'moduleid', 'id,moduleid,rackid,row,column,selected_panel_id');

  await firstValueFrom(deleteModule(sourceId).pipe(
    timeout({
      first: 15000,
      with: () => throwError(() => new Error(`Timed out deleting source module ${ sourceId } after moving references. Check the source module before retrying.`))
    })
  ));

  return {
    sourceId,
    targetId,
    duplicateOwnershipRowsRemoved,
    duplicateTagRowsRemoved,
    ownershipRowsMoved,
    tagRowsMoved,
    rackModuleRowsMoved
  };
}

function validateIds(sourceId: number, targetId: number): void {
  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    throw new Error('Source module ID must be a positive integer.');
  }
  if (!Number.isInteger(targetId) || targetId <= 0) {
    throw new Error('Target module ID must be a positive integer.');
  }
  if (sourceId === targetId) {
    throw new Error('Target module must be different from the source module.');
  }
}

async function assertNoPatchPortBlockers(
  supabase: SupabaseClient<Database>,
  sourceId: number
): Promise<void> {
  const [ins, outs, patchInstances] = await Promise.all([
    selectFirstId(supabase, DbPaths.moduleINs, 'moduleid', sourceId),
    selectFirstId(supabase, DbPaths.moduleOUTs, 'moduleid', sourceId),
    selectFirstId(supabase, DbPaths.patch_module_instances, 'module_id', sourceId)
  ]);

  const blockers = [
    ins ? 'module_ins' : null,
    outs ? 'module_outs' : null,
    patchInstances ? 'patch_module_instances' : null
  ].filter(Boolean);

  if (blockers.length > 0) {
    throw new Error(`Merge aborted before writes: source module ${ sourceId } has ${ blockers.join(', ') } rows. Use the manual duplicate-module merge workflow for patch-port remapping.`);
  }
}

async function selectFirstId(
  supabase: SupabaseClient<Database>,
  table: typeof DbPaths.moduleINs | typeof DbPaths.moduleOUTs | typeof DbPaths.patch_module_instances,
  column: 'moduleid' | 'module_id',
  sourceId: number
): Promise<boolean> {
  const response = await fromLoose(supabase, table)
    .select('id')
    .eq(column, sourceId)
    .limit(1);
  throwIfSupabaseResponseError(response);
  return (response.data ?? []).length > 0;
}

async function selectUserModules(
  supabase: SupabaseClient<Database>,
  moduleId: number
): Promise<UserModuleMergeRow[]> {
  const response = await supabase
    .from(DbPaths.user_modules as 'user_modules')
    .select('profileid,kind')
    .eq('moduleid', moduleId);
  throwIfSupabaseResponseError(response);
  return (response.data ?? []) as UserModuleMergeRow[];
}

async function selectModuleTags(
  supabase: SupabaseClient<Database>,
  moduleId: number
): Promise<ModuleTagMergeRow[]> {
  const response = await supabase
    .from(DbPaths.module_tags as 'module_tags')
    .select('id,tagid')
    .eq('moduleid', moduleId);
  throwIfSupabaseResponseError(response);
  return (response.data ?? []) as ModuleTagMergeRow[];
}

async function selectRackModules(
  supabase: SupabaseClient<Database>,
  moduleId: number
): Promise<RackModuleMergeRow[]> {
  const response = await supabase
    .from(DbPaths.rack_modules as 'rack_modules')
    .select('id,rackid,row,column')
    .eq('moduleid', moduleId);
  throwIfSupabaseResponseError(response);
  return (response.data ?? []) as RackModuleMergeRow[];
}

function assertNoRackPlacementConflicts(
  sourceRows: RackModuleMergeRow[],
  targetRows: RackModuleMergeRow[],
  sourceId: number,
  targetId: number
): void {
  const targetPositions = new Set(targetRows.map(rackPositionKey));
  const conflicts = sourceRows.filter(row => targetPositions.has(rackPositionKey(row)));
  if (conflicts.length === 0) {
    return;
  }

  throw new Error(`Merge aborted before writes: source module ${ sourceId } has ${ conflicts.length } rack placement(s) that overlap target module ${ targetId }. Move or remove the conflicting target/source placements first.`);
}

function rackPositionKey(row: RackModuleMergeRow): string {
  return `${ row.rackid }:${ row.row }:${ row.column }`;
}

async function deleteDuplicateOwnership(
  supabase: SupabaseClient<Database>,
  sourceId: number,
  duplicateProfileIds: string[]
): Promise<number> {
  if (duplicateProfileIds.length === 0) return 0;

  const response = await supabase
    .from(DbPaths.user_modules as 'user_modules')
    .delete()
    .eq('moduleid', sourceId)
    .in('profileid', duplicateProfileIds)
    .select('profileid');
  throwIfSupabaseResponseError(response);
  return (response.data ?? []).length;
}

async function deleteDuplicateTags(
  supabase: SupabaseClient<Database>,
  duplicateModuleTagIds: number[]
): Promise<number> {
  if (duplicateModuleTagIds.length === 0) return 0;

  const response = await supabase
    .from(DbPaths.module_tags as 'module_tags')
    .delete()
    .in('id', duplicateModuleTagIds)
    .select('id');
  throwIfSupabaseResponseError(response);
  return (response.data ?? []).length;
}

async function moveRowsToTarget(
  supabase: SupabaseClient<Database>,
  table: typeof DbPaths.user_modules | typeof DbPaths.module_tags | typeof DbPaths.rack_modules,
  sourceId: number,
  targetId: number,
  moduleColumn: 'moduleid',
  selectColumns: string
): Promise<number> {
  const response = await fromLoose(supabase, table)
    .update({ [moduleColumn]: targetId })
    .eq(moduleColumn, sourceId)
    .select(selectColumns);
  throwIfSupabaseResponseError(response);
  return (response.data ?? []).length;
}

function throwIfSupabaseResponseError(response: { error?: unknown }): void {
  if (response.error) {
    throw response.error;
  }
}

function fromLoose(supabase: SupabaseClient<Database>, table: string): LooseSupabaseQuery {
  return (supabase.from as unknown as (tableName: string) => LooseSupabaseQuery)(table);
}
