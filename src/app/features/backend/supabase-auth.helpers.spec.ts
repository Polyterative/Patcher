import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  AuthApiError,
  Session,
  User
} from '@supabase/supabase-js';
import { ReplaySubject } from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  createPasswordResetError,
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
    const error = createPasswordResetError({
      error_code: 'same_password',
      message: 'New password should be different from the old password.'
    });

    expect(error.name).toBe('PasswordResetError');
    expect(error.message).toBe(SharedConstants.messages.resetPassword.samePassword);
    expect(error.errorCode).toBe('same_password');
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
  });

  it('isPasswordResetRateLimited returns true for a PasswordResetError with statusCode 429 or errorCode over_email_send_rate_limit', () => {
    expect(isPasswordResetRateLimited(new PasswordResetError('msg', 'over_email_send_rate_limit', 429))).toBeTrue();
    expect(isPasswordResetRateLimited(new PasswordResetError('msg', undefined, 429))).toBeTrue();
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
