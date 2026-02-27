import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


describe('SupabaseService - login flow', () => {
  let service: SupabaseService;
  let supabaseClient: any;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('login$', () => {
    function setupLoginMocks(userId = 'login-u1', username = 'testuser') {
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
      
      let callCount = 0;
      spyOn(supabaseClient, 'from').and.callFake((_table: string) => {
        callCount++;
        const m: any = {};
        ['update', 'filter', 'select', 'eq'].forEach(method => {
          m[method] = () => m;
        });
        if (callCount === 1) {
          // updateConfirmed$ → update profiles
          m.then = (res: Function, rej?: Function) =>
            Promise.resolve({data: {}, error: null}).then(res as any, rej as any);
        } else {
          // select username from profiles
          m.then = (res: Function, rej?: Function) =>
            Promise.resolve({data: [{username}], error: null}).then(res as any, rej as any);
        }
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
    it('should return null when session is missing', (done) => {
      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({data: {session: null}, error: null})
      );
      
      service.auth.handleOAuthCallback$().subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return null when getSession returns an error', (done) => {
      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({data: {session: null}, error: {message: 'session error'}})
      );
      
      service.auth.handleOAuthCallback$().subscribe({
        next: (result) => {
          expect(result).toBeNull();
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