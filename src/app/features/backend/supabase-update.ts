import { MatSnackBar } from '@angular/material/snack-bar';
import {
  forkJoin,
  from as rxFrom,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  map,
  switchMap,
  take,
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
  RackedModule,
  UserModulePossessionKind
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
  showSuccessMessage,
  throwIfSupabaseError
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import {
  buildModuleCollectionEntries,
  validatePublicModuleCollectionModuleIds
} from './supabase-module-collections';
import {
  responseData,
  type SupabaseTableInsert,
  type SupabaseTableUpdate,
  type SupabaseSingleResponse
} from './supabase-db.types';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserModuleAcquisitionDraft } from 'src/app/models/user-module-acquisition';
import {
  buildCVInserter,
  buildCVUpdater,
  buildPatchConnectionInserter,
  getCvMapper,
  normalizeCvRangeForDb
} from './supabase-update.helpers';

export { getCvMapper, buildCVInserter, buildCVUpdater, buildPatchConnectionInserter };

export function createUpdateNamespace(
  supabase: SupabaseClient<Database>,
  snackBar: MatSnackBar,
  getUserSession$: () => Observable<SimpleUserModel | null>,
  patchConnectionsForPatch: (id: number) => Observable<unknown>,
  hasAdminRole$: () => Observable<boolean> = () => rxFrom(Promise.resolve(false))
) {
  return {
    module: (data: Partial<DbModule>) => {
      data.manufacturer = undefined;
      data.ins = undefined;
      data.outs = undefined;
      data.tags = undefined;
      data.panels = undefined;

      const dbData: Record<string, unknown> = {...data};
      const standard = dbData['standard'];
      if (standard && typeof standard === 'object' && 'id' in standard) {
        dbData['standard'] = standard.id;
      }
      if (dbData['standard'] === undefined || dbData['standard'] === null) {
        dbData['standard'] = undefined;
      }

      dbData['updated'] = new Date().toISOString();

      for (const key of Object.keys(dbData)) {
        if (dbData[key] === undefined || dbData[key] === null) {
          delete dbData[key];
        }
      }

      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.from(DbPaths.modules)
              .update(dbData as SupabaseTableUpdate<'modules'>)
              .eq('id', data.id)
              .select('id,updated,created')
          );
        }),
        showSuccessMessage(snackBar),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
      );
    },
    
    rackedModules: (data: RackedModule[]) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        const toSimplyUpdate = data.filter(x => x.rackingData.id !== undefined)
          .map(rackedModule => ({
            id: rackedModule.rackingData.id,
            moduleid: rackedModule.rackingData.moduleid,
            rackid: rackedModule.rackingData.rackid,
            row: rackedModule.rackingData.row,
            column: rackedModule.rackingData.column,
            selected_panel_id: rackedModule.rackingData.selectedPanelId ?? null
          }));
        
        return rxFrom(
          supabase.from(DbPaths.rack_modules).upsert(toSimplyUpdate)
            .select('id,moduleid,rackid,row,column,selected_panel_id')
        ).pipe(
          switchMap(x => {
            const newRackedModules = data
              .filter(x => x.rackingData.id === undefined)
              .map(rackedModule => ({
                moduleid: rackedModule.rackingData.moduleid,
                rackid: rackedModule.rackingData.rackid,
                row: rackedModule.rackingData.row,
                column: rackedModule.rackingData.column,
                selected_panel_id: rackedModule.rackingData.selectedPanelId ?? null
              }));
            
            const insertNew$ = rxFrom(
              supabase.from(DbPaths.rack_modules)
                .insert(newRackedModules)
                .select('id,moduleid,rackid,row,column,selected_panel_id')
            );
            return newRackedModules.length > 0 ? insertNew$ : of(x);
          }),
          remapErrors()
        );
      }),
      cacheBust(['rackWithId'])
    ),
    
    rackModulePanel: (rackModuleId: number, panelId: number | null) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.rack_modules)
            .update({selected_panel_id: panelId})
            .eq('id', rackModuleId)
        ).pipe(remapErrors());
      }),
      cacheBust(['rackWithId'])
    ),

    rack: (data: RackMinimal) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return hasAdminRole$().pipe(
          take(1),
          switchMap(isAdmin => {
            const rackUpdate = {
              name: data.name,
              description: data.description,
              rows: data.rows,
              hp: data.hp,
              locked: data.locked,
              public: data.public,
              image: data.image
            };
            const isDifferentOwner = !!data.author?.id && data.author.id !== user.id;

            if (isAdmin && isDifferentOwner) {
              return rxFrom(
                supabase.from(DbPaths.racks)
                  .update(rackUpdate)
                  .eq('id', data.id)
                  .select('id')
              );
            }

            return rxFrom(
              supabase.from(DbPaths.racks)
                .upsert({
                  id: data.id,
                  authorid: user.id,
                  ...rackUpdate
                }).select('id')
            );
          })
        );
      }),
      throwIfSupabaseError<SupabaseSingleResponse<{id: number}>>(),
      cacheBust(['rackWithId', 'racksMinimal'])
    ),
    
    patch: (data: Patch) => {
      data.author = undefined;
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.from(DbPaths.patches)
              .update(data)
              .eq('id', data.id)
              .eq('authorid', user.id)
              .single()
          );
        }),
        showSuccessMessage(snackBar),
        cacheBust(['patches', 'patchConnections'])
      );
    },
    
    /** Silent variant — same as patch but without success toast. For auto-save. */
    patchSilent: (data: Patch) => {
      data.author = undefined;
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.from(DbPaths.patches)
              .update(data)
              .eq('id', data.id)
              .eq('authorid', user.id)
              .single()
          );
        }),
        throwIfSupabaseError(),
        cacheBust(['patches', 'patchConnections'])
      );
    },

    patchPreviewImage: (id: number, image: string | null) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return hasAdminRole$().pipe(
          take(1),
          switchMap(isAdmin => {
            const patchUpdate: SupabaseTableUpdate<'patches'> = {image};
            let query = supabase.from(DbPaths.patches)
              .update(patchUpdate)
              .eq('id', id);

            if (!isAdmin) {
              query = query.eq('authorid', user.id);
            }

            return rxFrom(
              query
                .select('id,image,updated')
                .single()
            );
          })
        );
      }),
      throwIfSupabaseError(),
      cacheBust(['patches', 'patchesWithModule'])
    ),
    
    modules: (data: DbModule[]) => {
      const transformedData = data.map(datum => {
        const dbData: Record<string, unknown> = {...datum};
        dbData['manufacturer'] = undefined;
        dbData['ins'] = undefined;
        dbData['outs'] = undefined;
        dbData['created'] = undefined;
        dbData['updated'] = undefined;
        dbData['manualURL'] = undefined;
        const standard = dbData['standard'];
        if (standard && typeof standard === 'object' && 'id' in standard) {
          dbData['standard'] = standard.id;
        }
        return dbData as SupabaseTableInsert<'modules'>;
      });
      
      return rxFrom(supabase.from(DbPaths.modules).upsert(transformedData))
        .pipe(
          cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
          showSuccessMessage(snackBar)
        );
    },
    
    /** Admin-only: set or clear the "buy new" store URL for a module. */
    moduleStoreUrl: (id: number, storeUrl: string | null) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return hasAdminRole$().pipe(
          take(1),
          switchMap(isAdmin => {
            if (!isAdmin) return throwError(() => new Error('Admin access required'));
            return rxFrom(
              supabase.from(DbPaths.modules)
                .update({store_url: storeUrl || null})
                .eq('id', id)
            );
          })
        );
      }),
      map(({error}) => { if (error) throw error; }),
      cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
      showSuccessMessage(snackBar)
    ),

    moduleCollection: (data: {
      id: number;
      name: string;
      description?: string | null;
      public?: boolean;
      image?: string | null;
      moduleIds?: number[];
    }) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return validatePublicModuleCollectionModuleIds(supabase, data.moduleIds ?? []).pipe(
          switchMap(moduleIds => rxFrom(
            supabase
              .from(DbPaths.module_collections)
              .update({
                name: data.name,
                description: data.description ?? null,
                public: data.public ?? false,
                image: data.image ?? null
              })
              .eq('id', data.id)
              .eq('authorid', user.id)
              .select('id')
              .single()
          ).pipe(
            throwIfSupabaseError(),
            switchMap((response) => {
              const collectionId = responseData(response as SupabaseSingleResponse<{id: number}>)?.id;
              if (!collectionId) {
                return throwError(() => new Error('Collection was not updated.'));
              }

              const entries = buildModuleCollectionEntries(collectionId, moduleIds);

              return rxFrom(
                supabase
                  .from(DbPaths.module_collection_entries)
                  .delete()
                  .eq('collection_id', collectionId)
              ).pipe(
                throwIfSupabaseError(),
                switchMap(() => entries.length > 0
                  ? rxFrom(supabase.from(DbPaths.module_collection_entries).insert(entries)).pipe(
                    throwIfSupabaseError(),
                    map(() => collectionId)
                  )
                  : of(collectionId)
                )
              );
            })
          ))
        );
      }),
      cacheBust(['moduleCollections', 'moduleCollectionWithId', 'moduleCollectionsByModule']),
    ),

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
    patchConnectionNoteSilent: (conn: PatchConnection) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
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
        return rxFrom(query);
      }),
      remapErrors(),
      cacheBust(['patchConnections'])
    ),

    patchModuleInstanceLabel: (id: number, instance_label: string | null) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .update({instance_label})
            .eq('id', id)
            .select('id,patch_id,module_id,instance_label')
            .single()
        );
      }),
      remapErrors(),
      map(x => responseData(x as SupabaseSingleResponse<PatchModuleInstance>) as PatchModuleInstance),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    ),

    moduleFlagResolved: (id: number, resolved: boolean) => rxFrom(
      supabase.from(DbPaths.module_flags).update({resolved}).eq('id', id)
    ).pipe(
      map(({error}) => { if (error) throw error; }),
      remapErrors()
    ),

    patchTags: (patchId: number, tags: string[]) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.patches)
            .update({tags})
            .eq('id', patchId)
            .eq('authorid', user.id)
        );
      }),
      cacheBust(['patches']),
      remapErrors()
    ),

    userModulePossession: (moduleId: number, kind: UserModulePossessionKind) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.user_modules)
            .upsert({moduleid: moduleId, profileid: user.id, kind}, {onConflict: 'profileid,moduleid'})
        );
      }),
      cacheBust(['currentUserModules', 'modulePossessionCounts']),
      remapErrors()
    ),

    userModuleAcquisition: (id: number, data: UserModuleAcquisitionDraft) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        const updateData: SupabaseTableUpdate<'user_module_acquisitions'> = {
          acquired_at: data.acquired_at,
          price_amount_minor: data.price_amount_minor ?? null,
          currency: data.price_amount_minor == null ? null : data.currency,
          source: data.source ?? 'unknown',
          note: data.note?.trim() || null,
          updated_at: new Date().toISOString()
        };
        return rxFrom(
          supabase
            .from(DbPaths.user_module_acquisitions)
            .update(updateData)
            .eq('id', id)
            .eq('profileid', user.id)
            .select('id,profileid,moduleid,acquired_at,price_amount_minor,currency,source,note,created_at,updated_at')
            .single()
        );
      }),
      throwIfSupabaseError(),
      cacheBust(['userModuleAcquisitions']),
      remapErrors()
    )
  };
}
