import { MatSnackBar } from '@angular/material/snack-bar';
import {
  from as rxFrom,
  Observable,
  throwError
} from 'rxjs';
import {
  map,
  switchMap,
  take
} from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import { ModulePanel } from '../../models/module';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBust,
  catchErrors,
  remapErrors
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import { CommentableEntityTypes } from 'src/app/components/shared-atoms/comments/comments-data.service';


export function createDeleteNamespace(
  supabase: SupabaseClient<Database>,
  snackBar: MatSnackBar,
  getUserSession$: () => Observable<SimpleUserModel | null>,
  deletePanelFileFn: (filename: string) => Observable<any>,
  defaultPag: number,
  hasAdminRole$: () => Observable<boolean> = () => rxFrom(Promise.resolve(false))
) {
  return {
    comment: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.comments)
            .delete()
            .filter('id', 'eq', id)
            .filter('authorId', 'eq', user.id)
        );
      }),
      cacheBust(['comments', 'currentUserComments']),
      remapErrors()
    ),

    commentsForRack: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.comments)
            .delete()
            .filter('entityId', 'eq', id)
            .filter('entityType', 'eq', CommentableEntityTypes.RACK)
        );
      }),
      cacheBust(['comments', 'currentUserComments']),
      remapErrors()
    ),
    
    module: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return hasAdminRole$().pipe(
          take(1),
          switchMap(isAdmin => {
            const deleteAllComments$ = rxFrom(
              supabase.from(DbPaths.comments)
                .delete()
                .filter('entityId', 'eq', id)
                .filter('entityType', 'eq', CommentableEntityTypes.MODULE)
            );
            // Admins can delete any module; regular users can only delete their own submissions.
            const deleteModule$ = isAdmin
              ? rxFrom(supabase.from(DbPaths.modules).delete().filter('id', 'eq', id).select('id'))
              : rxFrom(supabase.from(DbPaths.modules).delete().filter('id', 'eq', id).filter('submitter', 'eq', user.id).select('id'));
            return deleteAllComments$.pipe(switchMap(() => deleteModule$));
          })
        );
      }),
      remapErrors(),
      cacheBust(['modules', 'currentUserModules', 'moduleWithId', 'currentUserComments']),
      catchErrors(snackBar)
    ),
    
    userModule: (id: number) => getUserSession$().pipe(
      switchMap(user => rxFrom(
        supabase.from(DbPaths.user_modules)
          .delete()
          .filter('profileid', 'eq', user.id)
          .filter('moduleid', 'eq', id)
      )),
      switchMap(() => rxFrom(
        supabase.from(DbPaths.comments)
          .delete()
          .filter('entityId', 'eq', id)
          .filter('entityType', 'eq', CommentableEntityTypes.MODULE)
      )),
      cacheBust(['currentUserModules', 'currentUserComments']),
      remapErrors()
    ),
    
    userModuleTag: (moduleTagId: number) => getUserSession$().pipe(
      switchMap(user => rxFrom(
        supabase.from(DbPaths.user_module_tags)
          .delete()
          .filter('authorid', 'eq', user.id)
          .filter('moduletagid', 'eq', moduleTagId)
      )),
      cacheBust(['userModuleTags']),
      remapErrors()
    ),
    
    rackedModule: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.rack_modules)
            .delete()
            .filter('id', 'eq', id)
        );
      }),
      remapErrors()
    ),

    modulesOfRack: (rackId: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.rack_modules)
            .delete()
            .filter('rackid', 'eq', rackId)
        );
      }),
      remapErrors()
    ),
    
    patch: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('patch_id', 'eq', id)
        ).pipe(
          switchMap(() => rxFrom(
            supabase.from(DbPaths.patches)
              .delete()
              .filter('id', 'eq', id)
          )),
          switchMap(() => rxFrom(
            supabase.from(DbPaths.comments)
              .delete()
              .filter('entityId', 'eq', id)
              .filter('entityType', 'eq', CommentableEntityTypes.PATCH)
          ))
        );
      }),
      remapErrors(),
      cacheBust(['patches', 'patchConnections', 'patchModuleInstances'])
    ),

    patchConnectionsForPatch: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_connections)
            .delete()
            .filter('patchid', 'eq', id)
        );
      }),
      remapErrors(),
      cacheBust(['patchConnections', 'patches'])
    ),

    patchModuleInstance: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('id', 'eq', id)
        );
      }),
      remapErrors(),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    ),

    patchModuleInstancesForPatch: (patch_id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('patch_id', 'eq', patch_id)
        );
      }),
      remapErrors(),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    ),
    
    userPatch: (id: number) => getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('patch_id', 'eq', id)
        ).pipe(map(() => user))),
        switchMap(user => rxFrom(
          supabase.from(DbPaths.patches)
            .delete()
            .filter('authorid', 'eq', user.id)
            .filter('id', 'eq', id)
        )),
        switchMap(() => rxFrom(
          supabase.from(DbPaths.comments)
            .delete()
            .filter('entityId', 'eq', id)
            .filter('entityType', 'eq', CommentableEntityTypes.PATCH)
        )),
        remapErrors(),
        cacheBust(['patches', 'patchConnections', 'patchModuleInstances'])
      ),
    
    userRack: (id: number) => getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          supabase.from(DbPaths.racks)
            .delete()
            .filter('authorid', 'eq', user.id)
            .filter('id', 'eq', id)
        )),
        remapErrors(),
        cacheBust(['rackWithId'])
      ),
    
    modules: (from = 0, to: number = defaultPag) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.modules)
            .delete()
            .range(from, to)
        );
      }),
      remapErrors(),
      cacheBust(['modules', 'currentUserModules', 'moduleWithId'])
    ),

    manufacturers: (from = 0, to = defaultPag) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.manufacturers)
            .delete()
            .range(from, to)
        );
      }),
      cacheBust(['manufacturers']),
      remapErrors()
    ),

    modulePanel: (data: ModulePanel) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        const deletePanelFile$ = deletePanelFileFn(data.filename);
        const deleteDatabaseEntry$ = rxFrom(
          supabase.from(DbPaths.module_panels)
            .delete()
            .filter('id', 'eq', data.id)
        );
        return deletePanelFile$.pipe(switchMap(() => deleteDatabaseEntry$));
      }),
      remapErrors()
    ),
    
    /**
     * Deletes all user-generated data for the current user in the correct dependency order:
     * patch_connections → patches → rack_modules → racks → user_modules → comments
     */
    allUserData: () => getUserSession$().pipe(
      switchMap(user => {
        const uid = user.id;
        
        const deletePatchConnections$ = rxFrom(
          supabase.from(DbPaths.patch_connections)
            .delete()
            .in('patchid',
              supabase.from(DbPaths.patches).select('id').eq('authorid', uid) as any
            )
        ).pipe(remapErrors());
        
        const deletePatchModuleInstances$ = rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .in('patch_id',
              supabase.from(DbPaths.patches).select('id').eq('authorid', uid) as any
            )
        ).pipe(remapErrors());
        
        const deletePatches$ = rxFrom(
          supabase.from(DbPaths.patches).delete().eq('authorid', uid)
        ).pipe(remapErrors());
        
        const deleteRackModules$ = rxFrom(
          supabase.from(DbPaths.rack_modules)
            .delete()
            .in('rackid',
              supabase.from(DbPaths.racks).select('id').eq('authorid', uid) as any
            )
        ).pipe(remapErrors());
        
        const deleteRacks$ = rxFrom(
          supabase.from(DbPaths.racks).delete().eq('authorid', uid)
        ).pipe(remapErrors());
        
        const deleteUserModules$ = rxFrom(
          supabase.from(DbPaths.user_modules).delete().eq('profileid', uid)
        ).pipe(remapErrors());
        
        const deleteComments$ = rxFrom(
          supabase.from(DbPaths.comments).delete().eq('authorId', uid)
        ).pipe(remapErrors());
        
        return deletePatchConnections$.pipe(
          switchMap(() => deletePatchModuleInstances$),
          switchMap(() => deletePatches$),
          switchMap(() => deleteRackModules$),
          switchMap(() => deleteRacks$),
          switchMap(() => deleteUserModules$),
          switchMap(() => deleteComments$),
          cacheBust(['modules', 'currentUserModules', 'moduleWithId', 'patches', 'patchConnections', 'rackWithId', 'racksMinimal', 'comments', 'currentUserComments'])
        );
      })
    )
  };
}