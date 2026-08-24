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
  getSettledAuthSession$,
  isPasswordResetRateLimited,
  isValidEmail,
  mapRichUserSession,
  mapSimpleUserSession,
  PasswordResetError
} from './supabase-auth.helpers';


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
});
