import {
  from as rxFrom,
  Observable
} from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import {
  CV,
  CVwithModuleId
} from '../../models/cv';
import { PatchConnection } from '../../models/connection';
import { DbPaths } from './DatabaseStrings';

export function getCvMapper(moduleid: number): (cv: CV) => CVwithModuleId {
  return (cv: CV) => ({...cv, moduleid});
}

export function normalizeCvRangeForDb<T extends CVwithModuleId>(cv: T) {
  return {
    ...cv,
    min: cv.min ?? null,
    max: cv.max ?? null
  };
}

export function buildCVInserter(
  supabase: SupabaseClient<Database>,
  cvs: CV[],
  path: 'module_ins' | 'module_outs',
  moduleId: number,
  authorid: string
) {
  const mappedCVs = cvs.map(getCvMapper(moduleId))
    .filter(x => x.id === 0)
    .map(x => {
      x.id = undefined;
      return x;
    })
    .map(normalizeCvRangeForDb)
    .map(x => ({...x, authorid}));

  return mappedCVs.map(x => rxFrom(supabase.from(path).insert(x)));
}

export function buildCVUpdater(
  supabase: SupabaseClient<Database>,
  cvs: CV[],
  path: 'module_ins' | 'module_outs',
  moduleId: number
) {
  const mappedCVs = cvs.map(getCvMapper(moduleId))
    .filter(x => x.id > 0)
    .map(normalizeCvRangeForDb);
  return mappedCVs.map(x => rxFrom(supabase.from(path).update(x).eq('id', x.id)));
}

export function buildPatchConnectionInserter(
  supabase: SupabaseClient<Database>,
  connections: PatchConnection[],
  patchConnectionsForPatch: (id: number) => Observable<unknown>
) {
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
    supabase.from(DbPaths.patch_connections)
      .insert(toInsert)
      .select('patchid')
  ).pipe(tap(() => void 0));

  if (connections.length > 0) {
    return patchConnectionsForPatch(connections[0].patch.id)
      .pipe(switchMap(() => inserter$));
  }
  return inserter$;
}
