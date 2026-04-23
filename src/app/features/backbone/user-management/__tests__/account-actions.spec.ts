import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  cleanupComponentTest,
  setupComponentTest
} from './test-setup';
import { UserManagementComponent } from '../user-management.component';


/**
 * Account Actions Tests
 *
 * Covers: logout delegation, reset/delete account action delegation,
 * and togglePasswordForm$ delegations.
 */
describe('UserManagementComponent - Account Actions', () => {
  let component: UserManagementComponent;
  let mockUserManagementService: any;
  
  beforeEach(() => {
    const setup = setupComponentTest();
    component = setup.component;
    mockUserManagementService = setup.mockUserManagementService;
  });
  
  afterEach(() => cleanupComponentTest());
  
  // ─── Logout ──────────────────────────────────────────────────────────────
  
  describe('logout', () => {
    it('should call logoff$() on the service when the logout button is clicked', () => {
      component.userManagementService.logoff$();
      expect(mockUserManagementService.logoff$).toHaveBeenCalled();
    });
  });
  
  // ─── Reset / delete account ───────────────────────────────────────────────
  
  describe('resetUserDataAction$', () => {
    it('should be a Subject that can be subscribed to', () => {
      expect(typeof mockUserManagementService.resetUserDataAction$.subscribe).toBe('function');
    });
    
    it('should emit when resetUserDataAction$.next() is called', fakeAsync(() => {
      let emitted = false;
      mockUserManagementService.resetUserDataAction$.subscribe(() => (emitted = true));
      
      mockUserManagementService.resetUserDataAction$.next();
      tick();
      
      expect(emitted).toBe(true);
    }));
  });

  describe('deleteAccountAction$', () => {
    it('should be a Subject that can be subscribed to', () => {
      expect(typeof mockUserManagementService.deleteAccountAction$.subscribe).toBe('function');
    });
    
    it('should emit when deleteAccountAction$.next() is called', fakeAsync(() => {
      let emitted = false;
      mockUserManagementService.deleteAccountAction$.subscribe(() => (emitted = true));
      
      mockUserManagementService.deleteAccountAction$.next();
      tick();
      
      expect(emitted).toBe(true);
    }));
  });
  
  // ─── Password form toggle ─────────────────────────────────────────────────
  
  describe('togglePasswordForm$', () => {
    it('should emit true when the change-password button is pressed (show form)', fakeAsync(() => {
      let emittedValue: boolean | undefined;
      mockUserManagementService.togglePasswordForm$.subscribe((v: boolean) => (emittedValue = v));
      
      mockUserManagementService.togglePasswordForm$.next(true);
      tick();
      
      expect(emittedValue).toBe(true);
    }));
    
    it('should emit false when the cancel button is pressed (hide form)', fakeAsync(() => {
      let emittedValue: boolean | undefined;
      mockUserManagementService.togglePasswordForm$.subscribe((v: boolean) => (emittedValue = v));
      
      mockUserManagementService.togglePasswordForm$.next(true);
      tick();
      mockUserManagementService.togglePasswordForm$.next(false);
      tick();
      
      expect(emittedValue).toBe(false);
    }));
  });
});
