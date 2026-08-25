import {
  isAuthApiError,
  isAuthRetryableFetchError,
  Session,
  User
} from '@supabase/supabase-js';
import {
  Observable,
  of,
  timer
} from 'rxjs';
import {
  filter,
  map,
  switchMap,
  take,
  timeout
} from 'rxjs/operators';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { Database } from 'src/backend/database.types';
import {
  RichUserModel,
  SimpleUserModel
} from './supabase.types';
import { type CachedEntity } from './supabase.cache';


export const AUTH_NULL_SESSION_SETTLE_TIMEOUT_MS = 1500;
export const OAUTH_CALLBACK_SESSION_TIMEOUT_MS = 10000;

/**
 * Outer settlement bound for `handleOAuthCallback$()`, independent of the
 * inner `OAUTH_CALLBACK_SESSION_TIMEOUT_MS`. The inner timeout only arms once
 * `authSession$` has emitted at least once; if the upstream auth observable
 * never emits at all, the inner timeout is never entered and the callback
 * would otherwise hang indefinitely. This outer bound guarantees settlement
 * (to `null`) regardless of whether `authSession$` ever emits.
 */
export const OAUTH_CALLBACK_TOTAL_TIMEOUT_MS = 12000;

/**
 * A password-recovery event observed by `SupabaseService`'s root
 * `onAuthStateChange` listener (`PASSWORD_RECOVERY`) or produced by a direct
 * `verifyRecoveryOtp$` call. `sessionId` is a stable, non-secret session
 * identifier (decoded from the access token's `session_id` claim) used only
 * to bind a `sessionStorage` marker to *this* login session — never a bearer
 * credential. `emittedAt` bounds how long a replayed event may still be
 * trusted (see `RECOVERY_EVENT_FRESHNESS_MS`).
 */
export interface RecoveryEventSession {
  readonly userId: string;
  readonly sessionId: string;
  readonly emittedAt: number;
}

/** How long a `passwordRecoverySession$` replay may still be trusted before it is treated as stale (see Decision 3(b)). */
export const RECOVERY_EVENT_FRESHNESS_MS = 15_000;

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return atob(padded);
}

/**
 * Reads the non-secret `session_id` claim from an access token's JWT payload,
 * without any signature verification — this is a UI-state fingerprint only,
 * never an authorization decision (the SDK's own bearer-token verification
 * remains the sole authorization boundary). Fails closed to `null` on any
 * malformed/unexpected shape.
 */
export function extractSessionId(accessToken: string): string | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1])) as {session_id?: unknown};
    return typeof payload.session_id === 'string' && payload.session_id.length > 0
      ? payload.session_id
      : null;
  } catch {
    return null;
  }
}

export const AUTH_CACHE_KEYS: CachedEntity[] = [
  'comments',
  'modules',
  'currentUserModules',
  'moduleWithId',
  'manufacturers',
  'patchConnections',
  'patchModuleInstances',
  'rackWithId',
  'patches',
  'currentUserComments'
];

export type AuthProfileFields = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'username' | 'public' | 'website' | 'avatar_url'
>;


export class PasswordResetError extends Error {
  constructor(
    public override message: string,
    public errorCode?: string | number,
    public statusCode?: string | number,
    public details?: string
  ) {
    super(message);
    this.name = 'PasswordResetError';
  }
}

const PASSWORD_RESET_RATE_LIMIT_CODES = new Set([
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'over_sms_send_rate_limit',
  'rate_limit',
  'rate_limited',
  'too_many_requests'
]);

const PASSWORD_RESET_RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

type PasswordUpdateProviderError = {
  status?: string | number;
  statusCode?: string | number;
  code?: string | number;
  error_code?: string;
  error_description?: string;
  message?: string;
  msg?: string;
  name?: string;
} | null | undefined;

function normalizeErrorToken(value: string | number | undefined): string | number | undefined {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

function toNumericStatus(statusCode: string | number | undefined): number | undefined {
  if (typeof statusCode === 'number') {
    return Number.isFinite(statusCode) ? statusCode : undefined;
  }
  if (typeof statusCode === 'string' && statusCode.trim()) {
    const parsed = Number(statusCode);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function getSettledAuthSession$(
  authSession$: Observable<Session | null>,
  nullSessionTimeoutMs = AUTH_NULL_SESSION_SETTLE_TIMEOUT_MS
): Observable<Session | null> {
  return authSession$.pipe(
    take(1),
    switchMap(session => {
      if (session) return of(session);
      return authSession$.pipe(
        filter((nextSession): nextSession is Session => !!nextSession),
        take(1),
        timeout({
          first: nullSessionTimeoutMs,
          with: () => of(null)
        })
      );
    })
  );
}

/**
 * Resolves once the SDK's own auth initialization for *this* page load has
 * genuinely settled — reusing `getSettledAuthSession$`'s existing bound
 * (same worst-case wait already relied on by marker-restore/fingerprint
 * checks) plus one further deterministic macrotask tick.
 *
 * The extra tick exists because auth-js's implicit/hash recovery flow
 * (`GoTrueClient._initialize()`, verified against `@supabase/auth-js`
 * 2.99.3) defers its own `PASSWORD_RECOVERY` notification via a bare
 * `setTimeout(fn, 0)` that is scheduled *before* `initializePromise`
 * resolves — so by the time `authSession$` fires its first
 * (`INITIAL_SESSION`-driven) event, that recovery notification's macrotask
 * is already enqueued (if one is coming at all). Because macrotasks run in
 * FIFO scheduling order, a zero-delay timer scheduled only *after* observing
 * that first event is guaranteed to run after it. This closes the fallback
 * without racing a slow-but-legitimate hash recovery however long its own
 * network round trip took — replacing a fixed wall-clock guess with a
 * settlement condition tied to the SDK's actual lifecycle.
 */
export function getAuthInitializationSettled$(
  authSession$: Observable<Session | null>,
  nullSessionTimeoutMs = AUTH_NULL_SESSION_SETTLE_TIMEOUT_MS
): Observable<void> {
  return getSettledAuthSession$(authSession$, nullSessionTimeoutMs).pipe(
    switchMap(() => timer(0)),
    map(() => undefined)
  );
}

export function mapSimpleUserSession(session: Session | null): SimpleUserModel | null {
  if (session == null) return null;
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

export function mapLoginUser(user: User, profile: AuthProfileFields): RichUserModel {
  return {
    ...user,
    username: profile.username,
    public: profile.public,
    website: profile.website,
    avatar_url: profile.avatar_url,
  };
}

export function mapRichUserSession(user: User, profile: AuthProfileFields): RichUserModel {
  const authProvider = (user.app_metadata?.['provider'] as string) || 'email';
  const authProviders = (user.app_metadata?.['providers'] as string[]) || [authProvider];

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
    username: profile.username,
    public: profile.public,
    website: profile.website,
    avatar_url: profile.avatar_url,
    auth_provider: authProvider,
    auth_providers: authProviders
  };
}

export function createPasswordUpdateError(error: unknown): PasswordResetError {
  if (error instanceof PasswordResetError) {
    return error;
  }

  if (isAuthRetryableFetchError(error)) {
    return classifyPasswordResetError(undefined, error.name, error.status);
  }

  if (isAuthApiError(error)) {
    return classifyPasswordResetError(error.message, error.code, error.status);
  }

  const resetError = error as PasswordUpdateProviderError;
  const errorCode = resetError?.error_code || resetError?.code || resetError?.name;
  const statusCode = resetError?.status ?? resetError?.statusCode;
  const message = resetError?.msg || resetError?.message || resetError?.error_description;

  return classifyPasswordResetError(message, errorCode, statusCode);
}

export function createPasswordResetError(error: unknown): PasswordResetError {
  return createPasswordUpdateError(error);
}

function classifyPasswordResetError(
  message: string | undefined,
  errorCode: string | number | undefined,
  statusCode: string | number | undefined
): PasswordResetError {
  const errorMessages = SharedConstants.messages.resetPassword;
  const normalizedCode = normalizeErrorToken(errorCode);
  const normalizedMessage = message?.toLowerCase() ?? '';
  const numericStatus = toNumericStatus(statusCode);

  if (
    normalizedCode === 'same_password'
    || normalizedMessage.includes('same password')
    || normalizedMessage.includes('different from')
  ) {
    return new PasswordResetError(errorMessages.samePassword, errorCode, statusCode);
  }
  if (
    normalizedCode === 'weak_password'
    || normalizedMessage.includes('weak password')
    || normalizedMessage.includes('password is too weak')
  ) {
    return new PasswordResetError(errorMessages.weakPassword, errorCode, statusCode);
  }
  if (
    normalizedCode === 'authretryablefetcherror'
    || (numericStatus !== undefined && PASSWORD_RESET_RETRYABLE_STATUS_CODES.has(numericStatus))
  ) {
    return new PasswordResetError(errorMessages.networkError, errorCode, statusCode);
  }
  if (
    numericStatus === 429
    || (typeof normalizedCode === 'string' && PASSWORD_RESET_RATE_LIMIT_CODES.has(normalizedCode))
    || normalizedMessage.includes('rate limit')
    || normalizedMessage.includes('too many requests')
  ) {
    return new PasswordResetError(errorMessages.rateLimited, errorCode, statusCode);
  }
  if (
    normalizedCode === 'network_error'
    || normalizedMessage.includes('network')
    || normalizedMessage.includes('fetch')
    || normalizedMessage.includes('offline')
    || normalizedMessage.includes('internet')
  ) {
    return new PasswordResetError(errorMessages.networkError, errorCode, statusCode);
  }
  if (
    normalizedCode === 'invalid_credentials'
    || normalizedCode === 'invalid_grant'
    || normalizedCode === 'session_not_found'
    || normalizedCode === 'missing_session'
    || normalizedCode === 'no_session'
    || normalizedCode === 'not_authenticated'
    || normalizedCode === 'auth_session_missing'
    || normalizedMessage.includes('invalid')
    || normalizedMessage.includes('expired')
    || normalizedMessage.includes('auth session')
    || normalizedMessage.includes('no session')
    || normalizedMessage.includes('missing session')
  ) {
    return new PasswordResetError(errorMessages.invalidSession, errorCode, statusCode);
  }

  return new PasswordResetError(errorMessages.resetFailed, errorCode, statusCode);
}

export function isPasswordResetRateLimited(error: unknown): boolean {
  if (!(error instanceof PasswordResetError)) return false;

  const normalizedCode = normalizeErrorToken(error.errorCode);
  const numericStatus = toNumericStatus(error.statusCode);

  return numericStatus === 429
    || (typeof normalizedCode === 'string' && PASSWORD_RESET_RATE_LIMIT_CODES.has(normalizedCode));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
