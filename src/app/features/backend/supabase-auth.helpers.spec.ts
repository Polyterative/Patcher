import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  AuthApiError,
  AuthRetryableFetchError,
  Session,
  User
} from '@supabase/supabase-js';
import { ReplaySubject } from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  createPasswordResetError,
  createPasswordUpdateError,
  extractSessionId,
  getAuthInitializationSettled$,
  getSettledAuthSession$,
  isPasswordResetRateLimited,
  isValidEmail,
  mapRichUserSession,
  mapSimpleUserSession,
  PasswordResetError
} from './supabase-auth.helpers';

function base64url(payload: object): string {
  const json = JSON.stringify(payload);
  const base64 = typeof btoa === 'function'
    ? btoa(json)
    : Buffer.from(json).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


describe('supabase auth helpers', () => {
  function createSession(user: Partial<User>): Session {
    return {user} as Session;
  }

  it('waits through an initial null session for a restored session', fakeAsync(() => {
    const authSession$ = new ReplaySubject<Session | null>(1);
    const emitted: Array<Session | null> = [];

    authSession$.next(null);
    getSettledAuthSession$(authSession$, 1000).subscribe(session => emitted.push(session));
    tick(500);
    expect(emitted).toEqual([]);

    const restoredSession = createSession({id: 'restored-user'});
    authSession$.next(restoredSession);
    tick();

    expect(emitted).toEqual([restoredSession]);
  }));

  describe('getAuthInitializationSettled$', () => {
    it('does not settle before authSession$ has emitted at all, even well past the old fixed-timer window', fakeAsync(() => {
      const authSession$ = new ReplaySubject<Session | null>(1);
      let settled = false;

      getAuthInitializationSettled$(authSession$, 1500).subscribe(() => settled = true);

      tick(10000);
      expect(settled).toBeFalse();

      authSession$.next(null);
      tick(1500);
      tick();

      expect(settled).toBeTrue();
    }));

    it('settles one deterministic tick after the first authSession$ emission — reproducing the auth-js 2.99.3 implicit-recovery ordering where the deferred PASSWORD_RECOVERY notify (its own setTimeout(fn, 0), scheduled before initializePromise resolves) always runs first', fakeAsync(() => {
      const authSession$ = new ReplaySubject<Session | null>(1);
      const recoveredSession = createSession({id: 'recovered-user'});
      let settled = false;
      let recoveryObserved = false;

      // Simulate the SDK: authSession$ emits (INITIAL_SESSION) with the
      // already-saved recovered session, then a PASSWORD_RECOVERY-driven
      // side effect is scheduled via the SDK's own setTimeout(fn, 0) —
      // BEFORE our subscriber has a chance to schedule anything.
      authSession$.next(recoveredSession);
      setTimeout(() => { recoveryObserved = true; }, 0);

      getAuthInitializationSettled$(authSession$, 1500).subscribe(() => settled = true);

      // Flushing exactly one macrotask tick must resolve the SDK's
      // already-scheduled recovery notification strictly before our
      // settlement signal fires.
      tick(0);

      expect(recoveryObserved).toBeTrue();
      expect(settled).toBeTrue();
    }));

    it('never settles synchronously on subscribe, even when a session is already available — guaranteeing at least one tick for any already-scheduled recovery notification', fakeAsync(() => {
      const authSession$ = new ReplaySubject<Session | null>(1);
      authSession$.next(createSession({id: 'already-there'}));
      let settled = false;

      getAuthInitializationSettled$(authSession$, 1500).subscribe(() => settled = true);

      expect(settled).toBeFalse();
      tick();
      expect(settled).toBeTrue();
    }));
  });

  it('maps a basic session user without adding profile fields', () => {
    const session = createSession({
      id: 'simple-user',
      email: 'simple@test.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    });

    expect(mapSimpleUserSession(session)).toEqual({
      id: 'simple-user',
      email: 'simple@test.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    });
  });

  it('maps rich profile fields and linked auth providers from session metadata', () => {
    const user = {
      id: 'rich-user',
      email: 'rich@test.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      app_metadata: {
        provider: 'google',
        providers: ['email', 'google']
      }
    } as User;

    expect(mapRichUserSession(user, {
      username: 'richuser',
      public: true,
      website: 'https://example.com',
      avatar_url: 'https://example.com/avatar.png'
    })).toEqual({
      id: 'rich-user',
      email: 'rich@test.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      username: 'richuser',
      public: true,
      website: 'https://example.com',
      avatar_url: 'https://example.com/avatar.png',
      auth_provider: 'google',
      auth_providers: ['email', 'google']
    });
  });

  it('maps known reset password errors to user-safe messages', () => {
    const error = createPasswordUpdateError({
      error_code: 'same_password',
      status: 422,
      message: 'New password should be different from the old password.'
    });

    expect(error.name).toBe('PasswordResetError');
    expect(error.message).toBe(SharedConstants.messages.resetPassword.samePassword);
    expect(error.errorCode).toBe('same_password');
    expect(error.statusCode).toBe(422);
  });

  it('keeps createPasswordResetError as the backward-compatible password-update normalizer alias', () => {
    const result = createPasswordResetError({error_code: 'weak_password', status: 422, message: 'Weak password'});

    expect(result.message).toBe(SharedConstants.messages.resetPassword.weakPassword);
    expect(result.errorCode).toBe('weak_password');
    expect(result.statusCode).toBe(422);
  });

  it('does not double-wrap an already normalized password update error', () => {
    const normalized = new PasswordResetError(
      SharedConstants.messages.resetPassword.samePassword,
      'same_password',
      422
    );

    expect(createPasswordUpdateError(normalized)).toBe(normalized);
  });

  it('maps missing, invalid, or expired auth session failures to recovery-session guidance', () => {
    const sessionErrors = [
      {error_code: 'invalid_grant', status: 401, message: 'Token expired'},
      {error_code: 'session_not_found', status: 401, message: 'Auth session missing!'},
      {code: 'missing_session', status: 401, message: 'No auth session'}
    ];

    for (const providerError of sessionErrors) {
      const result = createPasswordUpdateError(providerError);

      expect(result.message).toBe(SharedConstants.messages.resetPassword.invalidSession);
      expect(result.statusCode).toBe(401);
    }
  });

  it('maps rate limiting and network failures to safe retryable messages while preserving metadata', () => {
    const rateLimited = createPasswordUpdateError({code: 'over_email_send_rate_limit', status: 429});
    const network = createPasswordUpdateError(new TypeError('Failed to fetch'));

    expect(rateLimited.message).toBe(SharedConstants.messages.resetPassword.rateLimited);
    expect(rateLimited.errorCode).toBe('over_email_send_rate_limit');
    expect(rateLimited.statusCode).toBe(429);
    expect(network.message).toBe(SharedConstants.messages.resetPassword.networkError);
    expect(network.errorCode).toBe('TypeError');
  });

  it('maps documented Supabase password update rate-limit codes to safe retry copy without requiring status 429', () => {
    const documentedRateLimitCodes = [
      'over_email_send_rate_limit',
      'over_request_rate_limit',
      'over_sms_send_rate_limit'
    ];

    for (const code of documentedRateLimitCodes) {
      const result = createPasswordUpdateError({
        error_code: code,
        status: 400,
        message: 'raw provider rate-limit text'
      });

      expect(result.message).toBe(SharedConstants.messages.resetPassword.rateLimited);
      expect(result.message).not.toContain('raw provider');
      expect(result.errorCode).toBe(code);
      expect(result.statusCode).toBe(400);
      expect(isPasswordResetRateLimited(result)).toBeTrue();
    }
  });

  it('maps AuthRetryableFetchError to safe network copy while preserving name/status metadata', () => {
    const result = createPasswordUpdateError(
      new AuthRetryableFetchError('raw temporary provider outage', 503)
    );

    expect(result.message).toBe(SharedConstants.messages.resetPassword.networkError);
    expect(result.message).not.toContain('raw temporary');
    expect(result.errorCode).toBe('AuthRetryableFetchError');
    expect(result.statusCode).toBe(503);
  });

  it('maps retryable HTTP 502/503/504 failures to safe network copy while preserving status metadata', () => {
    const statuses = [502, 503, 504];

    for (const status of statuses) {
      const result = createPasswordUpdateError({
        status,
        message: `raw temporary service failure ${ status }`
      });

      expect(result.message).toBe(SharedConstants.messages.resetPassword.networkError);
      expect(result.message).not.toContain('raw temporary');
      expect(result.errorCode).toBeUndefined();
      expect(result.statusCode).toBe(status);
    }
  });

  it('maps name/status-shaped AuthRetryableFetchError fixtures to safe network copy', () => {
    const result = createPasswordUpdateError({
      name: 'AuthRetryableFetchError',
      statusCode: '504',
      message: 'raw fixture outage'
    });

    expect(result.message).toBe(SharedConstants.messages.resetPassword.networkError);
    expect(result.message).not.toContain('raw fixture');
    expect(result.errorCode).toBe('AuthRetryableFetchError');
    expect(result.statusCode).toBe('504');
  });

  it('maps generic provider/server failures to safe copy without exposing raw provider text', () => {
    const result = createPasswordUpdateError({
      error_code: 'unexpected_provider_code',
      status: 500,
      message: 'raw provider failure with internal details'
    });

    expect(result.message).toBe(SharedConstants.messages.resetPassword.resetFailed);
    expect(result.message).not.toContain('raw provider');
    expect(result.errorCode).toBe('unexpected_provider_code');
    expect(result.statusCode).toBe(500);
  });

  it('classifies password-update categories from provider message text when no code is present', () => {
    const cases = [
      {
        input: {status: 422, message: 'New password should be different from the old password.'},
        expected: SharedConstants.messages.resetPassword.samePassword
      },
      {
        input: {status: 422, message: 'Password is too weak.'},
        expected: SharedConstants.messages.resetPassword.weakPassword
      },
      {
        input: {status: 401, message: 'Auth session missing or expired.'},
        expected: SharedConstants.messages.resetPassword.invalidSession
      }
    ];

    for (const testCase of cases) {
      expect(createPasswordUpdateError(testCase.input).message).toBe(testCase.expected);
    }
  });

  it('maps retryable HTTP status strings to safe network copy without exposing provider text', () => {
    const result = createPasswordUpdateError({
      statusCode: '504',
      message: 'upstream gateway timed out with provider internals'
    });

    expect(result.message).toBe(SharedConstants.messages.resetPassword.networkError);
    expect(result.message).not.toContain('provider internals');
    expect(result.statusCode).toBe('504');
  });

  it('sanitizes generic provider msg and error_description text while preserving metadata', () => {
    const msgResult = createPasswordUpdateError({
      code: 'provider_msg_only',
      msg: 'raw msg with internal auth provider detail'
    });
    const descriptionResult = createPasswordUpdateError({
      error_code: 'provider_description_only',
      error_description: 'raw description with internal auth provider detail'
    });

    expect(msgResult.message).toBe(SharedConstants.messages.resetPassword.resetFailed);
    expect(descriptionResult.message).toBe(SharedConstants.messages.resetPassword.resetFailed);
    expect(msgResult.errorCode).toBe('provider_msg_only');
    expect(descriptionResult.errorCode).toBe('provider_description_only');
  });

  it('validates basic email syntax', () => {
    expect(isValidEmail('user@example.com')).toBeTrue();
    expect(isValidEmail('not-an-email')).toBeFalse();
  });

  it('maps a real AuthApiError 429 rate-limit response onto statusCode/errorCode without reading message text', () => {
    const authApiError = new AuthApiError('Email rate limit exceeded', 429, 'over_email_send_rate_limit');

    const result = createPasswordResetError(authApiError);

    expect(result.statusCode).toBe(429);
    expect(result.errorCode).toBe('over_email_send_rate_limit');
    expect(result.message).toBe(SharedConstants.messages.resetPassword.rateLimited);
  });

  it('isPasswordResetRateLimited returns true for a PasswordResetError with statusCode 429 or errorCode over_email_send_rate_limit', () => {
    expect(isPasswordResetRateLimited(new PasswordResetError('msg', 'over_email_send_rate_limit', 429))).toBeTrue();
    expect(isPasswordResetRateLimited(new PasswordResetError('msg', 'over_request_rate_limit', 400))).toBeTrue();
    expect(isPasswordResetRateLimited(new PasswordResetError('msg', 'over_sms_send_rate_limit', 400))).toBeTrue();
    expect(isPasswordResetRateLimited(new PasswordResetError('msg', undefined, 429))).toBeTrue();
    expect(isPasswordResetRateLimited(new PasswordResetError('msg', undefined, '429'))).toBeTrue();
  });

  it('isPasswordResetRateLimited returns false for any other PasswordResetError or non-PasswordResetError value', () => {
    expect(isPasswordResetRateLimited(new PasswordResetError('msg', 'weak_password', 400))).toBeFalse();
    expect(isPasswordResetRateLimited(new Error('x'))).toBeFalse();
  });

  it('fallback (non-AuthApiError) branch preserves a string code as errorCode and leaves statusCode undefined when status is absent', () => {
    const result = createPasswordResetError({code: 'over_email_send_rate_limit'});

    expect(result.errorCode).toBe('over_email_send_rate_limit');
    expect(result.statusCode).toBeUndefined();
  });

  it('fallback (non-AuthApiError) branch never copies a numeric code into statusCode, so it cannot falsely trigger rate-limit classification', () => {
    const result = createPasswordResetError({code: 429});

    expect(result.statusCode).toBeUndefined();
    expect(isPasswordResetRateLimited(result)).toBeFalse();
  });

  it('extractSessionId reads the session_id claim from a well-formed access token', () => {
    const token = `${base64url({alg: 'none'})}.${base64url({session_id: 'sess-123', sub: 'user-1'})}.sig`;

    expect(extractSessionId(token)).toBe('sess-123');
  });

  it('extractSessionId returns null for a malformed or non-JWT-shaped token, never throwing', () => {
    const fixtures = ['not-a-jwt', 'a.b', 'a.{invalid-base64}.c'];

    for (const fixture of fixtures) {
      expect(() => extractSessionId(fixture)).not.toThrow();
      expect(extractSessionId(fixture)).toBeNull();
    }
  });

  it('extractSessionId fails closed (returns null) when the session_id claim is missing from an otherwise well-formed payload', () => {
    const token = `${base64url({alg: 'none'})}.${base64url({sub: 'user-1'})}.sig`;

    expect(extractSessionId(token)).toBeNull();
  });

  it('extractSessionId fails closed (returns null) when the session_id claim is an empty string', () => {
    const token = `${base64url({alg: 'none'})}.${base64url({session_id: '', sub: 'user-1'})}.sig`;

    expect(extractSessionId(token)).toBeNull();
  });
});
