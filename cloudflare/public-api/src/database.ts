import postgres from 'postgres';

export type PostgresClient = postgres.Sql;

export interface HyperdriveBinding {
  connectionString: string;
}

export interface ApiKeyMetadata {
  id: string;
  profileId: string;
  tierCode: string;
  monthlyQuota: number;
  perMinuteQuota: number;
}

export interface ApiKeyMetadataProvider {
  verifyApiKeyHash(digestHex: string): Promise<ApiKeyMetadata | null>;
}

export interface ApiUsageReporter {
  recordApiKeyUsage(keyId: string, monthStart: string, usedMonth: number): Promise<void>;
}

interface ApiKeyVerificationRow {
  id: unknown;
  profile_id: unknown;
  tier_code: unknown;
  monthly_quota: unknown;
  per_minute_quota: unknown;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGEST_HEX_PATTERN = /^[0-9a-f]{64}$/;
const FIRST_DAY_PATTERN = /^\d{4}-\d{2}-01$/;

export function createHyperdriveApiKeyMetadataProvider(
  hyperdrive: HyperdriveBinding
): ApiKeyMetadataProvider {
  return {
    async verifyApiKeyHash(digestHex: string): Promise<ApiKeyMetadata | null> {
      assertDigestHex(digestHex);
      return withHyperdriveClient(hyperdrive, async sql => {
        const rows = await sql<ApiKeyVerificationRow[]>`
          select id, profile_id, tier_code, monthly_quota, per_minute_quota
          from public.verify_api_key(decode(${digestHex}, 'hex'))
        `;
        return normalizeVerifyApiKeyRows(rows);
      });
    },
  };
}

export function createHyperdriveApiUsageReporter(
  hyperdrive: HyperdriveBinding
): ApiUsageReporter {
  return {
    async recordApiKeyUsage(keyId: string, monthStart: string, usedMonth: number): Promise<void> {
      const report = normalizeRecordUsageInput(keyId, monthStart, usedMonth);
      await withHyperdriveClient(hyperdrive, async sql => {
        await sql`
          select public.record_api_key_usage(
            ${report.keyId}::uuid,
            ${report.monthStartDate}::date,
            ${report.usedMonth}::integer
          )
        `;
      });
    },
  };
}

export function normalizeVerifyApiKeyRows(
  rows: readonly ApiKeyVerificationRow[]
): ApiKeyMetadata | null {
  if (rows.length === 0) {
    return null;
  }
  if (rows.length > 1) {
    throw new Error('verify_api_key returned more than one row');
  }
  return normalizeVerifyApiKeyRow(rows[0]);
}

export function normalizeVerifyApiKeyRow(row: ApiKeyVerificationRow): ApiKeyMetadata {
  if (!isUuid(row.id) || !isUuid(row.profile_id)) {
    throw new Error('verify_api_key returned an invalid UUID');
  }
  if (typeof row.tier_code !== 'string' || row.tier_code.trim() === '') {
    throw new Error('verify_api_key returned an invalid tier');
  }
  if (!isPositiveInteger(row.monthly_quota) || !isPositiveInteger(row.per_minute_quota)) {
    throw new Error('verify_api_key returned invalid quotas');
  }
  return {
    id: row.id,
    profileId: row.profile_id,
    tierCode: row.tier_code,
    monthlyQuota: row.monthly_quota,
    perMinuteQuota: row.per_minute_quota,
  };
}

export function normalizeRecordUsageInput(
  keyId: string,
  monthStart: string,
  usedMonth: number
): { keyId: string; monthStartDate: string; usedMonth: number } {
  if (!isUuid(keyId)) {
    throw new Error('keyId must be a UUID');
  }
  if (!Number.isInteger(usedMonth) || usedMonth < 0) {
    throw new Error('usedMonth must be a nonnegative integer');
  }
  const monthStartDate = monthStart.slice(0, 10);
  if (!FIRST_DAY_PATTERN.test(monthStartDate)) {
    throw new Error('monthStart must be the first day of a month');
  }
  return { keyId, monthStartDate, usedMonth };
}

export async function withHyperdriveClient<T>(
  hyperdrive: HyperdriveBinding,
  operation: (sql: PostgresClient) => Promise<T>
): Promise<T> {
  const sql = postgres(hyperdrive.connectionString, {
    max: 5,
    fetch_types: false,
    prepare: true,
  });
  try {
    return await operation(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function assertDigestHex(value: string): void {
  if (!DIGEST_HEX_PATTERN.test(value)) {
    throw new Error('API key digest must be a SHA-256 hex string');
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
