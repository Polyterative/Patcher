import {
  createHyperdriveApiUsageReporter,
  type ApiUsageReporter,
  type HyperdriveBinding,
} from './database.ts';
import { consumeQuota, type QuotaLimits, type QuotaState } from './quota.ts';
import { allowedResponse, blockedResponse } from './quota-response.ts';

interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
}

interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  transaction<T>(closure: (transaction: DurableObjectTransactionLike) => Promise<T>): Promise<T>;
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
}

interface DurableObjectTransactionLike {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
}

export interface PublicApiQuotaEnv {
  HYPERDRIVE?: HyperdriveBinding;
}

export interface ApiKeyCounterTestOptions {
  clock?: () => Date;
  reporter?: ApiUsageReporter;
  logger?: Pick<Console, 'error'>;
}

interface StoredCounter {
  keyId: string;
  monthStart: string;
  minuteStart: string;
  usedMonth: number;
  usedMinute: number;
}

interface StoredLimits {
  keyId: string;
  monthlyQuota: number;
  perMinuteQuota: number;
}

interface ReportEntry {
  keyId: string;
  monthStart: string;
  pendingCount: number;
  flushedCount: number;
}

interface ReportState {
  entries: Record<string, ReportEntry>;
  flushRetriesTotal: number;
  consecutiveFailures: number;
}

type ParsedConsumePayload =
  | { ok: true; keyId: string; limits: QuotaLimits }
  | { ok: false; code: string; message: string };

const COUNTER_KEY = 'counter';
const LIMITS_KEY = 'limits';
const REPORTS_KEY = 'usageReports';
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const FLUSH_THRESHOLD = 500;
const RETRY_DELAYS_MS = [30 * 1000, FIVE_MINUTES_MS, 30 * 60 * 1000] as const;

export class ApiKeyCounter {
  private readonly state: DurableObjectStateLike;
  private readonly env: PublicApiQuotaEnv;
  private readonly clock: () => Date;
  private readonly reporter?: ApiUsageReporter;
  private readonly logger: Pick<Console, 'error'>;

  constructor(
    state: DurableObjectStateLike,
    env: PublicApiQuotaEnv,
    testOptions: ApiKeyCounterTestOptions = {}
  ) {
    this.state = state;
    this.env = env;
    this.clock = testOptions.clock ?? (() => new Date());
    this.reporter = testOptions.reporter;
    this.logger = testOptions.logger ?? console;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/consume') {
      return jsonResponse(404, { error: { code: 'not_found', message: 'Route not found' } });
    }
    if (request.method !== 'POST') {
      return jsonResponse(405, {
        error: { code: 'method_not_allowed', message: 'Only POST is supported' },
      }, { Allow: 'POST' });
    }

    const payload = await parseConsumePayload(request);
    if (!payload.ok) {
      return jsonResponse(400, { error: { code: payload.code, message: payload.message } });
    }

    let consumeResult: Awaited<ReturnType<ApiKeyCounter['consume']>>;
    try {
      consumeResult = await this.consume(payload.keyId, payload.limits, this.clock());
    } catch (error: unknown) {
      if (error instanceof KeyMismatchError) {
        return jsonResponse(409, {
          error: { code: 'key_id_mismatch', message: 'Durable Object key identity mismatch' },
        });
      }
      throw error;
    }

    if (consumeResult.shouldFlushNow) {
      const flushed = await this.flushReports('threshold');
      if (flushed) {
        await this.ensureFlushAlarm(FIVE_MINUTES_MS);
      }
    } else {
      await this.ensureFlushAlarm(FIVE_MINUTES_MS);
    }

    if (!consumeResult.result.allowed) {
      return blockedResponse(consumeResult.result, payload.limits);
    }
    return allowedResponse(consumeResult.result, payload.limits);
  }

  async alarm(): Promise<void> {
    const flushed = await this.flushReports('alarm');
    if (flushed) {
      await this.ensureFlushAlarm(FIVE_MINUTES_MS);
    }
  }

  private async consume(keyId: string, limits: QuotaLimits, now: Date): Promise<{
    result: ReturnType<typeof consumeQuota>;
    shouldFlushNow: boolean;
  }> {
    return this.state.storage.transaction(async transaction => {
      const counter = await transaction.get<StoredCounter>(COUNTER_KEY);
      const storedLimits = await transaction.get<StoredLimits>(LIMITS_KEY);
      const knownKeyId = counter?.keyId ?? storedLimits?.keyId;
      if (knownKeyId !== undefined && knownKeyId !== keyId) {
        throw new KeyMismatchError();
      }

      const reports = normalizeReportState(await transaction.get<ReportState>(REPORTS_KEY));
      if (counter && counter.monthStart !== utcMonthStart(now) && counter.usedMonth > 0) {
        enqueueReport(reports, keyId, counter.monthStart, counter.usedMonth);
      }

      const currentState = counterToQuotaState(counter);
      const result = consumeQuota(currentState, limits, now);
      const nextLimits: StoredLimits = {
        keyId,
        monthlyQuota: limits.monthly,
        perMinuteQuota: limits.perMinute,
      };
      await transaction.put(LIMITS_KEY, nextLimits);

      if (!result.allowed) {
        await putOrDeleteReports(transaction, reports);
        return { result, shouldFlushNow: shouldFlushImmediately(reports) };
      }

      await transaction.put(COUNTER_KEY, {
        keyId,
        monthStart: result.state.monthStart,
        minuteStart: result.state.minuteStart,
        usedMonth: result.state.usedMonth,
        usedMinute: result.state.usedMinute,
      } satisfies StoredCounter);
      enqueueReport(reports, keyId, result.state.monthStart, result.state.usedMonth);
      await transaction.put(REPORTS_KEY, reports);

      return { result, shouldFlushNow: shouldFlushImmediately(reports) };
    });
  }

  private async flushReports(trigger: 'alarm' | 'threshold'): Promise<boolean> {
    const reports = normalizeReportState(await this.state.storage.get<ReportState>(REPORTS_KEY));
    const dueReports = Object.values(reports.entries)
      .filter(entry => entry.pendingCount > entry.flushedCount)
      .sort((left, right) => left.monthStart.localeCompare(right.monthStart));
    if (dueReports.length === 0) {
      await this.resetRetryState();
      return true;
    }

    const reporter = this.reporter
      ?? (this.env.HYPERDRIVE ? createHyperdriveApiUsageReporter(this.env.HYPERDRIVE) : undefined);
    if (!reporter) {
      await this.recordFlushFailure(trigger, dueReports, new Error('usage reporter binding is not configured'));
      return false;
    }

    for (const report of dueReports) {
      try {
        await reporter.recordApiKeyUsage(report.keyId, report.monthStart, report.pendingCount);
        await this.confirmReport(report.monthStart, report.pendingCount);
      } catch (error: unknown) {
        await this.recordFlushFailure(trigger, [report], error);
        return false;
      }
    }
    await this.resetRetryState();
    return true;
  }

  private async confirmReport(monthStart: string, confirmedCount: number): Promise<void> {
    await this.state.storage.transaction(async transaction => {
      const reports = normalizeReportState(await transaction.get<ReportState>(REPORTS_KEY));
      const counter = await transaction.get<StoredCounter>(COUNTER_KEY);
      const current = reports.entries[monthStart];
      if (!current) {
        return;
      }
      if (current.pendingCount <= confirmedCount) {
        if (counter?.monthStart === monthStart) {
          reports.entries[monthStart] = {
            ...current,
            pendingCount: confirmedCount,
            flushedCount: confirmedCount,
          };
        } else {
          delete reports.entries[monthStart];
        }
      } else {
        reports.entries[monthStart] = {
          ...current,
          flushedCount: Math.max(current.flushedCount, confirmedCount),
        };
      }
      await putOrDeleteReports(transaction, reports);
    });
  }

  private async resetRetryState(): Promise<void> {
    await this.state.storage.transaction(async transaction => {
      const reports = normalizeReportState(await transaction.get<ReportState>(REPORTS_KEY));
      if (reports.flushRetriesTotal === 0 && reports.consecutiveFailures === 0) {
        return;
      }
      reports.consecutiveFailures = 0;
      await putOrDeleteReports(transaction, reports);
    });
  }

  private async recordFlushFailure(
    trigger: 'alarm' | 'threshold',
    dueReports: ReportEntry[],
    error: unknown
  ): Promise<void> {
    const nextState = await this.state.storage.transaction(async transaction => {
      const reports = normalizeReportState(await transaction.get<ReportState>(REPORTS_KEY));
      reports.flushRetriesTotal += 1;
      reports.consecutiveFailures += 1;
      await putOrDeleteReports(transaction, reports);
      return {
        flushRetriesTotal: reports.flushRetriesTotal,
        consecutiveFailures: reports.consecutiveFailures,
      };
    });
    const retryDelayMs = retryDelayFor(nextState.consecutiveFailures);
    this.logger.error(JSON.stringify({
      event: 'public_api_usage_flush_failed',
      trigger,
      key_id: dueReports[0]?.keyId ?? null,
      month_starts: dueReports.map(report => report.monthStart),
      pending_counts: dueReports.map(report => report.pendingCount),
      flush_retries_total: nextState.flushRetriesTotal,
      consecutive_failures: nextState.consecutiveFailures,
      retry_delay_ms: retryDelayMs,
      error: errorMessage(error),
    }));
    const now = this.clock().getTime();
    const target = now + retryDelayMs;
    const currentAlarm = await this.state.storage.getAlarm();
    if (currentAlarm === null || currentAlarm <= now || currentAlarm > target) {
      await this.state.storage.setAlarm(target);
    }
  }

  private async ensureFlushAlarm(maxDelayMs: number): Promise<void> {
    const reports = normalizeReportState(await this.state.storage.get<ReportState>(REPORTS_KEY));
    if (reports.consecutiveFailures > 0 || maxReportDelta(reports) <= 0) {
      return;
    }

    const target = this.clock().getTime() + maxDelayMs;
    const currentAlarm = await this.state.storage.getAlarm();
    if (currentAlarm === null || currentAlarm > target) {
      await this.state.storage.setAlarm(target);
    }
  }
}

class KeyMismatchError extends Error {}

async function parseConsumePayload(request: Request): Promise<ParsedConsumePayload> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { ok: false, code: 'invalid_json', message: 'Request body must be valid JSON' };
  }

  if (!payload || typeof payload !== 'object') {
    return { ok: false, code: 'malformed_payload', message: 'Request body must be an object' };
  }
  const body = payload as Record<string, unknown>;
  const limits = body['limits'];
  if (typeof body['keyId'] !== 'string' || !isUuid(body['keyId'])) {
    return { ok: false, code: 'malformed_payload', message: 'keyId must be a UUID string' };
  }
  if (!limits || typeof limits !== 'object') {
    return { ok: false, code: 'malformed_payload', message: 'limits must be an object' };
  }
  const limitsRecord = limits as Record<string, unknown>;
  if (!isPositiveInteger(limitsRecord['monthly']) || !isPositiveInteger(limitsRecord['perMinute'])) {
    return {
      ok: false,
      code: 'malformed_payload',
      message: 'limits.monthly and limits.perMinute must be positive integers',
    };
  }

  return {
    ok: true,
    keyId: body['keyId'],
    limits: {
      monthly: limitsRecord['monthly'],
      perMinute: limitsRecord['perMinute'],
    },
  };
}

function jsonResponse(status: number, body: unknown, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function counterToQuotaState(counter: StoredCounter | undefined): QuotaState | null {
  if (!counter) {
    return null;
  }
  return {
    monthStart: counter.monthStart,
    minuteStart: counter.minuteStart,
    usedMonth: counter.usedMonth,
    usedMinute: counter.usedMinute,
  };
}

function normalizeReportState(value: ReportState | undefined): ReportState {
  return value ?? { entries: {}, flushRetriesTotal: 0, consecutiveFailures: 0 };
}

function enqueueReport(
  reports: ReportState,
  keyId: string,
  monthStart: string,
  pendingCount: number
): void {
  const current = reports.entries[monthStart];
  reports.entries[monthStart] = {
    keyId,
    monthStart,
    pendingCount: Math.max(current?.pendingCount ?? 0, pendingCount),
    flushedCount: current?.flushedCount ?? 0,
  };
}

async function putOrDeleteReports(
  transaction: DurableObjectTransactionLike,
  reports: ReportState
): Promise<void> {
  if (Object.keys(reports.entries).length === 0 && reports.consecutiveFailures === 0) {
    await transaction.delete(REPORTS_KEY);
    return;
  }
  await transaction.put(REPORTS_KEY, reports);
}

function maxReportDelta(reports: ReportState): number {
  return Object.values(reports.entries).reduce(
    (max, entry) => Math.max(max, entry.pendingCount - entry.flushedCount),
    0
  );
}

function shouldFlushImmediately(reports: ReportState): boolean {
  return reports.consecutiveFailures === 0 && maxReportDelta(reports) >= FLUSH_THRESHOLD;
}

function retryDelayFor(consecutiveFailures: number): number {
  return RETRY_DELAYS_MS[Math.min(consecutiveFailures - 1, RETRY_DELAYS_MS.length - 1)];
}

function utcMonthStart(value: Date): string {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)).toISOString();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
