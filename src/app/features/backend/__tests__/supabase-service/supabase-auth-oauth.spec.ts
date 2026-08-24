import {
  of,
  type Observable
} from 'rxjs';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import type {
  AuthError,
  User
} from '@supabase/supabase-js';
import {
  SupabaseService,
  type OAuthProvider,
  type RichUserModel
} from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  type AuthSessionSubjectDouble,
  authSessionFixture,
  getAuthSessionSubjectDouble,
  getSupabaseClientDouble,
  type PasswordResetProviderError,
  type SupabaseClientDouble
} from './supabase-query-test-doubles';
import { OAUTH_CALLBACK_TOTAL_TIMEOUT_MS } from '../../supabase-auth.helpers';


type OAuthUserFixture = User & {
  email: string;
  updated_at: string;
};

type OAuthAuthErrorFixture = Pick<AuthError, 'message'> & Partial<AuthError>;
type OAuthSignInOptions = {
  redirectTo: string;
  scopes: 'email';
};
type OAuthSignInCredentials = {
  provider: OAuthProvider;
  options: OAuthSignInOptions;
};
type OAuthAuthResponse = {
  data: {
    provider: OAuthProvider;
    url: string;
  } | null;
  error: OAuthAuthErrorFixture | null;
};
type OAuthSignInWithOAuth = (credentials: OAuthSignInCredentials) => Promise<OAuthAuthResponse>;
type OAuthSupabaseClientDouble = SupabaseClientDouble & {
  auth: SupabaseClientDouble['auth'] & {
    signInWithOAuth: OAuthSignInWithOAuth;
  };
};
type RichUserWithoutUsername = Omit<RichUserModel, 'username'> & {
  username: null;
};
type OAuthRichUserResult = RichUserModel | RichUserWithoutUsername | null;
type AuthNamespaceTestHarness = Omit<SupabaseService['auth'], 'getRichUserSession$' | 'handleOAuthCallback$'> & {
  getRichUserSession$: () => Observable<OAuthRichUserResult>;
  handleOAuthCallback$: () => Observable<OAuthRichUserResult>;
};
type OAuthProfileUpsertPayload = {
  id: string;
  email: string;
  username: string;
  confirmed: true;
  created_at: string;
  updated_at: string;
};
type OAuthProfileUpsertOptions = {
  onConflict: 'id';
  ignoreDuplicates: true;
};
type OAuthProfileWriteResponse = {
  data: null;
  error: null;
};

class OAuthProfileMutationMock implements PromiseLike<OAuthProfileWriteResponse> {
  readonly upsertSpy: jasmine.Spy<
    (values: OAuthProfileUpsertPayload, options: OAuthProfileUpsertOptions) => OAuthProfileMutationMock
  >;

  constructor(private readonly response: OAuthProfileWriteResponse = {data: null, error: null}) {
    this.upsertSpy = jasmine
      .createSpy<(values: OAuthProfileUpsertPayload, options: OAuthProfileUpsertOptions) => OAuthProfileMutationMock>('upsert')
      .and.callFake(() => this);
  }

  upsert(values: OAuthProfileUpsertPayload, options: OAuthProfileUpsertOptions): OAuthProfileMutationMock {
    return this.upsertSpy(values, options);
  }

  then<TResult1 = OAuthProfileWriteResponse, TResult2 = never>(
    onfulfilled?: ((value: OAuthProfileWriteResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected);
  }
}

function getOAuthSupabaseClientDouble(service: SupabaseService): OAuthSupabaseClientDouble {
  const client = getSupabaseClientDouble(service);
  if (!isOAuthSupabaseClientDouble(client)) {
    throw new Error('Supabase test setup did not expose an OAuth auth client double.');
  }

  return client;
}

function isOAuthSupabaseClientDouble(client: SupabaseClientDouble): client is OAuthSupabaseClientDouble {
  return typeof Reflect.get(client.auth, 'signInWithOAuth') === 'function';
}

function oauthUserFixture(id: string, email: string): OAuthUserFixture {
  return {
    id,
    email,
    created_at: '2026-07-21T00:00:00Z',
    updated_at: '2026-07-21T00:00:00Z',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {}
  };
}

function richUserFixture(id: string, email: string, username: string): RichUserModel {
  return {
    id,
    email,
    username,
    created_at: '2026-07-21T00:00:00Z',
    updated_at: '2026-07-21T00:00:00Z'
  };
}

function oauthSuccess(provider: OAuthProvider, url: string): OAuthAuthResponse {
  return {data: {provider, url}, error: null};
}

function oauthFailure(message: string): OAuthAuthResponse {
  return {data: null, error: {message}};
}

describe('SupabaseService - auth OAuth and helpers', () => {
  let service: SupabaseService;
  let supabaseClient: OAuthSupabaseClientDouble;
  let authSession$: AuthSessionSubjectDouble;
  let authNamespace: AuthNamespaceTestHarness;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getOAuthSupabaseClientDouble(service);
    authSession$ = getAuthSessionSubjectDouble(service);
    authNamespace = service.auth;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  // ── _isValidEmail ─────────────────────────────────────────────────────────
  
  describe('_isValidEmail', () => {
    const isValid = (email: string): boolean =>
      authNamespace._isValidEmail(email);
    
    it('should return true for a well-formed email', () => {
      expect(isValid('user@example.com')).toBeTrue();
      expect(isValid('a.b+c@sub.domain.io')).toBeTrue();
    });
    
    it('should return false for a string without @', () => {
      expect(isValid('notanemail')).toBeFalse();
    });
    
    it('should return false for a string without domain part', () => {
      expect(isValid('user@')).toBeFalse();
    });
    
    it('should return false for empty string', () => {
      expect(isValid('')).toBeFalse();
    });
  });
  
  // ── _createPasswordResetError ─────────────────────────────────────────────
  
  describe('_createPasswordResetError', () => {
    const create = (err: PasswordResetProviderError) =>
      authNamespace._createPasswordResetError(err);
    
    it('should map same_password error code', () => {
      const result = create({error_code: 'same_password', msg: 'same'});
      expect(result.message).toBeTruthy();
    });
    
    it('should map weak_password error code', () => {
      const result = create({error_code: 'weak_password', msg: 'weak'});
      expect(result.message).toBeTruthy();
    });
    
    it('should map invalid_credentials error code', () => {
      const result = create({error_code: 'invalid_credentials', msg: 'invalid'});
      expect(result.message).toBeTruthy();
    });
    
    it('should map network_error error code', () => {
      const result = create({error_code: 'network_error', msg: 'network'});
      expect(result.message).toBeTruthy();
    });
    
    it('should fall back to message for unknown error codes', () => {
      const result = create({error_code: 'unknown_xyz', msg: 'something went wrong'});
      expect(result.message).toBe('something went wrong');
    });
    
    it('should fall back to unknownError when no message', () => {
      const result = create({});
      expect(result.message).toBeTruthy(); // uses errorMessages.unknownError
    });
  });
  
  // ── loginWithOAuth$ ───────────────────────────────────────────────────────
  
  describe('loginWithOAuth$', () => {
    it('should call supabase.auth.signInWithOAuth with the provider', (done) => {
      spyOn(supabaseClient.auth, 'signInWithOAuth').and.returnValue(
        Promise.resolve(oauthSuccess('google', 'https://provider.com/auth'))
      );
      
      service.auth.loginWithOAuth$('google').subscribe({
        next: () => {
          expect(supabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith(
            jasmine.objectContaining({provider: 'google'})
          );
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should throw when signInWithOAuth returns an error', (done) => {
      spyOn(supabaseClient.auth, 'signInWithOAuth').and.returnValue(
        Promise.resolve(oauthFailure('OAuth error'))
      );
      
      service.auth.loginWithOAuth$('github').subscribe({
        next: () => {
          fail('should have errored');
          done();
        },
        error: (err) => {
          expect(err).toBeTruthy();
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should use a custom redirectTo when provided', (done) => {
      const signInWithOAuthSpy = spyOn(supabaseClient.auth, 'signInWithOAuth').and.returnValue(
        Promise.resolve(oauthSuccess('google', 'url'))
      );
      
      service.auth.loginWithOAuth$('google', 'https://myapp.com/callback').subscribe({
        next: () => {
          const callArgs = signInWithOAuthSpy.calls.first().args[0];
          expect(callArgs.options.redirectTo).toBe('https://myapp.com/callback');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── handleOAuthCallback$ ──────────────────────────────────────────────────
  
  describe('handleOAuthCallback$', () => {
    it('should return null when callback session never arrives', fakeAsync(() => {
      let result: unknown;
      authSession$.next(null);
      
      service.auth.handleOAuthCallback$().subscribe({
        next: (user) => {
          result = user;
        },
        error: (err) => {
          fail(err);
        }
      });
      tick(10000);

      expect(result).toBeNull();
    }));

    it('should settle to null when the auth session stream never emits at all (not even an initial null)', fakeAsync(() => {
      let result: unknown = 'not-yet';
      let settled = false;

      // Deliberately never call authSession$.next(...) — the outer timeout
      // must settle even though the inner switchMap projection is never entered.
      service.auth.handleOAuthCallback$().subscribe({
        next: (user) => {
          result = user;
          settled = true;
        },
        error: () => {
          settled = true;
        }
      });
      tick(OAUTH_CALLBACK_TOTAL_TIMEOUT_MS);

      expect(settled).toBeTrue();
      expect(result).toBeNull();
    }));

    it('should wait through an initial null auth event for the OAuth session', fakeAsync(() => {
      const mockUser = oauthUserFixture('delayed-user', 'delayed@example.com');
      const existingRichUser = richUserFixture('delayed-user', 'delayed@example.com', 'delayeduser');
      let result: OAuthRichUserResult | undefined;
      spyOn(authNamespace, 'getRichUserSession$').and.returnValue(of(existingRichUser));
      const ensureOAuthUserProfileSpy = spyOn(authNamespace, '_ensureOAuthUserProfile$').and.returnValue(of(void 0));

      authSession$.next(null);
      authNamespace.handleOAuthCallback$().subscribe({
        next: (user) => {
          result = user;
        },
        error: (err) => {
          fail(err);
        }
      });
      tick();
      expect(result).toBeUndefined();

      authSession$.next(authSessionFixture(mockUser));
      tick();

      expect(result).toEqual(existingRichUser);
      expect(ensureOAuthUserProfileSpy).not.toHaveBeenCalled();
    }));
    
    it('should return richUser directly when existing user has a proper username', (done) => {
      const mockUser = oauthUserFixture('existing-user', 'existing@example.com');
      authSession$.next(authSessionFixture(mockUser));
      
      const existingRichUser = richUserFixture('existing-user', 'existing@example.com', 'existinguser');
      spyOn(authNamespace, 'getRichUserSession$').and.returnValue(of(existingRichUser));
      const ensureOAuthUserProfileSpy = spyOn(authNamespace, '_ensureOAuthUserProfile$').and.returnValue(of(void 0));
      
      authNamespace.handleOAuthCallback$().subscribe({
        next: (result) => {
          expect(result).toEqual(existingRichUser);
          expect(ensureOAuthUserProfileSpy).not.toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should call _ensureOAuthUserProfile$ and re-fetch when user has no username (new user)', (done) => {
      const mockUser = oauthUserFixture('new-user', 'newuser@example.com');
      authSession$.next(authSessionFixture(mockUser));
      
      const userWithNoUsername: RichUserWithoutUsername = {
        id: 'new-user',
        email: 'newuser@example.com',
        username: null,
        created_at: '2026-07-21T00:00:00Z',
        updated_at: '2026-07-21T00:00:00Z'
      };
      const userWithTempUsername = {
        ...userWithNoUsername,
        username: 'newuser'
      };
      
      let getRichCallCount = 0;
      spyOn(authNamespace, 'getRichUserSession$').and.callFake(() => {
        getRichCallCount++;
        return getRichCallCount === 1 ? of(userWithNoUsername) : of(userWithTempUsername);
      });
      const ensureOAuthUserProfileSpy = spyOn(authNamespace, '_ensureOAuthUserProfile$').and.returnValue(of(void 0));
      
      authNamespace.handleOAuthCallback$().subscribe({
        next: (result) => {
          expect(ensureOAuthUserProfileSpy).toHaveBeenCalledWith(mockUser);
          expect(result?.username).toBe('newuser');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should call _ensureOAuthUserProfile$ and re-fetch when richUser is null (profile missing)', (done) => {
      const mockUser = oauthUserFixture('ghost-user', 'ghost@example.com');
      authSession$.next(authSessionFixture(mockUser));
      
      const createdProfile = richUserFixture('ghost-user', 'ghost@example.com', 'ghost');
      
      let getRichCallCount = 0;
      spyOn(authNamespace, 'getRichUserSession$').and.callFake(() => {
        getRichCallCount++;
        return getRichCallCount === 1 ? of(null) : of(createdProfile);
      });
      const ensureOAuthUserProfileSpy = spyOn(authNamespace, '_ensureOAuthUserProfile$').and.returnValue(of(void 0));
      
      authNamespace.handleOAuthCallback$().subscribe({
        next: (result) => {
          expect(ensureOAuthUserProfileSpy).toHaveBeenCalled();
          expect(result?.username).toBe('ghost');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── _ensureOAuthUserProfile$ ──────────────────────────────────────────────
  
  describe('_ensureOAuthUserProfile$', () => {
    it('should upsert a profile with user_ prefixed temp username (always)', (done) => {
      const profileMock = new OAuthProfileMutationMock();

      spyOn(supabaseClient, 'from').and.returnValue(profileMock);

      const mockUser = oauthUserFixture('oauth-user-1', 'john@example.com');

      authNamespace._ensureOAuthUserProfile$(mockUser).subscribe({
        next: () => {
          expect(profileMock.upsertSpy).toHaveBeenCalledWith(
            jasmine.objectContaining({id: 'oauth-user-1', username: 'user_oauth-us'}),
            jasmine.objectContaining({onConflict: 'id', ignoreDuplicates: true})
          );
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should use user_<id> when email is empty', (done) => {
      const profileMock = new OAuthProfileMutationMock();

      spyOn(supabaseClient, 'from').and.returnValue(profileMock);

      const mockUser = oauthUserFixture('abc12345-uuid', '');

      authNamespace._ensureOAuthUserProfile$(mockUser).subscribe({
        next: () => {
          const upserted = profileMock.upsertSpy.calls.first().args[0];
          expect(upserted.username).toContain('user_');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});