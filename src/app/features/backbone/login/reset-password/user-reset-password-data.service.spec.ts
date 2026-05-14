import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  of,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserResetPasswordDataService } from './user-reset-password-data.service';


describe('UserResetPasswordDataService', () => {
  function build() {
    const supabaseService = {
      auth: {
        resetPassword$: jasmine.createSpy('resetPassword$').and.returnValue(of(undefined))
      }
    };
    const router = jasmine.createSpyObj('Router', ['navigate']);

    const service = new UserResetPasswordDataService(router, supabaseService as any);
    return {service, supabaseService, router};
  }

  it('setRecoverySession sets isRecoverySession$ and marks session as checked', () => {
    const {service} = build();

    service.setRecoverySession(true);

    expect(service.isRecoverySession$.value).toBeTrue();
    expect(service.isSessionChecked$.value).toBeTrue();
  });

  it('setRecoverySession(false) marks session as non-recovery', () => {
    const {service} = build();

    service.setRecoverySession(false);

    expect(service.isRecoverySession$.value).toBeFalse();
    expect(service.isSessionChecked$.value).toBeTrue();
  });

  it('sets error and does not call API when fields are invalid', () => {
    const {service, supabaseService} = build();
    // leave fields at empty/invalid defaults

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).not.toHaveBeenCalled();
    expect(service.errorMessage$.value).toContain('required');
    expect(service.isSubmitting$.value).toBeFalse();
  });

  it('sets password mismatch error when passwords differ', () => {
    const {service, supabaseService} = build();
    service.fields.password.control.setValue('password123');
    service.fields.confirmPassword.control.setValue('different99');

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).not.toHaveBeenCalled();
    expect(service.errorMessage$.value).toBe(SharedConstants.messages.resetPassword.passwordMismatch);
  });

  it('sets too-short error when password has fewer than 8 characters (service-level guard)', () => {
    const {service, supabaseService} = build();
    // clear Angular validators to reach the service-level length guard
    service.fields.password.control.clearValidators();
    service.fields.password.control.updateValueAndValidity();
    service.fields.confirmPassword.control.clearValidators();
    service.fields.confirmPassword.control.updateValueAndValidity();

    service.fields.password.control.setValue('abc1234');
    service.fields.confirmPassword.control.setValue('abc1234');

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).not.toHaveBeenCalled();
    expect(service.errorMessage$.value).toBe(SharedConstants.messages.resetPassword.passwordTooShort);
  });

  it('sets too-long error when password exceeds 30 characters (service-level guard)', () => {
    const {service, supabaseService} = build();
    service.fields.password.control.clearValidators();
    service.fields.password.control.updateValueAndValidity();
    service.fields.confirmPassword.control.clearValidators();
    service.fields.confirmPassword.control.updateValueAndValidity();

    const longPassword = 'a'.repeat(31);
    service.fields.password.control.setValue(longPassword);
    service.fields.confirmPassword.control.setValue(longPassword);

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).not.toHaveBeenCalled();
    expect(service.errorMessage$.value).toBe(SharedConstants.messages.resetPassword.passwordTooLong);
  });

  it('calls API and sets success message with countdown on valid matching passwords', fakeAsync(() => {
    const {service, supabaseService} = build();
    service.fields.password.control.setValue('ValidPass1!');
    service.fields.confirmPassword.control.setValue('ValidPass1!');

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).toHaveBeenCalled();
    expect(service.successMessage$.value).toBe(SharedConstants.messages.resetPassword.successTitle);
    expect(service.redirectCountdown$.value).toBe(10);
    expect(service.isSubmitting$.value).toBeFalse();

    // clear interval to avoid async leak
    service.ngOnDestroy();
  }));

  it('sets error message when API call fails', () => {
    const {service, supabaseService} = build();
    supabaseService.auth.resetPassword$.and.returnValue(
      throwError(() => ({message: 'Token expired'}))
    );
    service.fields.password.control.setValue('ValidPass1!');
    service.fields.confirmPassword.control.setValue('ValidPass1!');

    service.submitPasswordReset$.next();

    expect(service.errorMessage$.value).toBe('Token expired');
    expect(service.isSubmitting$.value).toBeFalse();
  });

  it('performRedirect navigates to login with resetSuccess param', () => {
    const {service, router} = build();

    service.performRedirect();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      jasmine.objectContaining({queryParams: {resetSuccess: true}})
    );
  });

  it('countdown decrements redirectCountdown$ each second', fakeAsync(() => {
    const {service} = build();
    service.startRedirectCountdown(3);

    tick(1000);
    expect(service.redirectCountdown$.value).toBe(2);

    tick(1000);
    expect(service.redirectCountdown$.value).toBe(1);

    service.ngOnDestroy();
  }));

  it('startRedirectCountdown initializes progress to 100 and decrements proportionally', fakeAsync(() => {
    const {service} = build();
    service.startRedirectCountdown(4);

    expect(service.redirectProgress$.value).toBe(100);

    tick(1000);
    expect(service.redirectProgress$.value).toBeCloseTo(75, 0);

    tick(1000);
    expect(service.redirectProgress$.value).toBeCloseTo(50, 0);

    service.ngOnDestroy();
  }));

  it('isSubmitting$ starts as false', () => {
    const {service} = build();
    expect(service.isSubmitting$.value).toBeFalse();
  });
});
