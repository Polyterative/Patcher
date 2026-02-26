import { of } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


describe('SupabaseService - auth methods', () => {
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
  
  describe('getUserSession$', () => {
    it('should return null when there is no active session', (done) => {
      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({data: {session: null}, error: null})
      );
      
      service.auth.getUserSession$().subscribe({
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
    
    it('should return a SimpleUserModel when session is active', (done) => {
      const mockSession = {
        user: {
          id: 'session-user-id',
          email: 'session@test.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-06-01T00:00:00Z'
        }
      };
      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({data: {session: mockSession}, error: null})
      );
      
      service.auth.getUserSession$().subscribe({
        next: (user: any) => {
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
    it('should return null when getUserSession$ returns null', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
      
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
    
    it('should enrich user with username from profiles table', (done) => {
      const simpleUser = {
        id: 'rich-user-1',
        email: 'rich@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(simpleUser));
      
      const profileMock: any = {};
      ['select', 'filter'].forEach(m => {
        profileMock[m] = () => profileMock;
      });
      profileMock.then = (res: Function, rej?: Function) =>
        Promise.resolve({data: [{username: 'richuser'}], error: null}).then(res as any, rej as any);
      
      spyOn(supabaseClient, 'from').and.returnValue(profileMock);
      
      service.auth.getRichUserSession$().subscribe({
        next: (user: any) => {
          expect(user).not.toBeNull();
          expect(user.username).toBe('richuser');
          expect(user.email).toBe('rich@test.com');
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
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
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
      const profileMock: any = {};
      ['update', 'eq'].forEach(m => {
        profileMock[m] = () => profileMock;
      });
      profileMock.then = (res: Function, rej?: Function) =>
        Promise.resolve({data: null, error: null}).then(res as any, rej as any);
      
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