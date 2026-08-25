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
import { PasswordResetError } from 'src/app/features/backend/supabase-auth.helpers';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';


/**
 * In-session account form tests
 *
 * Tests for UserManagementService password and username inline form toggles.
 */
describe('UserManagementService - Account Form Changes', () => {
  type UserManagementServiceTestSetup = ReturnType<typeof setupUserManagementServiceTest>;

  let service: UserManagementService;
  let mockSnackBar: UserManagementServiceTestSetup['mockSnackBar'];
  let mockSupabaseService: UserManagementServiceTestSetup['mockSupabaseService'];
  
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

    it('should hide the username form when password form opens', fakeAsync(() => {
      let usernameVisible: boolean | undefined;
      service.showUsernameForm$.subscribe(v => usernameVisible = v);

      service.toggleUsernameForm$.next(true);
      tick();
      expect(usernameVisible).toBe(true);

      service.togglePasswordForm$.next(true);
      tick();

      expect(usernameVisible).toBe(false);
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

  describe('toggleUsernameForm$', () => {
    it('should start with form hidden', fakeAsync(() => {
      let visible: boolean | undefined;
      service.showUsernameForm$.subscribe(v => visible = v);
      tick();
      expect(visible).toBe(false);
    }));

    it('should show form when true is emitted', fakeAsync(() => {
      let visible: boolean | undefined;
      service.showUsernameForm$.subscribe(v => visible = v);

      service.toggleUsernameForm$.next(true);
      tick();

      expect(visible).toBe(true);
    }));

    it('should hide form when false is emitted after showing', fakeAsync(() => {
      let visible: boolean | undefined;
      service.showUsernameForm$.subscribe(v => visible = v);

      service.toggleUsernameForm$.next(true);
      tick();
      service.toggleUsernameForm$.next(false);
      tick();

      expect(visible).toBe(false);
    }));

    it('should hide the password form when username form opens', fakeAsync(() => {
      let passwordVisible: boolean | undefined;
      service.showPasswordForm$.subscribe(v => passwordVisible = v);

      service.togglePasswordForm$.next(true);
      tick();
      expect(passwordVisible).toBe(true);

      service.toggleUsernameForm$.next(true);
      tick();

      expect(passwordVisible).toBe(false);
    }));
  });
  
  // ─── changePassword$ handler ────────────────────────────────────────────────
  
  describe('changePassword$', () => {
    it('should call backend updatePassword$ with the supplied password', fakeAsync(() => {
      mockSupabaseService.auth.updatePassword$.and.returnValue(of(void 0));
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      expect(mockSupabaseService.auth.updatePassword$).toHaveBeenCalledWith('NewPass123!');
    }));
    
    it('should show success snackbar on successful password change', fakeAsync(() => {
      mockSupabaseService.auth.updatePassword$.and.returnValue(of(void 0));
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        jasmine.stringContaining('Password updated'),
        undefined,
        jasmine.anything()
      );
    }));
    
    it('should hide the password form after successful change', fakeAsync(() => {
      mockSupabaseService.auth.updatePassword$.and.returnValue(of(void 0));
      
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
    
    it('should show safe same-password snackbar when backend returns a normalized password error', fakeAsync(() => {
      const err = new PasswordResetError(
        SharedConstants.messages.resetPassword.samePassword,
        'same_password',
        422
      );
      mockSupabaseService.auth.updatePassword$.and.returnValue(throwError(() => err));
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        SharedConstants.messages.resetPassword.samePassword,
        undefined,
        jasmine.anything()
      );
    }));

    it('should sanitize generic password-change failures before showing the snackbar', fakeAsync(() => {
      mockSupabaseService.auth.updatePassword$.and.returnValue(
        throwError(() => ({error_code: 'provider_internal', status: 500, message: 'raw provider failure'}))
      );

      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        SharedConstants.messages.resetPassword.resetFailed,
        undefined,
        jasmine.anything()
      );
      expect(mockSnackBar.open).not.toHaveBeenCalledWith(
        jasmine.stringContaining('raw provider'),
        undefined,
        jasmine.anything()
      );
    }));
    
    it('should keep form open when backend returns an error', fakeAsync(() => {
      mockSupabaseService.auth.updatePassword$.and.returnValue(throwError(() => new Error('fail')));
      
      service.togglePasswordForm$.next(true);
      tick();
      
      let visible: boolean | undefined;
      service.showPasswordForm$.subscribe(v => visible = v);
      
      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      
      // Form should NOT have been closed on error
      expect(visible).toBe(true);
    }));

    it('should keep the form open after failure and clear it only after a retry succeeds', fakeAsync(() => {
      mockSupabaseService.auth.updatePassword$.and.returnValues(
        throwError(() => new PasswordResetError(
          SharedConstants.messages.resetPassword.samePassword,
          'same_password',
          422
        )),
        of(void 0)
      );

      service.togglePasswordForm$.next(true);
      tick();

      let visible: boolean | undefined;
      service.showPasswordForm$.subscribe(v => visible = v);

      service.changePassword$.next({newPassword: 'NewPass123!'});
      tick();
      expect(visible).toBe(true);

      service.changePassword$.next({newPassword: 'DifferentPass123!'});
      tick();

      expect(mockSupabaseService.auth.updatePassword$).toHaveBeenCalledTimes(2);
      expect(visible).toBe(false);
    }));
    
    it('should handle multiple sequential change requests', fakeAsync(() => {
      mockSupabaseService.auth.updatePassword$.and.returnValue(of(void 0));
      
      service.changePassword$.next({newPassword: 'First1234!'});
      tick();
      service.changePassword$.next({newPassword: 'Second5678!'});
      tick();
      
      expect(mockSupabaseService.auth.updatePassword$).toHaveBeenCalledTimes(2);
    }));
  });
});