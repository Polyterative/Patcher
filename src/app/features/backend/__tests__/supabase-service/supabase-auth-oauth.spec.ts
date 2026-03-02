import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


describe('SupabaseService - auth OAuth and helpers', () => {
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
  
  // ── _isValidEmail ─────────────────────────────────────────────────────────
  
  describe('_isValidEmail', () => {
    const isValid = (email: string): boolean =>
      (service.auth as any)._isValidEmail(email);
    
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
    const create = (err: any) =>
      (service.auth as any)._createPasswordResetError(err);
    
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
        Promise.resolve({data: {url: 'https://provider.com/auth'}, error: null})
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
        Promise.resolve({data: null, error: {message: 'OAuth error'}})
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
      spyOn(supabaseClient.auth, 'signInWithOAuth').and.returnValue(
        Promise.resolve({data: {url: 'url'}, error: null})
      );
      
      service.auth.loginWithOAuth$('google', 'https://myapp.com/callback').subscribe({
        next: () => {
          const callArgs = (supabaseClient.auth.signInWithOAuth as jasmine.Spy).calls.first().args[0];
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
    it('should return null when session has an error', (done) => {
      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({data: {session: null}, error: {message: 'no session'}})
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
    
    it('should return null when session data is null', (done) => {
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
  });
  
  // ── _ensureOAuthUserProfile$ ──────────────────────────────────────────────
  
  describe('_ensureOAuthUserProfile$', () => {
    it('should upsert a profile with temp username derived from email', (done) => {
      const profileMock: any = {};
      const upsertSpy = jasmine.createSpy('upsert').and.returnValue(profileMock);
      profileMock.upsert = upsertSpy;
      profileMock.then = (res: Function, rej?: Function) =>
        Promise.resolve({data: null, error: null}).then(res as any, rej as any);
      
      spyOn(supabaseClient, 'from').and.returnValue(profileMock);
      
      const mockUser: any = {
        id: 'oauth-user-1',
        email: 'john@example.com',
        created_at: new Date().toISOString()
      };
      
      (service.auth as any)._ensureOAuthUserProfile$(mockUser).subscribe({
        next: () => {
          expect(upsertSpy).toHaveBeenCalledWith(
            jasmine.objectContaining({id: 'oauth-user-1', username: 'john'}),
            jasmine.any(Object)
          );
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should fall back to user_<id> when email is empty', (done) => {
      const profileMock: any = {};
      const upsertSpy = jasmine.createSpy('upsert').and.returnValue(profileMock);
      profileMock.upsert = upsertSpy;
      profileMock.then = (res: Function, rej?: Function) =>
        Promise.resolve({data: null, error: null}).then(res as any, rej as any);
      
      spyOn(supabaseClient, 'from').and.returnValue(profileMock);
      
      const mockUser: any = {
        id: 'abc12345-uuid',
        email: '',
        created_at: new Date().toISOString()
      };
      
      (service.auth as any)._ensureOAuthUserProfile$(mockUser).subscribe({
        next: () => {
          const upserted = upsertSpy.calls.first().args[0];
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