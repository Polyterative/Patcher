import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  Session,
  User
} from '@supabase/supabase-js';
import { ReplaySubject } from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  createPasswordResetError,
  getSettledAuthSession$,
  isValidEmail,
  mapRichUserSession,
  mapSimpleUserSession
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
});
