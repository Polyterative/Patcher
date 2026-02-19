import {
  cleanupUserManagementServiceTest,
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
 * In-Session Password Change Tests
 *
 * Tests for UserManagementService.changePassword$ and showPasswordForm$ toggle.
 */
describe('UserManagementService - Password Change', () => {
  let service: UserManagementService;
  let mockSnackBar: any;
  let mockSupabaseService: any;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSnackBar = setup.mockSnackBar;
    mockSupabaseService = setup.mockSupabaseService;
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  // ─── showPasswordForm$ toggle ───────────────────────────────────────────────
  
  describe('togglePasswordForm$', () => {
    it('should start with form hidden', fakeAsync(() => {
      let visible: boolean | undefined;
      service.showPasswordForm$.subscribe(v => visible = v);
      tick();
      expect(visible).toBe(false);
    }));
    
    it('should show form when true is emitted', fakeAsync(() => {
      let visible: boolean | undefined;
      service.showPasswordForm$.subscribe(v => visible = v);
      
      service.togglePasswordForm$.next(true);
      tick();
      
      expect(visible).toBe(true);
    }));
    
    it('should hide form when false is emitted after showing', fakeAsync(() => {
      let visible: boolean | undefined;
      service.showPasswordForm$.subscribe(v => visible = v);
      
      service.togglePasswordForm$.next(true);
      tick();
      service.togglePasswordForm$.next(false);
      tick();
      
      expect(visible).toBe(false);
    }));
  });
  
  // ─── changePassword$ handler ────────────────────────────────────────────────
  
  describe('changePassword$', () => {
    it('should call backend updatePassword$ with the supplied password', fakeAsync(() => {
      mockSupabaseService.updatePassword$.and.returnValue(of(void 0));
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      expect(mockSupabaseService.updatePassword$).toHaveBeenCalledWith('NewPass123!');
    }));
    
    it('should show success snackbar on successful password change', fakeAsync(() => {
      mockSupabaseService.updatePassword$.and.returnValue(of(void 0));
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        jasmine.stringContaining('Password updated'),
        undefined,
        jasmine.anything()
      );
    }));
    
    it('should hide the password form after successful change', fakeAsync(() => {
      mockSupabaseService.updatePassword$.and.returnValue(of(void 0));
      
      // First open the form
      service.togglePasswordForm$.next(true);
      tick();
      
      let visible: boolean | undefined;
      service.showPasswordForm$.subscribe(v => visible = v);
      expect(visible).toBe(true);
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      expect(visible).toBe(false);
    }));
    
    it('should show error snackbar when backend returns an error', fakeAsync(() => {
      const err = new Error('Auth session expired');
      mockSupabaseService.updatePassword$.and.returnValue(throwError(() => err));
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        jasmine.stringContaining('Auth session expired'),
        undefined,
        jasmine.anything()
      );
    }));
    
    it('should keep form open when backend returns an error', fakeAsync(() => {
      mockSupabaseService.updatePassword$.and.returnValue(throwError(() => new Error('fail')));
      
      service.togglePasswordForm$.next(true);
      tick();
      
      let visible: boolean | undefined;
      service.showPasswordForm$.subscribe(v => visible = v);
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      // Form should NOT have been closed on error
      expect(visible).toBe(true);
    }));
    
    it('should handle multiple sequential change requests', fakeAsync(() => {
      mockSupabaseService.updatePassword$.and.returnValue(of(void 0));
      
      service.changePassword$.next({newPassword: 'First1234!'});
      tick();
      service.changePassword$.next({newPassword: 'Second5678!'});
      tick();
      
      expect(mockSupabaseService.updatePassword$).toHaveBeenCalledTimes(2);
    }));
  });
});