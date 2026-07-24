import {
  from as rxFrom,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBust,
  throwIfSupabaseError
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import {
  responseData,
  type SupabaseFunctionReturns,
  type SupabaseSingleResponse,
  type SupabaseTableRow
} from './supabase-db.types';

export const API_KEY_SLOT_COLUMNS =
  'id,label,key_prefix,tier_code,created_at,rotated_at,revoked_at,last_used_at,monthly_quota_override,per_minute_quota_override';
export const API_KEY_USAGE_MONTHLY_COLUMNS = 'key_id,month,used,updated_at';

export type ApiKeySlotRow = Pick<
  SupabaseTableRow<'api_keys'>,
  | 'id'
  | 'label'
  | 'key_prefix'
  | 'tier_code'
  | 'created_at'
  | 'rotated_at'
  | 'revoked_at'
  | 'last_used_at'
  | 'monthly_quota_override'
  | 'per_minute_quota_override'
>;

export type ApiKeyUsageMonthlyRow = Pick<
  SupabaseTableRow<'api_key_usage_monthly'>,
  | 'key_id'
  | 'month'
  | 'used'
  | 'updated_at'
>;

export type CreateApiKeyRpcRow = SupabaseFunctionReturns<'create_api_key'>[number];

export interface DeveloperApiKeySlot {
  id: string;
  label: string | null;
  keyPrefix: string;
  tierCode: string;
  createdAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  monthlyQuotaOverride: number | null;
  perMinuteQuotaOverride: number | null;
}

export interface DeveloperApiKeyUsage {
  keyId: string;
  month: string;
  used: number;
  updatedAt: string;
}

export interface DeveloperApiKeyCreateResult {
  id: string;
  rawKey: string;
  prefix: string;
  tier: string;
}

export class ApiKeyAuthRequiredError extends Error {
  readonly code = '28000';

  constructor() {
    super('Sign in required to manage API credentials.');
  }
}

export interface ApiKeysFilterBuilder<Row> extends PromiseLike<SupabaseSingleResponse<Row | null>> {
  eq(column: string, value: string): ApiKeysFilterBuilder<Row>;
  order(column: string, options: { ascending: boolean }): ApiKeysFilterBuilder<Row>;
  limit(count: number): ApiKeysFilterBuilder<Row>;
  maybeSingle(): PromiseLike<SupabaseSingleResponse<Row | null>>;
}

export interface ApiKeysTableBuilder<Row> {
  select(columns: string): ApiKeysFilterBuilder<Row>;
}

export interface ApiKeysSupabaseClient {
  from(table: typeof DbPaths.api_keys): ApiKeysTableBuilder<ApiKeySlotRow>;
  from(table: typeof DbPaths.api_key_usage_monthly): ApiKeysTableBuilder<ApiKeyUsageMonthlyRow>;
  rpc(
    functionName: 'create_api_key',
    args: { p_label: string }
  ): PromiseLike<SupabaseSingleResponse<CreateApiKeyRpcRow[]>>;
  rpc(
    functionName: 'revoke_api_key',
    args: { p_id: string }
  ): PromiseLike<SupabaseSingleResponse<undefined>>;
}

export interface SupabaseApiKeysRawClient {
  from(table: string): {
    select(columns: string): ApiKeysFilterBuilder<ApiKeySlotRow | ApiKeyUsageMonthlyRow>;
  };
  rpc(
    functionName: string,
    args: { p_label: string } | { p_id: string }
  ): PromiseLike<SupabaseSingleResponse<CreateApiKeyRpcRow[] | undefined>>;
}

class SupabaseApiKeysClientAdapter implements ApiKeysSupabaseClient {
  constructor(private readonly supabase: SupabaseApiKeysRawClient) {}

  from(table: typeof DbPaths.api_keys): ApiKeysTableBuilder<ApiKeySlotRow>;
  from(table: typeof DbPaths.api_key_usage_monthly): ApiKeysTableBuilder<ApiKeyUsageMonthlyRow>;
  from(table: typeof DbPaths.api_keys | typeof DbPaths.api_key_usage_monthly): ApiKeysTableBuilder<ApiKeySlotRow> | ApiKeysTableBuilder<ApiKeyUsageMonthlyRow> {
    if (table === DbPaths.api_keys) {
      return {
        select: columns => this.supabase
          .from(DbPaths.api_keys)
          .select(columns) as ApiKeysFilterBuilder<ApiKeySlotRow>
      };
    }

    return {
      select: columns => this.supabase
        .from(DbPaths.api_key_usage_monthly)
        .select(columns) as ApiKeysFilterBuilder<ApiKeyUsageMonthlyRow>
    };
  }

  rpc(functionName: 'create_api_key', args: { p_label: string }): PromiseLike<SupabaseSingleResponse<CreateApiKeyRpcRow[]>>;
  rpc(functionName: 'revoke_api_key', args: { p_id: string }): PromiseLike<SupabaseSingleResponse<undefined>>;
  rpc(
    functionName: 'create_api_key' | 'revoke_api_key',
    args: { p_label: string } | { p_id: string }
  ): PromiseLike<SupabaseSingleResponse<CreateApiKeyRpcRow[] | undefined>> {
    if (functionName === 'create_api_key' && 'p_label' in args) {
      return this.supabase.rpc('create_api_key', args) as PromiseLike<SupabaseSingleResponse<CreateApiKeyRpcRow[]>>;
    }

    if (functionName === 'revoke_api_key' && 'p_id' in args) {
      return this.supabase.rpc('revoke_api_key', args) as PromiseLike<SupabaseSingleResponse<undefined>>;
    }

    return Promise.resolve({
      count: null,
      data: null,
      error: {
        code: 'PGRST000',
        details: '',
        hint: '',
        message: 'Unsupported API key RPC call.',
        name: 'PostgrestError'
      },
      status: 400,
      statusText: 'Bad Request'
    });
  }
}

export function currentApiUsageMonth(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function mapApiKeySlotRow(row: ApiKeySlotRow): DeveloperApiKeySlot {
  return {
    createdAt: row.created_at,
    id: row.id,
    keyPrefix: row.key_prefix,
    label: row.label,
    lastUsedAt: row.last_used_at,
    monthlyQuotaOverride: row.monthly_quota_override,
    perMinuteQuotaOverride: row.per_minute_quota_override,
    revokedAt: row.revoked_at,
    rotatedAt: row.rotated_at,
    tierCode: row.tier_code
  };
}

export function mapApiKeyUsageRow(row: ApiKeyUsageMonthlyRow): DeveloperApiKeyUsage {
  return {
    keyId: row.key_id,
    month: row.month,
    updatedAt: row.updated_at,
    used: row.used
  };
}

export function mapCreateApiKeyResult(row: CreateApiKeyRpcRow): DeveloperApiKeyCreateResult {
  return {
    id: row.id,
    prefix: row.prefix,
    rawKey: row.raw_key,
    tier: row.tier
  };
}

export function createApiKeysNamespace(
  supabase: ApiKeysSupabaseClient,
  getUserSession$: () => Observable<SimpleUserModel | null>
) {
  return {
    getOwnKeySlot: (): Observable<DeveloperApiKeySlot | null> => getUserSession$().pipe(
      switchMap(user => user
        ? rxFrom(
          supabase
            .from(DbPaths.api_keys)
            .select(API_KEY_SLOT_COLUMNS)
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        )
        : throwError(() => new ApiKeyAuthRequiredError())
      ),
      throwIfSupabaseError<SupabaseSingleResponse<ApiKeySlotRow | null>>(),
      map(response => responseData(response)),
      map(row => row ? mapApiKeySlotRow(row) : null)
    ),

    getOwnUsage: (keyId: string, month = currentApiUsageMonth()): Observable<DeveloperApiKeyUsage | null> => rxFrom(
      supabase
        .from(DbPaths.api_key_usage_monthly)
        .select(API_KEY_USAGE_MONTHLY_COLUMNS)
        .eq('key_id', keyId)
        .eq('month', month)
        .maybeSingle()
    ).pipe(
      throwIfSupabaseError<SupabaseSingleResponse<ApiKeyUsageMonthlyRow | null>>(),
      map(response => responseData(response)),
      map(row => row ? mapApiKeyUsageRow(row) : null)
    ),

    createOrRotateOwnKey: (label: string): Observable<DeveloperApiKeyCreateResult> => getUserSession$().pipe(
      switchMap(user => user
        ? rxFrom(supabase.rpc('create_api_key', { p_label: label }))
        : throwError(() => new ApiKeyAuthRequiredError())
      ),
      throwIfSupabaseError<SupabaseSingleResponse<CreateApiKeyRpcRow[]>>(),
      map(response => response.data?.[0] ?? null),
      switchMap(row => row
        ? of(mapCreateApiKeyResult(row))
        : throwError(() => new Error('API key creation returned no credential.'))
      ),
      cacheBust(['apiKeys'])
    ),

    revokeOwnKey: (id: string): Observable<void> => getUserSession$().pipe(
      switchMap(user => user
        ? rxFrom(supabase.rpc('revoke_api_key', { p_id: id }))
        : throwError(() => new ApiKeyAuthRequiredError())
      ),
      throwIfSupabaseError<SupabaseSingleResponse<undefined>>(),
      map(() => void 0),
      cacheBust(['apiKeys'])
    )
  };
}

export function createApiKeysNamespaceForSupabaseClient(
  supabase: object,
  getUserSession$: () => Observable<SimpleUserModel | null>
) {
  return createApiKeysNamespace(new SupabaseApiKeysClientAdapter(supabase as SupabaseApiKeysRawClient), getUserSession$);
}
