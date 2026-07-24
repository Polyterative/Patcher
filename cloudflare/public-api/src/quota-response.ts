import { type QuotaLimits, type QuotaState, consumeQuota } from './quota.ts';

export const QUOTA_HEADER_NAMES = [
  'retry-after',
  'x-ratelimit-limit-minute',
  'x-ratelimit-remaining-minute',
  'x-ratelimit-limit-month',
  'x-ratelimit-remaining-month',
  'x-ratelimit-reset',
] as const;

export function allowedResponse(
  result: Extract<ReturnType<typeof consumeQuota>, { allowed: true }>,
  limits: QuotaLimits
): Response {
  return jsonResponse(200, {
    allowed: true,
    limits: { monthly: limits.monthly, per_minute: limits.perMinute },
    remaining: {
      month: result.remainingMonth,
      minute: result.remainingMinute,
    },
    windows: windowMetadata(result.state, limits),
  }, quotaHeaders(result.state, limits, result.remainingMonth, result.remainingMinute));
}

export function blockedResponse(
  result: Extract<ReturnType<typeof consumeQuota>, { allowed: false }>,
  limits: QuotaLimits
): Response {
  const remainingMonth = Math.max(0, limits.monthly - result.state.usedMonth);
  const remainingMinute = Math.max(0, limits.perMinute - result.state.usedMinute);
  return jsonResponse(429, {
    allowed: false,
    reason: result.window === 'minute'
      ? 'per_minute_quota_exceeded'
      : 'monthly_quota_exceeded',
    window: result.window,
    retry_after_seconds: result.retryAfterSeconds,
    limits: { monthly: limits.monthly, per_minute: limits.perMinute },
    windows: windowMetadata(result.state, limits),
  }, {
    ...quotaHeaders(result.state, limits, remainingMonth, remainingMinute),
    'Retry-After': String(result.retryAfterSeconds),
  });
}

export function quotaHeaders(
  state: QuotaState,
  limits: QuotaLimits,
  remainingMonth: number,
  remainingMinute: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit-Month': String(limits.monthly),
    'X-RateLimit-Limit-Minute': String(limits.perMinute),
    'X-RateLimit-Remaining-Month': String(Math.max(0, remainingMonth)),
    'X-RateLimit-Remaining-Minute': String(Math.max(0, remainingMinute)),
    'X-RateLimit-Reset': state.minuteStart,
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

function windowMetadata(state: QuotaState, limits: QuotaLimits): Record<string, unknown> {
  return {
    month: {
      start: state.monthStart,
      used: state.usedMonth,
      limit: limits.monthly,
      remaining: Math.max(0, limits.monthly - state.usedMonth),
    },
    minute: {
      start: state.minuteStart,
      used: state.usedMinute,
      limit: limits.perMinute,
      remaining: Math.max(0, limits.perMinute - state.usedMinute),
    },
  };
}
