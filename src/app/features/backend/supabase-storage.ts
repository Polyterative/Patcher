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
import { DbStoragePaths } from './DatabaseStrings';
import { cacheBust } from './supabase.cache';
import {
  SimpleUserModel,
  SupabaseStorageFile
} from './supabase.types';


function cleanUpFileName(name: string): string {
  return name.toLowerCase().trim();
}

export function createStorageNamespace(
  supabase: SupabaseClient<Database>,
  snackBar: MatSnackBar,
  getUserSession$: () => Observable<SimpleUserModel | null>
) {
  const ns = {
    uploadModulePanel: (file: SupabaseStorageFile, filenameAndExtension: string, contentType: string = 'image/jpeg') => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          const uploadNewPanel$ = rxFrom(
            supabase.storage
              .from(DbStoragePaths.module_panels)
              .upload(filenameAndExtension, file, {
                cacheControl: '360000',
                upsert: true,
                contentType
              })
          );
          const deleteThePossibleOldPanel$ = ns.deletePanelFile(filenameAndExtension);
          return forkJoin([deleteThePossibleOldPanel$, uploadNewPanel$]);
        }),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
        map(() => filenameAndExtension)
      );
    },
    
    uploadRackImage: (file: SupabaseStorageFile, filenameAndExtension: string) => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      filenameAndExtension = filenameAndExtension.split('.').join(
        `_${ new Date().toISOString().replace(/:/g, '-').replace(/[^0-9-]/g, '') }.`
      );
      
      return getUserSession$().pipe(
        switchMap(() => rxFrom(
          supabase.storage
            .from(DbStoragePaths.racks)
            .upload(filenameAndExtension, file, {
              cacheControl: '360',
              contentType: 'image/jpeg'
            })
        ).pipe(
          cacheBust(['rackWithId']),
          map(() => filenameAndExtension)
        ))
      );
    },
    
    deleteRackImage: (filenameAndExtension: string) => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.storage
              .from(DbStoragePaths.racks)
              .remove([filenameAndExtension])
          );
        }),
        cacheBust(['rackWithId'])
      );
    },

    deletePanelFile: (path: string) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.storage
            .from(DbStoragePaths.module_panels)
            .remove([path])
        );
      }),
      cacheBust(['modules', 'currentUserModules', 'moduleWithId', 'rackWithId'])
    )
  };
  
  return ns;
}