import { SupabaseClient } from '@supabase/supabase-js';
import {
  from as rxFrom,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  switchMap
} from 'rxjs/operators';
import { Database } from 'src/backend/database.types';
import { DbPaths } from './DatabaseStrings';
import { throwIfSupabaseError } from './supabase.cache';
import {
  responseList,
  SupabaseListResponse
} from './supabase-db.types';

export interface ModuleCollectionEntryInsert {
  collection_id: number;
  module_id: number;
  ordinal: number;
}

type PublicModuleCollectionRow = Pick<Database['public']['Tables']['modules']['Row'], 'id' | 'public'>;

export function buildModuleCollectionEntries(
  collectionId: number,
  moduleIds: number[]
): ModuleCollectionEntryInsert[] {
  return moduleIds.map((moduleId, index) => ({
    collection_id: collectionId,
    module_id: moduleId,
    ordinal: index
  }));
}

export function validatePublicModuleCollectionModuleIds(
  supabase: SupabaseClient<Database>,
  moduleIds: number[] = []
): Observable<number[]> {
  const uniqueModuleIds = [...new Set(moduleIds)];
  if (uniqueModuleIds.length === 0) {
    return of(moduleIds);
  }

  return rxFrom(
    supabase
      .from(DbPaths.modules)
      .select('id,public')
      .in('id', uniqueModuleIds)
  ).pipe(
    throwIfSupabaseError<SupabaseListResponse<PublicModuleCollectionRow>>(),
    switchMap(response => {
      const publicModuleIds = new Set(
        responseList(response)
          .filter(row => row.public === true)
          .map(row => Number(row.id))
      );
      const invalidModuleIds = uniqueModuleIds.filter(moduleId => !publicModuleIds.has(moduleId));

      if (invalidModuleIds.length > 0) {
        return throwError(() => new Error('Collections can only contain public modules.'));
      }

      return of(moduleIds);
    })
  );
}
