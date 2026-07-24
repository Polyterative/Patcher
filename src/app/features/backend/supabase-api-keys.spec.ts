import {
  firstValueFrom,
  of,
  take
} from 'rxjs';
import {
  API_KEY_SLOT_COLUMNS,
  API_KEY_USAGE_MONTHLY_COLUMNS,
  ApiKeysFilterBuilder,
  ApiKeysSupabaseClient,
  ApiKeysTableBuilder,
  ApiKeySlotRow,
  ApiKeyUsageMonthlyRow,
  CreateApiKeyRpcRow,
  createApiKeysNamespace,
  currentApiUsageMonth
} from './supabase-api-keys';
import { cacheBuster$ } from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import { SupabaseSingleResponse } from './supabase-db.types';

const TEST_USER: SimpleUserModel = {
  created_at: '2026-01-01T00:00:00.000Z',
  email: 'dev@example.com',
  id: 'profile-1',
  updated_at: '2026-01-01T00:00:00.000Z'
};

const SLOT_ROW: ApiKeySlotRow = {
  created_at: '2026-07-01T00:00:00.000Z',
  id: 'key-1',
  key_prefix: 'pk_live_1234',
  label: 'Server key',
  last_used_at: null,
  monthly_quota_override: null,
  per_minute_quota_override: null,
  revoked_at: null,
  rotated_at: null,
  tier_code: 'free'
};

const USAGE_ROW: ApiKeyUsageMonthlyRow = {
  key_id: 'key-1',
  month: '2026-07-01',
  updated_at: '2026-07-24T12:00:00.000Z',
  used: 123
};

function successResponse<Row>(data: Row | null): SupabaseSingleResponse<Row | null> {
  return {
    count: null,
    data,
    error: null,
    status: 200,
    statusText: 'OK'
  };
}

function errorResponse<Row>(message: string): SupabaseSingleResponse<Row | null> {
  return {
    count: null,
    data: null,
    error: {
      code: '42501',
      details: '',
      hint: '',
      message,
      name: 'PostgrestError'
    },
    status: 403,
    statusText: 'Forbidden'
  };
}

class FakeFilterBuilder<Row> implements ApiKeysFilterBuilder<Row> {
  readonly eqCalls: Array<{ column: string; value: string }> = [];
  readonly orderCalls: Array<{ column: string; ascending: boolean }> = [];
  readonly limitCalls: number[] = [];
  maybeSingleCalled = false;

  constructor(public response: SupabaseSingleResponse<Row | null>) {}

  eq(column: string, value: string): ApiKeysFilterBuilder<Row> {
    this.eqCalls.push({ column, value });
    return this;
  }

  order(column: string, options: { ascending: boolean }): ApiKeysFilterBuilder<Row> {
    this.orderCalls.push({ column, ascending: options.ascending });
    return this;
  }

  limit(count: number): ApiKeysFilterBuilder<Row> {
    this.limitCalls.push(count);
    return this;
  }

  maybeSingle(): PromiseLike<SupabaseSingleResponse<Row | null>> {
    this.maybeSingleCalled = true;
    return this;
  }

  then<TResult1 = SupabaseSingleResponse<Row | null>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseSingleResponse<Row | null>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected);
  }
}

class FakeTableBuilder<Row> implements ApiKeysTableBuilder<Row> {
  selectedColumns: string | null = null;

  constructor(readonly filterBuilder: FakeFilterBuilder<Row>) {}

  select(columns: string): ApiKeysFilterBuilder<Row> {
    this.selectedColumns = columns;
    return this.filterBuilder;
  }
}

class FakeApiKeysClient implements ApiKeysSupabaseClient {
  readonly slotFilter = new FakeFilterBuilder<ApiKeySlotRow>(successResponse(SLOT_ROW));
  readonly usageFilter = new FakeFilterBuilder<ApiKeyUsageMonthlyRow>(successResponse(USAGE_ROW));
  readonly slotTable = new FakeTableBuilder(this.slotFilter);
  readonly usageTable = new FakeTableBuilder(this.usageFilter);
  readonly rpcCalls: Array<{ functionName: 'create_api_key' | 'revoke_api_key'; args: { p_label: string } | { p_id: string } }> = [];

  createResponse: SupabaseSingleResponse<CreateApiKeyRpcRow[]> = successResponse([
    {
      id: 'key-1',
      prefix: 'pk_live_1234',
      raw_key: 'patcher_raw_secret',
      tier: 'free'
    }
  ]);

  revokeResponse: SupabaseSingleResponse<undefined> = successResponse(undefined);

  from(table: 'api_keys'): ApiKeysTableBuilder<ApiKeySlotRow>;
  from(table: 'api_key_usage_monthly'): ApiKeysTableBuilder<ApiKeyUsageMonthlyRow>;
  from(table: 'api_keys' | 'api_key_usage_monthly'): ApiKeysTableBuilder<ApiKeySlotRow> | ApiKeysTableBuilder<ApiKeyUsageMonthlyRow> {
    return table === 'api_keys' ? this.slotTable : this.usageTable;
  }

  rpc(functionName: 'create_api_key', args: { p_label: string }): PromiseLike<SupabaseSingleResponse<CreateApiKeyRpcRow[]>>;
  rpc(functionName: 'revoke_api_key', args: { p_id: string }): PromiseLike<SupabaseSingleResponse<undefined>>;
  rpc(
    functionName: 'create_api_key' | 'revoke_api_key',
    args: { p_label: string } | { p_id: string }
  ): PromiseLike<SupabaseSingleResponse<CreateApiKeyRpcRow[] | undefined>> {
    this.rpcCalls.push({ functionName, args });
    return Promise.resolve(functionName === 'create_api_key' ? this.createResponse : this.revokeResponse);
  }
}

describe('createApiKeysNamespace', () => {
  it('reads the owner key slot with explicit safe columns', async () => {
    const client = new FakeApiKeysClient();
    const namespace = createApiKeysNamespace(client, () => of(TEST_USER));

    const result = await firstValueFrom(namespace.getOwnKeySlot());

    expect(client.slotTable.selectedColumns).toBe(API_KEY_SLOT_COLUMNS);
    expect(client.slotTable.selectedColumns).not.toContain('*');
    expect(client.slotTable.selectedColumns).not.toContain('key_hash');
    expect(client.slotFilter.eqCalls).toContain(jasmine.objectContaining({
      column: 'profile_id',
      value: TEST_USER.id
    }));
    expect(client.slotFilter.limitCalls).toEqual([1]);
    expect(result?.keyPrefix).toBe('pk_live_1234');
  });

  it('reads current month usage with explicit columns', async () => {
    const client = new FakeApiKeysClient();
    const namespace = createApiKeysNamespace(client, () => of(TEST_USER));

    const result = await firstValueFrom(namespace.getOwnUsage('key-1', '2026-07-01'));

    expect(client.usageTable.selectedColumns).toBe(API_KEY_USAGE_MONTHLY_COLUMNS);
    expect(client.usageTable.selectedColumns).not.toContain('*');
    expect(client.usageFilter.eqCalls).toEqual([
      { column: 'key_id', value: 'key-1' },
      { column: 'month', value: '2026-07-01' }
    ]);
    expect(result?.used).toBe(123);
  });

  it('calculates the UTC month bucket', () => {
    expect(currentApiUsageMonth(new Date('2026-07-24T23:30:00.000Z'))).toBe('2026-07-01');
  });

  it('calls create_api_key and busts API key cache after creation', async () => {
    const client = new FakeApiKeysClient();
    const namespace = createApiKeysNamespace(client, () => of(TEST_USER));
    const cacheBust = firstValueFrom(cacheBuster$.pipe(take(1)));

    const result = await firstValueFrom(namespace.createOrRotateOwnKey('Server key'));

    expect(client.rpcCalls).toContain(jasmine.objectContaining({
      functionName: 'create_api_key',
      args: { p_label: 'Server key' }
    }));
    expect(result.rawKey).toBe('patcher_raw_secret');
    await expectAsync(cacheBust).toBeResolvedTo(['apiKeys']);
  });

  it('calls revoke_api_key and busts API key cache after revocation', async () => {
    const client = new FakeApiKeysClient();
    const namespace = createApiKeysNamespace(client, () => of(TEST_USER));
    const cacheBust = firstValueFrom(cacheBuster$.pipe(take(1)));

    await firstValueFrom(namespace.revokeOwnKey('key-1'));

    expect(client.rpcCalls).toContain(jasmine.objectContaining({
      functionName: 'revoke_api_key',
      args: { p_id: 'key-1' }
    }));
    await expectAsync(cacheBust).toBeResolvedTo(['apiKeys']);
  });

  it('propagates Supabase read errors', async () => {
    const client = new FakeApiKeysClient();
    client.slotFilter.maybeSingleCalled = false;
    client.slotFilter.eqCalls.length = 0;
    client.slotFilter.orderCalls.length = 0;
    client.slotFilter.limitCalls.length = 0;
    client.slotFilter.response = errorResponse<ApiKeySlotRow>('denied');
    const namespace = createApiKeysNamespace(client, () => of(TEST_USER));

    await expectAsync(firstValueFrom(namespace.getOwnKeySlot())).toBeRejectedWith(
      jasmine.objectContaining({ code: '42501', message: 'denied' })
    );
  });

  it('propagates auth-required errors before RPC calls', async () => {
    const client = new FakeApiKeysClient();
    const namespace = createApiKeysNamespace(client, () => of(null));

    await expectAsync(firstValueFrom(namespace.createOrRotateOwnKey('Server key'))).toBeRejectedWith(
      jasmine.objectContaining({ code: '28000' })
    );
    expect(client.rpcCalls).toEqual([]);
  });
});
