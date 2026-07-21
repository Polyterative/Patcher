import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  cleanupComponentTest,
  MockUserManagementService,
  setupComponentTest
} from './test-setup';
import { UserManagementComponent } from '../user-management.component';


/**
 * Username Editing Tests
 *
 * Covers: beginUsernameEdit, cancelUsernameEdit, submitUsernameChange,
 * and usernameControl validators.
 */
describe('UserManagementComponent - Username Editing', () => {
  let component: UserManagementComponent;
  let mockUserManagementService: MockUserManagementService;
  
  beforeEach(() => {
    const setup = setupComponentTest();
    component = setup.component;
    mockUserManagementService = setup.mockUserManagementService;
  });
  
  afterEach(() => cleanupComponentTest());
  
  // ─── beginUsernameEdit ────────────────────────────────────────────────────
  
  describe('beginUsernameEdit()', () => {
    it('should set editingUsername to true', () => {
      component.beginUsernameEdit('testuser');
      expect(component.editingUsername).toBe(true);
    });
    
    it('should populate usernameControl with the current username', () => {
      component.beginUsernameEdit('testuser');
      expect(component.usernameControl.value).toBe('testuser');
    });
    
    it('should mark usernameControl as pristine after calling beginUsernameEdit', () => {
      component.usernameControl.markAsDirty();
      component.beginUsernameEdit('testuser');
      expect(component.usernameControl.pristine).toBe(true);
    });
    
    it('should mark usernameControl as untouched after calling beginUsernameEdit', () => {
      component.usernameControl.markAsTouched();
      component.beginUsernameEdit('testuser');
      expect(component.usernameControl.untouched).toBe(true);
    });
  });
  
  // ─── cancelUsernameEdit ───────────────────────────────────────────────────
  
  describe('cancelUsernameEdit()', () => {
    it('should set editingUsername back to false', () => {
      component.beginUsernameEdit('testuser');
      component.cancelUsernameEdit();
      expect(component.editingUsername).toBe(false);
    });
    
    it('should reset usernameControl to empty string', () => {
      component.beginUsernameEdit('testuser');
      component.cancelUsernameEdit();
      expect(component.usernameControl.value).toBe('');
    });
  });
  
  // ─── submitUsernameChange ─────────────────────────────────────────────────
  
  describe('submitUsernameChange()', () => {
    it('should emit updateUsernameAction$ with new username when valid and changed', fakeAsync(() => {
      spyOn(mockUserManagementService.updateUsernameAction$, 'next');
      component.beginUsernameEdit('oldname');
      component.usernameControl.setValue('newname');
      
      component.submitUsernameChange('oldname');
      tick();
      
      expect(mockUserManagementService.updateUsernameAction$.next).toHaveBeenCalledOnceWith('newname');
    }));
    
    it('should keep editing state until the service publishes a successful profile update', fakeAsync(() => {
      component.beginUsernameEdit('oldname');
      component.usernameControl.setValue('newname');
      
      component.submitUsernameChange('oldname');
      tick();
      
      expect(component.editingUsername).toBe(true);
      expect(component.usernameControl.value).toBe('newname');
    }));
    
    it('should NOT emit updateUsernameAction$ when the new value equals the current username', fakeAsync(() => {
      spyOn(mockUserManagementService.updateUsernameAction$, 'next');
      component.beginUsernameEdit('sameuser');
      component.usernameControl.setValue('sameuser');
      
      component.submitUsernameChange('sameuser');
      tick();
      
      expect(mockUserManagementService.updateUsernameAction$.next).not.toHaveBeenCalled();
    }));
    
    it('should NOT emit updateUsernameAction$ when the trimmed new value equals the current username', fakeAsync(() => {
      spyOn(mockUserManagementService.updateUsernameAction$, 'next');
      component.beginUsernameEdit('sameuser');
      component.usernameControl.setValue('  sameuser  ');
      
      component.submitUsernameChange('sameuser');
      tick();
      
      expect(mockUserManagementService.updateUsernameAction$.next).not.toHaveBeenCalled();
    }));
    
    it('should NOT emit updateUsernameAction$ when usernameControl is invalid', fakeAsync(() => {
      spyOn(mockUserManagementService.updateUsernameAction$, 'next');
      component.beginUsernameEdit('testuser');
      component.usernameControl.setValue('ab'); // too short — minLength 3
      
      component.submitUsernameChange('testuser');
      tick();
      
      expect(mockUserManagementService.updateUsernameAction$.next).not.toHaveBeenCalled();
    }));

    it('should emit a trimmed username value', fakeAsync(() => {
      spyOn(mockUserManagementService.updateUsernameAction$, 'next');
      component.beginUsernameEdit('oldname');
      component.usernameControl.setValue('  newname  ');

      component.submitUsernameChange('oldname');
      tick();

      expect(mockUserManagementService.updateUsernameAction$.next).toHaveBeenCalledOnceWith('newname');
    }));
  });
  
  // ─── usernameControl validators ───────────────────────────────────────────
  
  describe('usernameControl validators', () => {
    it('should be invalid when empty (required)', () => {
      component.usernameControl.setValue('');
      expect(component.usernameControl.hasError('required')).toBe(true);
    });
    
    it('should be invalid when shorter than 3 characters', () => {
      component.usernameControl.setValue('ab');
      expect(component.usernameControl.hasError('minlength')).toBe(true);
    });
    
    it('should be invalid when longer than 30 characters', () => {
      component.usernameControl.setValue('a'.repeat(31));
      expect(component.usernameControl.hasError('maxlength')).toBe(true);
    });
    
    it('should be invalid when containing spaces', () => {
      component.usernameControl.setValue('bad name');
      expect(component.usernameControl.hasError('pattern')).toBe(true);
    });
    
    it('should be invalid when containing special characters like @', () => {
      component.usernameControl.setValue('user@name');
      expect(component.usernameControl.hasError('pattern')).toBe(true);
    });
    
    it('should be valid for letters, numbers, hyphens, and underscores', () => {
      component.usernameControl.setValue('valid_user-123');
      expect(component.usernameControl.valid).toBe(true);
    });
    
    it('should be valid for exactly 3 characters', () => {
      component.usernameControl.setValue('abc');
      expect(component.usernameControl.valid).toBe(true);
    });
    
    it('should be valid for exactly 30 characters', () => {
      component.usernameControl.setValue('a'.repeat(30));
      expect(component.usernameControl.valid).toBe(true);
    });
  });
});