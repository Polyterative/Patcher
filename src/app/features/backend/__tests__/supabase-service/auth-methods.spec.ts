import {
  SimpleUserModel,
  SupabaseService
} from '../../supabase.service';
import { CachedEntity } from '../../supabase.cache';
import { PasswordResetError } from '../../supabase-auth.helpers';
import type { AuthError } from '@supabase/supabase-js';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  AuthSessionSubjectDouble,
  AuthSessionUserFixture,
  authSessionFixture,
  chainable,
  getAuthSessionSubjectDouble,
  getSupabaseClientDouble,
  SupabaseClientDouble
} from './supabase-query-test-doubles';


function authSessionUserFixture(
  id: string,
  email: string,
  appMetadata?: Record<string, unknown>
): AuthSessionUserFixture {
  return {
    id,
    email,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    ...(appMetadata ? {app_metadata: appMetadata} : {})
  };
}

describe('SupabaseService - auth methods', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  let authSession$: AuthSessionSubjectDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
    authSession$ = getAuthSessionSubjectDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('getUserSession$', () => {
    it('should return null when there is no active session', fakeAsync(() => {
      let user: SimpleUserModel | null | undefined;
      authSession$.next(null);
      
      service.auth.getUserSession$().subscribe({
        next: (sessionUser) => {
          user = sessionUser;
        },
        error: (err) => {
          fail(err);
        }
      });
      tick(1500);

      expect(user).toBeNull();
    }));

    it('should wait through an initial null auth event for a restored session', fakeAsync(() => {
      const mockSession = authSessionFixture(authSessionUserFixture('restored-user-id', 'restored@test.com'));
      let user: SimpleUserModel | null | undefined;

      authSession$.next(null);
      service.auth.getUserSession$().subscribe({
        next: (sessionUser) => {
          user = sessionUser;
        },
        error: (err) => {
          fail(err);
        }
      });
      tick(500);
      expect(user).toBeUndefined();

      authSession$.next(mockSession);
      tick();

      expect(user?.id).toBe('restored-user-id');
      expect(user?.email).toBe('restored@test.com');
    }));
    
    it('should return a SimpleUserModel when session is active', (done) => {
      const mockSession = authSessionFixture(authSessionUserFixture('session-user-id', 'session@test.com'));
      authSession$.next(mockSession);
      
      service.auth.getUserSession$().subscribe({
        next: (user) => {
          expect(user).not.toBeNull();
          expect(user.id).toBe('session-user-id');
          expect(user.email).toBe('session@test.com');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('getRichUserSession$', () => {
    it('should return null when session is null', fakeAsync(() => {
      let user: unknown;
      authSession$.next(null);
      
      service.auth.getRichUserSession$().subscribe({
        next: (sessionUser) => {
          user = sessionUser;
        },
        error: (err) => {
          fail(err);
        }
      });
      tick(1500);

      expect(user).toBeNull();
    }));
    
    it('should enrich user with username and auth_provider from session', (done) => {
      const sessionUser = authSessionUserFixture('rich-user-1', 'rich@test.com', {provider: 'google'});
      authSession$.next(authSessionFixture(sessionUser));
      
      const profileMock = chainable<{username: string}>({data: [{username: 'richuser'}], error: null});
      
      spyOn(supabaseClient, 'from').and.returnValue(profileMock);
      
      service.auth.getRichUserSession$().subscribe({
        next: (user) => {
          expect(user).not.toBeNull();
          expect(user.username).toBe('richuser');
          expect(user.email).toBe('rich@test.com');
          expect(user.auth_provider).toBe('google');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should return null when profile lookup returns no data', (done) => {
      const sessionUser = authSessionUserFixture('rich-user-without-profile', 'missing-profile@test.com', {provider: 'email'});
      authSession$.next(authSessionFixture(sessionUser));

      type ProfileLookupResponse = {
        data: null;
        error: null;
      };
      type ProfileQueryMock = {
        select: () => ProfileQueryMock;
        filter: () => ProfileQueryMock;
        then: Promise<ProfileLookupResponse>['then'];
      };
      const profileLookupResponse: ProfileLookupResponse = {data: null, error: null};
      const profileMock: ProfileQueryMock = {
        select: () => profileMock,
        filter: () => profileMock,
        then: (onfulfilled, onrejected) => Promise.resolve(profileLookupResponse).then(onfulfilled, onrejected)
      };

      spyOn(supabaseClient, 'from').and.returnValue(profileMock as never);

      service.auth.getRichUserSession$().subscribe({
        next: (user) => {
          expect(user).toBeNull();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('hasAdminRole$', () => {
    it('reacts to session role changes without recreating the auth stream', () => {
      const emitted: boolean[] = [];
      const subscription = service.auth.hasAdminRole$().subscribe(value => emitted.push(value));

      authSession$.next(authSessionFixture(authSessionUserFixture('admin-user-id', 'admin@test.com', {role: 'admin'})));
      authSession$.next(authSessionFixture(authSessionUserFixture('regular-user-id', 'regular@test.com', {role: 'user'})));

      expect(emitted.slice(-2)).toEqual([true, false]);
      subscription.unsubscribe();
    });
  });
  
  describe('signup$', () => {
    it('should error when username is empty string', (done) => {
      service.auth.signup$('', 'user@test.com', 'password123').subscribe({
        next: () => {
          fail('Should have errored for empty username');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('empty');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should error when username is whitespace-only', (done) => {
      service.auth.signup$('   ', 'user@test.com', 'password123').subscribe({
        next: () => {
          fail('Should have errored for whitespace-only username');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('empty');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should error when username is tab/newline whitespace', (done) => {
      service.auth.signup$('\t\n', 'user@test.com', 'password123').subscribe({
        next: () => {
          fail('Should have errored for whitespace-only username');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('empty');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should call supabase signUp with trimmed username when valid', (done) => {
      spyOn(supabaseClient.auth, 'signUp').and.returnValue(
        Promise.resolve({
          data: {
            user: {
              id: 'new-user-id',
              email: 'user@test.com',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            session: null
          },
          error: null
        })
      );
      
      service.auth.signup$('  validuser  ', 'user@test.com', 'password123').subscribe({
        next: (result) => {
          expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
            email: 'user@test.com',
            password: 'password123',
            options: {
              data: {
                username: 'validuser'
              }
            }
          });
          expect(result.requiresEmailConfirmation).toBeTrue();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('logoff$', () => {
    it('should call supabase signOut', (done) => {
      spyOn(supabaseClient.auth, 'signOut').and.returnValue(Promise.resolve({error: null}));
      
      service.auth.logoff$().subscribe({
        next: () => {
          expect(supabaseClient.auth.signOut).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should burst all caches before signing out', (done) => {
      spyOn(supabaseClient.auth, 'signOut').and.returnValue(Promise.resolve({error: null}));
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
      
      service.auth.logoff$().subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('patches');
          expect(bustedKeys).toContain('comments');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('resetPassword$', () => {
    it('should call resetPasswordForEmail when only email is provided', (done) => {
      spyOn(supabaseClient.auth, 'resetPasswordForEmail').and.returnValue(
        Promise.resolve({data: {}, error: null})
      );
      
      service.auth.resetPassword$('user@example.com').subscribe({
        next: () => {
          expect(supabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
            'user@example.com',
            jasmine.objectContaining({redirectTo: jasmine.any(String)})
          );
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return an error observable for invalid email', (done) => {
      service.auth.resetPassword$('not-an-email').subscribe({
        next: () => {
          fail('Should have errored for invalid email');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Invalid email');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should call updateUser when newPassword is provided (token-based reset)', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: {user: {}}, error: null})
      );
      
      service.auth.resetPassword$('ignored-token', 'NewPassword123').subscribe({
        next: () => {
          expect(supabaseClient.auth.updateUser).toHaveBeenCalledWith({password: 'NewPassword123'});
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should rethrow error when updateUser returns an error response', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: null, error: {message: 'Token expired', error_code: 'invalid_grant'}})
      );
      
      service.auth.resetPassword$('token', 'NewPass123').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err).toBeDefined();
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should wrap a send-email response.error as a PasswordResetError with real status/code, not message text', (done) => {
      spyOn(supabaseClient.auth, 'resetPasswordForEmail').and.returnValue(
        Promise.resolve({
          data: {},
          error: {
            message: 'Email rate limit exceeded',
            status: 429,
            code: 'over_email_send_rate_limit',
            name: 'AuthApiError'
          } as AuthError
        })
      );

      service.auth.resetPassword$('user@example.com').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err).toBeInstanceOf(PasswordResetError);
          expect(err.statusCode).toBe(429);
          expect(err.errorCode).toBe('over_email_send_rate_limit');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('updateUsername$', () => {
    it('should error when username is too short (< 3 chars)', (done) => {
      service.auth.updateUsername$('user1', 'ab').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('at least 3');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should error when username is too long (> 30 chars)', (done) => {
      service.auth.updateUsername$('user1', 'a'.repeat(31)).subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('30 characters');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should error when username contains invalid characters', (done) => {
      service.auth.updateUsername$('user1', 'invalid name!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('letters, numbers');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should call DB update with trimmed username on success', (done) => {
      const profileMock = chainable<{username: string}>({data: [{username: 'validname'}], error: null});
      
      spyOn(supabaseClient, 'from').and.returnValue(profileMock);
      const updateSpy = spyOn(profileMock, 'update').and.returnValue(profileMock);
      
      service.auth.updateUsername$('user-id-1', 'validname').subscribe({
        next: () => {
          expect(updateSpy).toHaveBeenCalledWith(
            jasmine.objectContaining({username: 'validname'})
          );
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('updatePassword$', () => {
    it('should call updateUser with the new password', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: {user: {}}, error: null})
      );
      
      service.auth.updatePassword$('mynewpassword').subscribe({
        next: () => {
          expect(supabaseClient.auth.updateUser).toHaveBeenCalledWith({password: 'mynewpassword'});
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should rethrow error when updateUser fails', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        Promise.resolve({data: null, error: {message: 'Weak password'}})
      );
      
      service.auth.updatePassword$('weak').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err) => {
          expect(err).toBeDefined();
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});
