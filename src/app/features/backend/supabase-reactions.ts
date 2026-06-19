import type { SupabaseTableRow } from './supabase-db.types';

export const REACTION_KIND_COOL = 'COOL' as const;

export type ReactionKind = typeof REACTION_KIND_COOL;

export const ReactionEntityTypes = {
  MODULE: 1,
  RACK: 2
} as const;

export type ReactionEntityType =
  typeof ReactionEntityTypes[keyof typeof ReactionEntityTypes];

export const REACTION_ROW_COLUMNS = 'user_id,entity_type,entity_id,kind,created_at' as const;
export const REACTION_COUNT_COLUMNS = 'entity_type,entity_id,kind,total,updated_at' as const;

export type ReactionRow = SupabaseTableRow<'reactions'>;
export type ReactionCountRow = SupabaseTableRow<'reaction_counts'>;
