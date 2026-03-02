import { MatSnackBar } from '@angular/material/snack-bar';
import {
  forkJoin,
  from as rxFrom,
  Observable,
  throwError
} from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import { CV } from '../../models/cv';
import { DBManufacturer } from '../../models/manufacturer';
import { DbModule } from '../../models/module';
import { PatchModuleInstance } from '../../models/connection';
import { RackMinimal } from '../../models/rack';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBust,
  catchErrors,
  remapErrors
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';


export function createAddNamespace(
  supabase: SupabaseClient<Database>,
  snackBar: MatSnackBar,
  getUserSession$: () => Observable<SimpleUserModel | null>
) {
  return {
    comment: (data: {
      entityId: number,
      entityType: number,
      content: string,
    }) => getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          supabase
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
    
    module_tags: (data: Database['public']['Tables']['module_tags']['Insert'][]) => rxFrom(
      supabase
        .from(DbPaths.module_tags)
        .upsert(data)
    )
      .pipe(remapErrors()),
    
    userModule: (moduleId: number) => getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          supabase
            .from(DbPaths.user_modules)
            .insert({
              moduleid: moduleId,
              profileid: user.id
            })
        )),
        cacheBust(['currentUserModules']),
        remapErrors()
      ),
    
    userModuleTag: (moduleTagId: number) => getUserSession$().pipe(
      switchMap(user => rxFrom(
        supabase
          .from(DbPaths.user_module_tags)
          .insert({moduletagid: moduleTagId, authorid: user.id})
      )),
      cacheBust(['userModuleTags']),
      remapErrors()
    ),
    
    moduleTagLink: (moduleId: number, tagId: number) => getUserSession$().pipe(
      switchMap(() => rxFrom(
        supabase
          .from(DbPaths.module_tags)
          .insert({moduleid: moduleId, tagid: tagId})
          .select('id')
          .single()
      )),
      cacheBust(['modules', 'moduleWithId']),
      remapErrors(),
      map((x: any) => ({id: x.data?.id as number}))
    ),
    
    rackModule: (moduleId: number, rackid: number, row?: number, column?: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.rack_modules)
            .insert({
              moduleid: moduleId,
              rackid,
              row,
              column
            })
        );
      }),
      remapErrors()
    ),

    rack: (data: Omit<RackMinimal, 'author' | 'created' | 'updated' | 'id'>) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.racks)
            .insert({...data, authorid: user.id})
            .select('id')
        );
      }),
      cacheBust(['rackWithId']),
      remapErrors()
    ),
    
    patch: (data: {
      name: string
    }) => {
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase
              .from(DbPaths.patches)
              .insert({
                ...data,
                authorid: user.id,
                public: true
              })
          );
        }),
        cacheBust(['patches']),
        remapErrors());
    },
    
    modules: (data: DbModule[]) => {
      return getUserSession$().pipe(
        map(user =>
          data
            .map(x => ({
              ...x,
              submitter: user.id
            }))
            .map(x => {
              const dbData: any = {...x};
              if (dbData.standard && typeof dbData.standard === 'object') {
                dbData.standard = dbData.standard.id;
              }
              if (dbData.manufacturer && typeof dbData.manufacturer === 'object') {
                dbData.manufacturerId = dbData.manufacturer.id;
                delete dbData.manufacturer;
              }
              delete dbData.ins;
              delete dbData.outs;
              delete dbData.switches;
              delete dbData.panels;
              delete dbData.tags;
              
              if (!x.id) {
                return rxFrom(
                  supabase
                    .from(DbPaths.modules)
                    .insert(dbData)
                );
              } else {
                return rxFrom(
                  supabase
                    .from(DbPaths.modules)
                    .update(dbData)
                    .eq('id', x.id)
                );
              }
            })
        ),
        switchMap((x) => forkJoin(x)),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
        catchErrors(snackBar)
      );
    },
    
    moduleINs: (data: CV[], moduleid: number) => rxFrom(
      supabase
        .from(DbPaths.moduleINs)
        .insert(data.map(x => ({
          ...x,
          moduleid
        })))
    )
      .pipe(remapErrors()),
    
    moduleOUTs: (data: CV[], moduleid: number) => rxFrom(
      supabase
        .from(DbPaths.moduleOUTs)
        .insert(data.map(x => ({
          ...x,
          moduleid
        })))
    )
      .pipe(remapErrors()),
    
    manufacturers: (data: Partial<DBManufacturer>[]) => rxFrom(
      supabase
        .from(DbPaths.manufacturers)
        .insert(data)
        .select('id,name')
    )
      .pipe(
        remapErrors(),
        cacheBust(['manufacturers'])
      ),
    
    panel: (data: Database['public']['Tables']['module_panels']['Insert'][]) => rxFrom(
      supabase
        .from(DbPaths.module_panels)
        .insert(data)
    )
      .pipe(remapErrors()),
    
    patchModuleInstance: (patch_id: number, module_id: number, instance_label?: string) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.patch_module_instances)
            .insert({patch_id, module_id, instance_label: instance_label ?? null})
            .select('id,patch_id,module_id,instance_label')
            .single()
        );
      }),
      remapErrors(),
      map(x => (x as any).data as PatchModuleInstance),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    ),

    /** Batch insert multiple patch module instances in a single DB call */
    patchModuleInstances: (rows: {
      patch_id: number;
      module_id: number;
      instance_label: string | null
    }[]) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.patch_module_instances)
            .insert(rows)
            .select('id,patch_id,module_id,instance_label')
        );
      }),
      remapErrors(),
      map(x => (x as any).data as PatchModuleInstance[]),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    )
  };
}