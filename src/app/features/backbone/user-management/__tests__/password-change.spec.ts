import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import {
  confirmMatchesNewValidator,
  UserManagementComponent
} from '../user-management.component';
import {
  cleanupComponentTest,
  setupComponentTest
} from './test-setup';


/**
 * Password Change Tests
 *
 * Covers: confirmMatchesNewValidator, passwordForm validation,
 * submitPasswordChange(), and form reset on success/cancel.
 */
describe('UserManagementComponent - Password Change', () => {
  let component: UserManagementComponent;
  let mockUserManagementService: any;
  
  beforeEach(() => {
    const setup = setupComponentTest();
    component = setup.component;
    mockUserManagementService = setup.mockUserManagementService;
  });
  
  afterEach(() => cleanupComponentTest());
  
  // ─── confirmMatchesNewValidator ───────────────────────────────────────────
  
  describe('confirmMatchesNewValidator()', () => {
    it('should return null when passwords match', () => {
      const group = new FormGroup({});
      const validator = confirmMatchesNewValidator();
      
      // Build a real FormGroup to test cross-field validation
      const {FormControl, FormGroup: FG} = require('@angular/forms');
      const fg = new FG(
        {
          newPassword: new FormControl('MyPass123!'),
          confirmPassword: new FormControl('MyPass123!')
        },
        {validators: [validator]}
      );
      
      expect(fg.errors).toBeNull();
    });
    
    it('should return confirmMismatch error when passwords do not match', () => {
      const validator = confirmMatchesNewValidator();
      const {FormControl, FormGroup: FG} = require('@angular/forms');
      const fg = new FG(
        {
          newPassword: new FormControl('MyPass123!'),
          confirmPassword: new FormControl('DifferentPass!')
        },
        {validators: [validator]}
      );
      
      expect(fg.errors).toEqual({confirmMismatch: true});
    });
    
    it('should return null when both password fields are empty', () => {
      const validator = confirmMatchesNewValidator();
      const {FormControl, FormGroup: FG} = require('@angular/forms');
      const fg = new FG(
        {
          newPassword: new FormControl(''),
          confirmPassword: new FormControl('')
        },
        {validators: [validator]}
      );
      
      // Both empty → no mismatch (required validator handles the empty case)
      expect(fg.errors).toBeNull();
    });
    
    it('should return null when only newPassword has a value and confirm is empty', () => {
      const validator = confirmMatchesNewValidator();
      const {FormControl, FormGroup: FG} = require('@angular/forms');
      const fg = new FG(
        {
          newPassword: new FormControl('MyPass123!'),
          confirmPassword: new FormControl('')
        },
        {validators: [validator]}
      );
      
      // Empty confirm — validator should not trigger mismatch (confirm is required to be non-empty first)
      expect(fg.errors).toBeNull();
    });
  });
  
  // ─── passwordForm validation ──────────────────────────────────────────────
  
  describe('passwordForm validation', () => {
    it('should be invalid when both fields are empty', () => {
      expect(component.passwordForm.invalid).toBe(true);
    });
    
    it('newPassword should be invalid when empty (required)', () => {
      component.passwordForm.get('newPassword')!.setValue('');
      expect(component.passwordForm.get('newPassword')!.hasError('required')).toBe(true);
    });
    
    it('newPassword should be invalid when shorter than 8 characters', () => {
      component.passwordForm.get('newPassword')!.setValue('short');
      expect(component.passwordForm.get('newPassword')!.hasError('minlength')).toBe(true);
    });
    
    it('newPassword should be valid for 8+ characters', () => {
      component.passwordForm.get('newPassword')!.setValue('longEnough1');
      expect(component.passwordForm.get('newPassword')!.valid).toBe(true);
    });
    
    it('confirmPassword should be invalid when empty (required)', () => {
      component.passwordForm.get('confirmPassword')!.setValue('');
      expect(component.passwordForm.get('confirmPassword')!.hasError('required')).toBe(true);
    });
    
    it('should have confirmMismatch error when passwords differ', () => {
      component.passwordForm.get('newPassword')!.setValue('password123');
      component.passwordForm.get('confirmPassword')!.setValue('differentPassword');
      expect(component.passwordForm.hasError('confirmMismatch')).toBe(true);
    });
    
    it('should be valid when both passwords match and meet requirements', () => {
      component.passwordForm.get('newPassword')!.setValue('SecurePass1!');
      component.passwordForm.get('confirmPassword')!.setValue('SecurePass1!');
      expect(component.passwordForm.valid).toBe(true);
    });
  });
  
  // ─── submitPasswordChange() ────────────────────────────────────────────────
  
  describe('submitPasswordChange()', () => {
    it('should emit to changePassword$ with newPassword when form is valid', fakeAsync(() => {
      component.passwordForm.get('newPassword')!.setValue('SecurePass1!');
      component.passwordForm.get('confirmPassword')!.setValue('SecurePass1!');
      
      let emittedValue: any;
      mockUserManagementService.changePassword$.subscribe((v: any) => emittedValue = v);
      
      component.submitPasswordChange();
      tick();
      
      expect(emittedValue).toEqual({newPassword: 'SecurePass1!'});
    }));
    
    it('should reset the passwordForm after successful emit', fakeAsync(() => {
      component.passwordForm.get('newPassword')!.setValue('SecurePass1!');
      component.passwordForm.get('confirmPassword')!.setValue('SecurePass1!');
      
      component.submitPasswordChange();
      tick();
      
      expect(component.passwordForm.get('newPassword')!.value).toBeNull();
      expect(component.passwordForm.get('confirmPassword')!.value).toBeNull();
    }));
    
    it('should NOT emit to changePassword$ when form is invalid', fakeAsync(() => {
      // form is invalid by default (empty required fields)
      let emitted = false;
      mockUserManagementService.changePassword$.subscribe(() => emitted = true);
      
      component.submitPasswordChange();
      tick();
      
      expect(emitted).toBe(false);
    }));
    
    it('should NOT emit when newPassword is too short', fakeAsync(() => {
      component.passwordForm.get('newPassword')!.setValue('short');
      component.passwordForm.get('confirmPassword')!.setValue('short');
      
      let emitted = false;
      mockUserManagementService.changePassword$.subscribe(() => emitted = true);
      
      component.submitPasswordChange();
      tick();
      
      expect(emitted).toBe(false);
    }));
    
    it('should NOT emit when passwords do not match', fakeAsync(() => {
      component.passwordForm.get('newPassword')!.setValue('SecurePass1!');
      component.passwordForm.get('confirmPassword')!.setValue('DifferentPass!');
      
      let emitted = false;
      mockUserManagementService.changePassword$.subscribe(() => emitted = true);
      
      component.submitPasswordChange();
      tick();
      
      expect(emitted).toBe(false);
    }));
  });
});