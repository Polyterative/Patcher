export interface QuotaLimits {
  monthly: number;
  perMinute: number;
}

export interface QuotaState {
  monthStart: string;
  minuteStart: string;
  usedMonth: number;
  usedMinute: number;
}

export type QuotaConsumeResult =
  | { allowed: true; state: QuotaState; remainingMonth: number; remainingMinute: number }
  | { allowed: false; state: QuotaState; retryAfterSeconds: number; window: 'minute' | 'month' };

export function consumeQuota(
  currentState: QuotaState | null,
  limits: QuotaLimits,
  now: Date
): QuotaConsumeResult {
  assertPositiveInteger(limits.monthly, 'monthly quota');
  assertPositiveInteger(limits.perMinute, 'per-minute quota');

  const monthStart = utcMonthStart(now);
  const minuteStart = utcMinuteStart(now);
  const state: QuotaState = {
    monthStart,
    minuteStart,
    usedMonth: currentState?.monthStart === monthStart ? currentState.usedMonth : 0,
    usedMinute: currentState?.minuteStart === minuteStart ? currentState.usedMinute : 0,
  };

  if (state.usedMinute >= limits.perMinute) {
    return {
      allowed: false,
      state,
      retryAfterSeconds: secondsUntilNextMinute(now),
      window: 'minute',
    };
  }

  if (state.usedMonth >= limits.monthly) {
    return {
      allowed: false,
      state,
      retryAfterSeconds: secondsUntilNextMonth(now),
      window: 'month',
    };
  }

  const nextState = {
    ...state,
    usedMonth: state.usedMonth + 1,
    usedMinute: state.usedMinute + 1,
  };
  return {
    allowed: true,
    state: nextState,
    remainingMonth: limits.monthly - nextState.usedMonth,
    remainingMinute: limits.perMinute - nextState.usedMinute,
  };
}

function utcMonthStart(value: Date): string {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)).toISOString();
}

function utcMinuteStart(value: Date): string {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes()
    )
  ).toISOString();
}

function secondsUntilNextMinute(value: Date): number {
  return 60 - value.getUTCSeconds();
}

function secondsUntilNextMonth(value: Date): number {
  const nextMonth = Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((nextMonth - value.getTime()) / 1000));
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}
