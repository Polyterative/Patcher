import { SupabaseService } from '../../supabase.service';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


type AuthSessionTestHarness = {
  authSession$: {
    next: (session: {user: unknown} | null) => void;
  };
};

type ProfileResponse = {data: unknown; error: {message?: string} | null};

describe('SupabaseService - login flow', () => {
  let service: SupabaseService;
  let supabaseClient: any;
  let authSession$: AuthSessionTestHarness['authSession$'];
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
    authSession$ = (service as unknown as AuthSessionTestHarness).authSession$;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('login$', () => {
    function setupLoginMocks(
      userId = 'login-u1',
      username = 'testuser',
      profileResponses: ProfileResponse | ProfileResponse[] | null = null
    ) {
      const defaultProfileResponse = {data: [{username}], error: null};
      const queuedProfileResponses = Array.isArray(profileResponses)
        ? [...profileResponses]
        : [profileResponses || defaultProfileResponse];
      const mockAuthResponse = {
        data: {
          user: {id: userId, email: 'u@test.com', created_at: '2024-01-01Z', updated_at: '2024-01-01Z'},
          session: {access_token: 'tok'}
        },
        error: null
      };
      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve(mockAuthResponse)
      );
      
      spyOn(supabaseClient, 'from').and.callFake((_table: string) => {
        let operation: 'select' | 'update' | 'upsert' = 'select';
        const m: any = {};
        ['filter', 'eq'].forEach(method => {
          m[method] = () => m;
        });
        m.select = () => {
          operation = 'select';
          return m;
        };
        m.update = () => {
          operation = 'update';
          return m;
        };
        m.upsert = () => {
          operation = 'upsert';
          return m;
        };
        m.then = (res: Function, rej?: Function) => {
          const response = operation === 'select'
            ? queuedProfileResponses.shift() || defaultProfileResponse
            : {data: {}, error: null};
          return Promise.resolve(response).then(res as any, rej as any);
        };
        return m;
      });
    }
    
    it('should call signInWithPassword with email and password', (done) => {
      setupLoginMocks();
      
      service.auth.login$('u@test.com', 'pass123').subscribe({
        next: () => {
          expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'u@test.com',
            password: 'pass123'
          });
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return user with username from profiles table', (done) => {
      setupLoginMocks('u-fetch', 'myusername');

      service.auth.login$('u@test.com', 'pass').subscribe({
        next: (result: any) => {
          expect(result.user.username).toBe('myusername');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should recover a missing profile row after login', (done) => {
      setupLoginMocks('u-missing-profile', 'unused', [
        {data: [], error: null},
        {data: [{username: 'user_u-missin', public: false, website: null, avatar_url: null}], error: null}
      ]);

      service.auth.login$('u@test.com', 'pass').subscribe({
        next: (result: any) => {
          expect(result.user.username).toBe('user_u-missin');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should emit a controlled error when the profile lookup fails after login', (done) => {
      setupLoginMocks('u-profile-error', 'unused', {
        data: null,
        error: {message: 'Profile lookup failed'}
      });

      service.auth.login$('u@test.com', 'pass').subscribe({
        next: () => {
          fail('Expected profile lookup to error');
          done();
        },
        error: (err) => {
          expect(err).toEqual(jasmine.any(Error));
          expect(err.message).toBe('Profile lookup failed');
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should emit an error (not crash) when signInWithPassword returns an auth error', (done) => {
      const mockErrorResponse = {
        data: {user: null, session: null},
        error: {message: 'Invalid login credentials', status: 400}
      };
      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve(mockErrorResponse)
      );
      spyOn(supabaseClient, 'from').and.returnValue({} as any);

      service.auth.login$('bad@test.com', 'wrongpass').subscribe({
        next: () => {
          fail('Expected an error, got a value');
          done();
        },
        error: (err) => {
          expect(err).toBeDefined();
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('loginWithOAuth$', () => {
    it('should call signInWithOAuth with the specified provider', (done) => {
      spyOn(supabaseClient.auth, 'signInWithOAuth').and.returnValue(
        Promise.resolve({data: {provider: 'google', url: 'https://google.com/auth'}, error: null})
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
    
    it('should include a redirectTo in the OAuth options', (done) => {
      spyOn(supabaseClient.auth, 'signInWithOAuth').and.returnValue(
        Promise.resolve({data: {provider: 'github', url: 'https://github.com/auth'}, error: null})
      );
      
      service.auth.loginWithOAuth$('github').subscribe({
        next: () => {
          const callArgs = (supabaseClient.auth.signInWithOAuth as jasmine.Spy).calls.first().args[0];
          expect(callArgs.options?.redirectTo).toBeDefined();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should throw when the OAuth response contains an error', (done) => {
      spyOn(supabaseClient.auth, 'signInWithOAuth').and.returnValue(
        Promise.resolve({data: null, error: {message: 'OAuth provider unavailable'}})
      );
      
      service.auth.loginWithOAuth$('google').subscribe({
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
  
  describe('handleOAuthCallback$', () => {
    it('should return null when session is missing', fakeAsync(() => {
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
    
    it('should return null when auth restoration does not produce a session', fakeAsync(() => {
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

    it('should return a rich user when the callback session settles after an initial null event', fakeAsync(() => {
      const sessionUser = {
        id: 'oauth-user',
        email: 'oauth@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        app_metadata: {provider: 'github'}
      };
      type ProfileLookupResponse = {
        data: Array<{username: string; public: boolean; website: string | null; avatar_url: string | null}>;
        error: null;
      };
      type ProfileQueryMock = {
        select: () => ProfileQueryMock;
        filter: () => ProfileQueryMock;
        then: Promise<ProfileLookupResponse>['then'];
      };
      const profileLookupResponse: ProfileLookupResponse = {
        data: [{username: 'oauthuser', public: true, website: null, avatar_url: null}],
        error: null
      };
      const profileMock: ProfileQueryMock = {
        select: () => profileMock,
        filter: () => profileMock,
        then: (onfulfilled, onrejected) => Promise.resolve(profileLookupResponse).then(onfulfilled, onrejected)
      };
      spyOn(supabaseClient, 'from').and.returnValue(profileMock as never);

      let result: {username?: string; auth_provider?: string} | null | undefined;
      authSession$.next(null);
      service.auth.handleOAuthCallback$().subscribe({
        next: (nextResult) => {
          result = nextResult;
        },
        error: (err) => {
          fail(err);
        }
      });
      tick(500);
      expect(result).toBeUndefined();

      authSession$.next({user: sessionUser});
      tick();
      expect(result?.username).toBe('oauthuser');
      expect(result?.auth_provider).toBe('github');
    }));
  });
});
