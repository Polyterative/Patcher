import { FormControl, FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';
import {
  confirmMatchesNewValidator,
  UserManagementComponent
} from './user-management.component';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeGroup(newPassword: string, confirmPassword: string) {
  return new FormGroup({
    newPassword: new FormControl(newPassword),
    confirmPassword: new FormControl(confirmPassword)
  });
}

function makeUserManagementMock() {
  return {
    changePassword$: { next: jasmine.createSpy('next') },
    updateUsername$: jasmine.createSpy('updateUsername$').and.returnValue(of(void 0))
  } as any;
}

function makeSeoMock() {
  return { updateSeo: jasmine.createSpy('updateSeo') } as any;
}

function makeCdrMock() {
  return { markForCheck: jasmine.createSpy('markForCheck') } as any;
}

function makeNgZoneMock() {
  return { run: (fn: () => void) => fn() } as any;
}

function makeComp(
  userMgmt = makeUserManagementMock(),
  seo = makeSeoMock(),
  cdr = makeCdrMock(),
  ngZone = makeNgZoneMock()
): UserManagementComponent {
  return new UserManagementComponent(userMgmt, seo, cdr, ngZone);
}

// ─── confirmMatchesNewValidator ───────────────────────────────────────────────

describe('confirmMatchesNewValidator', () => {
  it('returns null when both fields are empty', () => {
    const group = makeGroup('', '');
    const validator = confirmMatchesNewValidator();
    expect(validator(group)).toBeNull();
  });

  it('returns null when passwords match', () => {
    const group = makeGroup('secret123', 'secret123');
    const validator = confirmMatchesNewValidator();
    expect(validator(group)).toBeNull();
  });

  it('returns {confirmMismatch:true} when passwords differ', () => {
    const group = makeGroup('secret123', 'different');
    const validator = confirmMatchesNewValidator();
    expect(validator(group)).toEqual({ confirmMismatch: true });
  });

  it('returns null when only newPassword is set (no confirm yet)', () => {
    const group = makeGroup('secret123', '');
    const validator = confirmMatchesNewValidator();
    expect(validator(group)).toBeNull();
  });

  it('returns null when only confirmPassword is set (no new yet)', () => {
    const group = makeGroup('', 'secret123');
    const validator = confirmMatchesNewValidator();
    expect(validator(group)).toBeNull();
  });
});

// ─── UserManagementComponent ─────────────────────────────────────────────────

describe('UserManagementComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });

    it('editingUsername starts false', () => {
      expect(makeComp().editingUsername).toBeFalse();
    });

    it('usernameControl starts empty', () => {
      expect(makeComp().usernameControl.value).toBe('');
    });

    it('passwordForm starts invalid (empty required fields)', () => {
      expect(makeComp().passwordForm.invalid).toBeTrue();
    });
  });

  describe('ngOnInit — SEO', () => {
    it('calls updateSeo when ignoreSeo=false (default)', () => {
      const seo = makeSeoMock();
      const comp = makeComp(makeUserManagementMock(), seo);
      comp.ngOnInit();
      expect(seo.updateSeo).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ title: 'Account Management' }),
        jasmine.any(String)
      );
    });

    it('does NOT call updateSeo when ignoreSeo=true', () => {
      const seo = makeSeoMock();
      const comp = makeComp(makeUserManagementMock(), seo);
      comp.ignoreSeo = true;
      comp.ngOnInit();
      expect(seo.updateSeo).not.toHaveBeenCalled();
    });
  });

  describe('submitPasswordChange', () => {
    it('does nothing when passwordForm is invalid', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.passwordForm.setValue({ newPassword: '', confirmPassword: '' });
      comp.submitPasswordChange();
      expect(userMgmt.changePassword$.next).not.toHaveBeenCalled();
    });

    it('emits to changePassword$ when form is valid', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.passwordForm.setValue({ newPassword: 'newpass99', confirmPassword: 'newpass99' });
      comp.submitPasswordChange();
      expect(userMgmt.changePassword$.next).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ newPassword: 'newpass99' })
      );
    });

    it('resets the form after a valid submission', () => {
      const comp = makeComp();
      comp.passwordForm.setValue({ newPassword: 'newpass99', confirmPassword: 'newpass99' });
      comp.submitPasswordChange();
      expect(comp.passwordForm.value.newPassword).toBeNull();
      expect(comp.passwordForm.value.confirmPassword).toBeNull();
    });
  });

  describe('beginUsernameEdit', () => {
    it('sets editingUsername to true', () => {
      const comp = makeComp();
      comp.beginUsernameEdit('alice');
      expect(comp.editingUsername).toBeTrue();
    });

    it('populates usernameControl with current username', () => {
      const comp = makeComp();
      comp.beginUsernameEdit('alice');
      expect(comp.usernameControl.value).toBe('alice');
    });

    it('marks control pristine and untouched', () => {
      const comp = makeComp();
      comp.usernameControl.markAsDirty();
      comp.usernameControl.markAsTouched();
      comp.beginUsernameEdit('alice');
      expect(comp.usernameControl.pristine).toBeTrue();
      expect(comp.usernameControl.untouched).toBeTrue();
    });
  });

  describe('cancelUsernameEdit', () => {
    it('sets editingUsername to false', () => {
      const comp = makeComp();
      comp.editingUsername = true;
      comp.cancelUsernameEdit();
      expect(comp.editingUsername).toBeFalse();
    });

    it('resets usernameControl to empty string', () => {
      const comp = makeComp();
      comp.usernameControl.setValue('alice');
      comp.cancelUsernameEdit();
      expect(comp.usernameControl.value).toBe('');
    });
  });

  describe('submitUsernameChange', () => {
    it('does nothing when usernameControl is invalid', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('ab'); // too short (min 3)
      comp.submitUsernameChange('alice');
      expect(userMgmt.updateUsername$).not.toHaveBeenCalled();
    });

    it('does nothing when trimmed value equals current username', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('alice');
      comp.submitUsernameChange('alice');
      expect(userMgmt.updateUsername$).not.toHaveBeenCalled();
    });

    it('calls updateUsername$ with new value when valid and changed', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('bob');
      comp.submitUsernameChange('alice');
      expect(userMgmt.updateUsername$).toHaveBeenCalledOnceWith('bob');
    });

    it('calls cancelUsernameEdit and cdr.markForCheck on success', () => {
      const userMgmt = makeUserManagementMock();
      const cdr = makeCdrMock();
      const comp = makeComp(userMgmt, makeSeoMock(), cdr);
      comp.usernameControl.setValue('bob');
      comp.editingUsername = true;
      comp.submitUsernameChange('alice');
      expect(comp.editingUsername).toBeFalse();
      expect(cdr.markForCheck).toHaveBeenCalled();
    });

    it('handles error without rethrowing', () => {
      const userMgmt = makeUserManagementMock();
      userMgmt.updateUsername$ = jasmine.createSpy().and.returnValue(
        throwError(() => new Error('network'))
      );
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('bob');
      expect(() => comp.submitUsernameChange('alice')).not.toThrow();
    });
  });

  describe('isEmailOnlyAccount', () => {
    it('returns true when providers is null', () => {
      expect(makeComp().isEmailOnlyAccount(null)).toBeTrue();
    });

    it('returns true when providers is undefined', () => {
      expect(makeComp().isEmailOnlyAccount(undefined)).toBeTrue();
    });

    it('returns true when providers is empty array', () => {
      expect(makeComp().isEmailOnlyAccount([])).toBeTrue();
    });

    it('returns true when all providers are "email"', () => {
      expect(makeComp().isEmailOnlyAccount(['email', 'email'])).toBeTrue();
    });

    it('returns false when any provider is not "email"', () => {
      expect(makeComp().isEmailOnlyAccount(['email', 'google'])).toBeFalse();
    });

    it('returns false when provider is only "github"', () => {
      expect(makeComp().isEmailOnlyAccount(['github'])).toBeFalse();
    });
  });
});
