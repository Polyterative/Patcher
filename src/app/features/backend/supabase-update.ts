import { MatSnackBar } from '@angular/material/snack-bar';
import {
  forkJoin,
  from as rxFrom,
  Observable,
  of
} from 'rxjs';
import {
  map,
  switchMap,
  tap
} from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import {
  CV,
  CVwithModuleId
} from '../../models/cv';
import {
  DbModule,
  RackedModule
} from '../../models/module';
import {
  RackingData,
  RackMinimal
} from '../../models/rack';
import { Patch } from '../../models/patch';
import {
  PatchConnection,
  PatchModuleInstance
} from '../../models/connection';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBust,
  catchErrors,
  remapErrors,
  showSuccessMessage
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';


function getCvMapper(moduleid: number): (cv: CV) => CVwithModuleId {
  return (cv: CV) => ({...cv, moduleid});
}

function buildCVInserter(
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
    .map(x => ({...x, authorid}));
  
  return mappedCVs.map(x => rxFrom(supabase.from(path).insert(x)));
}

function buildCVUpdater(
  supabase: SupabaseClient<Database>,
  cvs: CV[],
  path: 'module_ins' | 'module_outs',
  moduleId: number
) {
  const mappedCVs = cvs.map(getCvMapper(moduleId)).filter(x => x.id > 0);
  return mappedCVs.map(x => rxFrom(supabase.from(path).update(x).eq('id', x.id)));
}

function buildPatchConnectionInserter(
  supabase: SupabaseClient<Database>,
  connections: PatchConnection[],
  patchConnectionsForPatch: (id: number) => Observable<any>
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

export function createUpdateNamespace(
  supabase: SupabaseClient<Database>,
  snackBar: MatSnackBar,
  getUserSession$: () => Observable<SimpleUserModel | null>,
  patchConnectionsForPatch: (id: number) => Observable<any>
) {
  return {
    module: (data: Partial<DbModule>) => {
      data.manufacturer = undefined;
      data.ins = undefined;
      data.outs = undefined;
      data.tags = undefined;
      data.panels = undefined;
      
      const dbData: any = {...data};
      if (dbData.standard && typeof dbData.standard === 'object') {
        dbData.standard = dbData.standard.id;
      }
      if (!dbData.standard) {
        dbData.standard = undefined;
      }
      
      dbData.updated = new Date().toISOString();
      
      for (const key in dbData) {
        if (dbData[key] === undefined || dbData[key] === null) {
          delete dbData[key];
        }
      }
      
      return rxFrom(
        supabase.from(DbPaths.modules)
          .update(dbData)
          .eq('id', data.id)
          .select('id,updated,created')
      ).pipe(
        showSuccessMessage(snackBar),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
      );
    },
    
    rackedModules: (data: RackedModule[]) => {
      const toSimplyUpdate = data.filter(x => x.rackingData.id !== undefined)
        .map(rackedModule => rackedModule.rackingData);
      
      return rxFrom(
        supabase.from(DbPaths.rack_modules).upsert(toSimplyUpdate)
      ).pipe(
        switchMap(x => {
          const newRackedModules: Omit<RackingData, 'id'>[] = data
            .filter(x => x.rackingData.id === undefined)
            .map(rackedModule => ({
              moduleid: rackedModule.rackingData.moduleid,
              rackid: rackedModule.rackingData.rackid,
              row: rackedModule.rackingData.row,
              column: rackedModule.rackingData.column
            }));
          
          const insertNew$ = rxFrom(supabase.from(DbPaths.rack_modules).insert(newRackedModules));
          return newRackedModules.length > 0 ? insertNew$ : of(x);
        }),
        remapErrors(),
      );
    },
    
    rack: (data: RackMinimal) => rxFrom(
      supabase.from(DbPaths.racks)
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
    ).pipe(
      cacheBust(['rackWithId']),
    ),
    
    patch: (data: Patch) => {
      data.author = undefined;
      return rxFrom(
        supabase.from(DbPaths.patches).update(data).eq('id', data.id).single()
      ).pipe(
        showSuccessMessage(snackBar),
        cacheBust(['patches', 'patchConnections'])
      );
    },
    
    /** Silent variant — same as patch but without success toast. For auto-save. */
    patchSilent: (data: Patch) => {
      data.author = undefined;
      return rxFrom(
        supabase.from(DbPaths.patches).update(data).eq('id', data.id).single()
      ).pipe(
        cacheBust(['patches', 'patchConnections'])
      );
    },
    
    modules: (data: DbModule[]) => {
      const transformedData = data.map(datum => {
        const dbData: any = {...datum};
        dbData.manufacturer = undefined;
        dbData.ins = undefined;
        dbData.outs = undefined;
        dbData.created = undefined;
        dbData.updated = undefined;
        dbData.manualURL = undefined;
        if (dbData.standard && typeof dbData.standard === 'object') {
          dbData.standard = dbData.standard.id;
        }
        return dbData;
      });
      
      return rxFrom(supabase.from(DbPaths.modules).upsert(transformedData))
        .pipe(
          cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
          showSuccessMessage(snackBar)
        );
    },
    
    moduleINsOUTs: (moduleId: number, ins: CV[], outs: CV[], authorid: string = '') => {
      return getUserSession$().pipe(
        switchMap(user => {
          const cvUpdates$ = [
            ...buildCVInserter(supabase, ins, DbPaths.moduleINs, moduleId, authorid || user.id),
            ...buildCVUpdater(supabase, ins, DbPaths.moduleINs, moduleId),
            ...buildCVInserter(supabase, outs, DbPaths.moduleOUTs, moduleId, authorid || user.id),
            ...buildCVUpdater(supabase, outs, DbPaths.moduleOUTs, moduleId),
          ];
          return forkJoin(cvUpdates$);
        }),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
        catchErrors(snackBar),
        showSuccessMessage(snackBar)
      );
    },
    
    patchConnections: (data: PatchConnection[]) =>
      buildPatchConnectionInserter(supabase, data, patchConnectionsForPatch).pipe(
        tap(() => SharedConstants.showSuccessUpdate(snackBar)),
        cacheBust(['patchConnections', 'patches'])
      ),
    
    /** Silent variant — same as patchConnections but without success toast. For auto-save. */
    patchConnectionsSilent: (data: PatchConnection[]) =>
      buildPatchConnectionInserter(supabase, data, patchConnectionsForPatch).pipe(
        cacheBust(['patchConnections', 'patches'])
      ),
    
    /** Targeted single-row note update. Uses composite natural key. Silent (no toast). */
    patchConnectionNoteSilent: (conn: PatchConnection) => {
      let query = supabase
        .from(DbPaths.patch_connections)
        .update({notes: conn.notes ?? null})
        .eq('patchid', conn.patch.id)
        .eq('a', conn.a.id)
        .eq('b', conn.b.id);
      query = conn.instance_id_a == null
        ? query.is('instance_id_a', null)
        : query.eq('instance_id_a', conn.instance_id_a);
      query = conn.instance_id_b == null
        ? query.is('instance_id_b', null)
        : query.eq('instance_id_b', conn.instance_id_b);
      return rxFrom(query).pipe(
        remapErrors(),
        cacheBust(['patchConnections'])
      );
    },
    
    patchModuleInstanceLabel: (id: number, instance_label: string | null) => rxFrom(
      supabase.from(DbPaths.patch_module_instances)
        .update({instance_label})
        .eq('id', id)
        .select('id,patch_id,module_id,instance_label')
        .single()
    ).pipe(
      remapErrors(),
      map(x => x.data as PatchModuleInstance),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    )
  };
}