import type {
  PostgrestResponse,
  PostgrestSingleResponse
} from '@supabase/supabase-js';
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate
} from 'src/backend/database.types';

export type SupabaseTableName = keyof Database['public']['Tables'];
export type SupabaseViewName = keyof Database['public']['Views'];
export type SupabaseFunctionName = keyof Database['public']['Functions'];

export type SupabaseTableRow<TableName extends SupabaseTableName> = Tables<TableName>;
export type SupabaseTableInsert<TableName extends SupabaseTableName> = TablesInsert<TableName>;
export type SupabaseTableUpdate<TableName extends SupabaseTableName> = TablesUpdate<TableName>;

export type SupabaseFunctionArgs<FunctionName extends SupabaseFunctionName> =
  Database['public']['Functions'][FunctionName]['Args'];
export type SupabaseFunctionReturns<FunctionName extends SupabaseFunctionName> =
  Database['public']['Functions'][FunctionName]['Returns'];

export type SupabaseSingleResponse<Row> = PostgrestSingleResponse<Row>;
export type SupabaseListResponse<Row> = PostgrestResponse<Row>;

export function responseData<Row>(
  response: Pick<SupabaseSingleResponse<Row>, 'data'>
): Row | null {
  return response.data ?? null;
}

export function responseList<Row>(
  response: Pick<SupabaseListResponse<Row>, 'data'>
): Row[] {
  return response.data ?? [];
}

export function responseCount(
  response: Pick<SupabaseListResponse<unknown>, 'count'>
): number | null {
  return response.count ?? null;
}
