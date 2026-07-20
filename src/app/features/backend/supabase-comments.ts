import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import { CommentableEntityTypes } from 'src/app/models/comment';
import { DbPaths } from './DatabaseStrings';


export { CommentableEntityTypes } from 'src/app/models/comment';

export function deleteCommentRowsForEntity(
  supabase: SupabaseClient<Database>,
  entityId: number,
  entityType: CommentableEntityTypes
) {
  return supabase.from(DbPaths.comments)
    .delete()
    .filter('entityId', 'eq', entityId)
    .filter('entityType', 'eq', entityType);
}

export function deleteCommentRowsForEntities(
  supabase: SupabaseClient<Database>,
  entityType: CommentableEntityTypes,
  entityIds: number[]
) {
  return supabase.from(DbPaths.comments)
    .delete()
    .eq('entityType', entityType)
    .in('entityId', entityIds);
}
