import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import {
  confirmMatchesNewValidator,
  UserManagementComponent
} from './user-management.component';
import { SeoSocialShareData } from '../../../models/seo.model';
import { UserManagementService } from '../login/user-management.service';
import { SeoAndUtilsService } from '../seo-and-utils.service';
import {
  of,
  Subject,
  throwError
} from 'rxjs';

// ─── helpers ────────────────────────────────────────────────────────────────

type UserManagementComponentServiceMock =
  Pick<UserManagementService,
    | 'changePassword$'
    | 'updateUsernameAction$'
    | 'toggleUsernameForm$'
    | 'isUsernameAvailable$'
  >
  & {
  changePassword$: { next: jasmine.Spy<(value: { newPassword: string }) => void> };
  updateUsernameAction$: { next: jasmine.Spy<(username: string) => void> };
  toggleUsernameForm$: { next: jasmine.Spy<(show: boolean) => void> };
  isUsernameAvailable$: jasmine.Spy<(username: string) => ReturnType<UserManagementService['isUsernameAvailable$']>>;
};

type SeoAndUtilsServiceMock =
  Pick<SeoAndUtilsService, 'updateSeo'>
  & {
  updateSeo: jasmine.Spy<(data: SeoSocialShareData, appArea: string) => void>;
};

function makeGroup(newPassword: string, confirmPassword: string) {
  return new FormGroup({
    newPassword: new FormControl(newPassword),
    confirmPassword: new FormControl(confirmPassword)
  });
}

function subjectWithNextSpy<T>(subject: Subject<T>): Subject<T> & { next: jasmine.Spy<(value: T) => void> } {
  const next = spyOn(subject, 'next');
  return Object.assign(subject, { next });
}

function makeUserManagementMock(): UserManagementComponentServiceMock {
  return {
    changePassword$: subjectWithNextSpy(new Subject<{ newPassword: string }>()),
    updateUsernameAction$: subjectWithNextSpy(new Subject<string>()),
    toggleUsernameForm$: subjectWithNextSpy(new Subject<boolean>()),
    isUsernameAvailable$: jasmine.createSpy('isUsernameAvailable$').and.returnValue(of(true))
  };
}

function makeSeoMock(): SeoAndUtilsServiceMock {
  return {
    updateSeo: jasmine.createSpy<(data: SeoSocialShareData, appArea: string) => void>('updateSeo')
  };
}

function makeComp(
  userMgmt = makeUserManagementMock(),
  seo = makeSeoMock()
): UserManagementComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      UserManagementComponent,
      {provide: UserManagementService, useValue: userMgmt},
      {provide: SeoAndUtilsService, useValue: seo}
    ]
  });
  return TestBed.inject(UserManagementComponent);
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

    it('hides the username form through the service toggle', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.cancelUsernameEdit();
      expect(userMgmt.toggleUsernameForm$.next).toHaveBeenCalledOnceWith(false);
    });
  });

  describe('canSubmitUsernameChange', () => {
    it('returns false when usernameControl is invalid', () => {
      const comp = makeComp();
      comp.usernameControl.setValue('ab');
      expect(comp.canSubmitUsernameChange('alice')).toBeFalse();
    });

    it('returns false when trimmed value equals current username', () => {
      const comp = makeComp();
      comp.usernameControl.setValue('alice');
      expect(comp.canSubmitUsernameChange('alice')).toBeFalse();
    });

    it('returns true when valid and changed', () => {
      const comp = makeComp();
      comp.usernameControl.setValue('bob');
      expect(comp.canSubmitUsernameChange('alice')).toBeTrue();
    });
  });

  describe('submitUsernameChange', () => {
    it('does nothing when usernameControl is invalid', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('ab'); // too short (min 3)
      comp.submitUsernameChange('alice');
      expect(userMgmt.updateUsernameAction$.next).not.toHaveBeenCalled();
    });

    it('does nothing when trimmed value equals current username', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('alice');
      comp.submitUsernameChange('alice');
      expect(userMgmt.updateUsernameAction$.next).not.toHaveBeenCalled();
    });

    it('emits updateUsernameAction$ with new value when valid and changed', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('bob');
      comp.submitUsernameChange('alice');
      expect(userMgmt.isUsernameAvailable$).toHaveBeenCalledOnceWith('bob');
      expect(userMgmt.updateUsernameAction$.next).toHaveBeenCalledOnceWith('bob');
    });

    it('trims the submitted username', () => {
      const userMgmt = makeUserManagementMock();
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('  bob  ');
      comp.submitUsernameChange('alice');
      expect(userMgmt.isUsernameAvailable$).toHaveBeenCalledOnceWith('bob');
      expect(userMgmt.updateUsernameAction$.next).toHaveBeenCalledOnceWith('bob');
    });

    it('sets a usernameTaken error and blocks update when display name is unavailable', () => {
      const userMgmt = makeUserManagementMock();
      userMgmt.isUsernameAvailable$.and.returnValue(of(false));
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('bob');

      comp.submitUsernameChange('alice');

      expect(comp.usernameControl.hasError('usernameTaken')).toBeTrue();
      expect(userMgmt.updateUsernameAction$.next).not.toHaveBeenCalled();
    });

    it('sets usernameAvailabilityCheckFailed and blocks update when availability lookup fails', () => {
      const userMgmt = makeUserManagementMock();
      userMgmt.isUsernameAvailable$.and.returnValue(throwError(() => new Error('lookup failed')));
      const comp = makeComp(userMgmt);
      comp.usernameControl.setValue('bob');

      comp.submitUsernameChange('alice');

      expect(comp.usernameControl.hasError('usernameAvailabilityCheckFailed')).toBeTrue();
      expect(userMgmt.updateUsernameAction$.next).not.toHaveBeenCalled();
    });

    it('marks usernameControl touched when invalid submit is attempted', () => {
      const comp = makeComp();
      comp.usernameControl.setValue('ab');
      comp.submitUsernameChange('alice');
      expect(comp.usernameControl.touched).toBeTrue();
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
