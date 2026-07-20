import { SupabaseClient } from '@supabase/supabase-js';
import {
  forkJoin,
  from as rxFrom,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { Database } from 'src/backend/database.types';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBust,
  remapErrors,
  throwIfSupabaseError
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import {
  CommentableEntityTypes,
  deleteCommentRowsForEntities
} from './supabase-comments';

export function deleteAllUserData(
  supabase: SupabaseClient<Database>,
  getUserSession$: () => Observable<SimpleUserModel | null>
) {
  return getUserSession$().pipe(
    switchMap(user => {
      if (!user) return throwError(() => new Error('Authentication required'));
      const uid = user.id;

      const loadPatchIds$ = rxFrom(
        supabase.from(DbPaths.patches)
          .select('id')
          .eq('authorid', uid)
      ).pipe(mapIdsFromResponse(), remapErrors());

      const loadRackIds$ = rxFrom(
        supabase.from(DbPaths.racks)
          .select('id')
          .eq('authorid', uid)
      ).pipe(mapIdsFromResponse(), remapErrors());

      const loadModuleIds$ = rxFrom(
        supabase.from(DbPaths.modules)
          .select('id')
          .eq('submitter', uid)
      ).pipe(mapIdsFromResponse(), remapErrors());

      const loadModuleCollectionIds$ = rxFrom(
        supabase.from(DbPaths.module_collections)
          .select('id')
          .eq('authorid', uid)
      ).pipe(mapIdsFromResponse(), remapErrors());

      return forkJoin({
        patchIds: loadPatchIds$,
        rackIds: loadRackIds$,
        moduleIds: loadModuleIds$,
        moduleCollectionIds: loadModuleCollectionIds$
      }).pipe(
        switchMap(({patchIds, rackIds, moduleIds, moduleCollectionIds}) => deletePatchConnections(supabase, patchIds).pipe(
          switchMap(() => deletePatchModuleInstances(supabase, patchIds)),
          switchMap(() => deleteEntityComments(supabase, CommentableEntityTypes.PATCH, patchIds)),
          switchMap(() => deletePatches(supabase, patchIds)),
          switchMap(() => deleteRackModules(supabase, rackIds)),
          switchMap(() => deleteEntityComments(supabase, CommentableEntityTypes.RACK, rackIds)),
          switchMap(() => deleteRacks(supabase, rackIds)),
          switchMap(() => verifyRacksDeleted(supabase, rackIds)),
          switchMap(() => deleteModuleCollectionEntriesByCollection(supabase, moduleCollectionIds)),
          switchMap(() => deleteModuleCollectionEntriesByModule(supabase, moduleIds)),
          switchMap(() => deleteModuleCollections(supabase, moduleCollectionIds)),
          switchMap(() => deleteModuleFlagsByModule(supabase, moduleIds)),
          switchMap(() => rxFrom(supabase.from(DbPaths.module_flags).delete().eq('user_id', uid)).pipe(throwIfSupabaseError())),
          switchMap(() => deleteEntityComments(supabase, CommentableEntityTypes.MODULE, moduleIds)),
          switchMap(() => deleteModules(supabase, moduleIds)),
          switchMap(() => rxFrom(supabase.from(DbPaths.user_modules).delete().eq('profileid', uid)).pipe(throwIfSupabaseError())),
          switchMap(() => rxFrom(supabase.from(DbPaths.comments).delete().eq('authorId', uid)).pipe(throwIfSupabaseError())),
          cacheBust([
            'modules',
            'currentUserModules',
            'moduleWithId',
            'module_flags',
            'moduleCollections',
            'moduleCollectionWithId',
            'moduleCollectionsByModule',
            'patches',
            'patchConnections',
            'rackWithId',
            'racksMinimal',
            'comments',
            'currentUserComments'
          ])
        ))
      );
    })
  );
}

function mapIdsFromResponse() {
  return map(({data, error}: {data: Array<{id: number}> | null; error: unknown}) => {
    if (error) throw error;
    return (data ?? []).map(row => row.id);
  });
}

function deleteEntityComments(
  supabase: SupabaseClient<Database>,
  entityType: CommentableEntityTypes,
  entityIds: number[]
) {
  return entityIds.length === 0
    ? of({data: null, error: null})
    : rxFrom(deleteCommentRowsForEntities(supabase, entityType, entityIds)).pipe(throwIfSupabaseError());
}

function deletePatchConnections(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.patch_connections).delete().in('patchid', ids)).pipe(throwIfSupabaseError());
}

function deletePatchModuleInstances(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.patch_module_instances).delete().in('patch_id', ids)).pipe(throwIfSupabaseError());
}

function deletePatches(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.patches).delete().in('id', ids)).pipe(throwIfSupabaseError());
}

function deleteRackModules(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.rack_modules).delete().in('rackid', ids)).pipe(throwIfSupabaseError());
}

function deleteRacks(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.racks).delete().in('id', ids)).pipe(throwIfSupabaseError());
}

function deleteModuleCollectionEntriesByCollection(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.module_collection_entries).delete().in('collection_id', ids)).pipe(throwIfSupabaseError());
}

function deleteModuleCollectionEntriesByModule(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.module_collection_entries).delete().in('module_id', ids)).pipe(throwIfSupabaseError());
}

function deleteModuleCollections(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.module_collections).delete().in('id', ids)).pipe(throwIfSupabaseError());
}

function deleteModuleFlagsByModule(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.module_flags).delete().in('module_id', ids)).pipe(throwIfSupabaseError());
}

function deleteModules(supabase: SupabaseClient<Database>, ids: number[]) {
  return ids.length === 0
    ? of({data: null, error: null})
    : rxFrom(supabase.from(DbPaths.modules).delete().in('id', ids)).pipe(throwIfSupabaseError());
}

function verifyRacksDeleted(
  supabase: SupabaseClient<Database>,
  rackIds: number[]
) {
  return rackIds.length === 0
    ? of(void 0)
    : rxFrom(
      supabase.from(DbPaths.racks)
        .select('id')
        .in('id', rackIds)
    ).pipe(
      throwIfSupabaseError(),
      map(({data}) => {
        const remainingRackIds = (data ?? []).map(row => row.id);
        if (remainingRackIds.length > 0) {
          throw new Error(`Rack deletion incomplete; remaining rack ids: ${ remainingRackIds.join(', ') }`);
        }
      })
    );
}
