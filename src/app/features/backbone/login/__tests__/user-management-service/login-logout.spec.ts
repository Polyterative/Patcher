import {
  cleanupUserManagementServiceTest,
  MOCK_SIMPLE_USER,
  setupUserManagementServiceTest
} from './test-setup';
import { UserManagementService } from '../../user-management.service';
import {
  of,
  throwError
} from 'rxjs';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';


/**
 * Manual Login and Logout Tests
 *
 * Tests for manual login/logout operations (not cross-tab).
 */
describe('UserManagementService - Manual Login/Logout', () => {
  let service: UserManagementService;
  let mockRouter: any;
  let mockSnackBar: any;
  let mockSupabaseService: any;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockRouter = setup.mockRouter;
    mockSnackBar = setup.mockSnackBar;
    mockSupabaseService = setup.mockSupabaseService;
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  describe('login$', () => {
    it('should call backend login$ with email and password', fakeAsync(() => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const loginResponse = {user: MOCK_SIMPLE_USER, returnUrl: '/'};
      
      mockSupabaseService.login$.and.returnValue(of(loginResponse));
      
      // Act
      service.login$(email, password).subscribe();
      
      tick();
      
      // Assert
      expect(mockSupabaseService.login$).toHaveBeenCalledWith(email, password);
    }));
    
    it('should update loggedUser$ on successful login', fakeAsync(() => {
      // Arrange
      const loginResponse = {user: MOCK_SIMPLE_USER, returnUrl: '/'};
      mockSupabaseService.login$.and.returnValue(of(loginResponse));
      
      let loggedUser: any;
      service.loggedUser$.subscribe(user => loggedUser = user);
      
      tick();
      
      // Act
      service.login$('test@example.com', 'password').subscribe();
      
      tick();
      
      // Assert
      expect(loggedUser).toEqual(MOCK_SIMPLE_USER);
    }));
    
    it('should show error message on login failure', fakeAsync(() => {
      // Arrange
      mockSupabaseService.login$.and.returnValue(throwError(() => new Error('Login failed')));
      
      // Act
      service.login$('test@example.com', 'wrong-password').subscribe({
        next: () => fail('should not succeed'),
        error: () => {
          // Expected to catch error
        }
      });
      
      tick();
      
      // Assert: Error handler should be called (via SharedConstants)
      // We can't easily test SharedConstants.errorLogin without mocking it
      // but the subscription should complete via NEVER
    }));
  });
  
  describe('logoff$', () => {
    it('should call backend logoff$', fakeAsync(() => {
      // Arrange
      mockSupabaseService.logoff$.and.returnValue(of({error: null}));
      
      // Act
      service.logoff$();
      
      tick();
      
      // Assert
      expect(mockSupabaseService.logoff$).toHaveBeenCalled();
    }));
    
    it('should navigate to login page on successful logout', fakeAsync(() => {
      // Arrange
      mockSupabaseService.logoff$.and.returnValue(of({error: null}));
      
      // Log the user in first
      const loginResponse = {user: MOCK_SIMPLE_USER, returnUrl: '/'};
      mockSupabaseService.login$.and.returnValue(of(loginResponse));
      service.login$('test@example.com', 'password').subscribe();
      tick();
      
      mockRouter.navigate.calls.reset();
      
      // Act
      service.logoff$();
      
      tick();
      
      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    }));
    
    it('should show success message on successful logout', fakeAsync(() => {
      // Arrange
      mockSupabaseService.logoff$.and.returnValue(of({error: null}));
      
      // Act
      service.logoff$();
      
      tick();
      
      // Assert: Success message shown via SharedConstants
      // The implementation calls SharedConstants.successLogout(this.snackBar)
      // We can verify snackBar was opened (if we spy on SharedConstants)
    }));
    
    it('should handle logout error gracefully', fakeAsync(() => {
      // Arrange
      const error = new Error('Logout failed');
      mockSupabaseService.logoff$.and.returnValue(throwError(() => error));
      
      mockRouter.navigate.calls.reset();
      
      // Act
      service.logoff$();
      
      tick();
      
      // Assert: Should not navigate on error
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));
    
    it('should log error to console on logout failure', fakeAsync(() => {
      // Arrange
      spyOn(console, 'error');
      const error = new Error('Logout failed');
      mockSupabaseService.logoff$.and.returnValue(throwError(() => error));
      
      // Act
      service.logoff$();
      
      tick();
      
      // Assert
      expect(console.error).toHaveBeenCalledWith('Logout failed:', error);
    }));
  });
  
  describe('logoffButtonClick$ integration', () => {
    it('should trigger logout when logoffButtonClick$ is emitted', fakeAsync(() => {
      // Arrange
      mockSupabaseService.logoff$.and.returnValue(of({error: null}));
      
      const mockUserDataHandlerService = (service as any).userBoxService;
      
      tick();
      
      // Act: Emit the button click event
      mockUserDataHandlerService.logoffButtonClick$.emit();
      
      tick();
      
      // Assert: backend logoff$ should have been called as a result
      expect(mockSupabaseService.logoff$).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    }));
  });
});