import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  of,
  Subject,
  throwError
} from 'rxjs';
import { AuthApiError } from '@supabase/supabase-js';
import { SupabaseLoginResponse } from 'src/app/features/backend/supabase.types';
import { PasswordResetError } from 'src/app/features/backend/supabase-auth.helpers';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';
import { UserLoginDataService } from './user-login-data.service';


describe('UserLoginDataService', () => {
  function loginResponse(returnUrl: string | null): SupabaseLoginResponse {
    return {
      returnUrl,
      user: {
        id: 'u-1',
        email: 'user@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        username: 'user'
      }
    };
  }

  function build() {
    const loginInteraction = jasmine.createSpyObj<UserManagementService>('UserManagementService', ['login$', 'resetPassword$']);
    loginInteraction.login$.and.returnValue(of(loginResponse(null)));
    loginInteraction.resetPassword$.and.returnValue(of(undefined));
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    const service = new UserLoginDataService(
      router,
      loginInteraction,
      snackBar
    );
    return {service, loginInteraction, router, snackBar};
  }

  it('navigates to user area after successful login', () => {
    const {service, loginInteraction, router} = build();
    loginInteraction.login$.and.returnValue(of(loginResponse(null)));
    service.fields.user.control.setValue('user@example.com');
    service.fields.password.control.setValue('password123');

    service.mailLoginClick$.next();

    expect(loginInteraction.login$).toHaveBeenCalledWith('user@example.com', 'password123');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/user/area');
  });

  it('navigates to returnUrl after login when one is provided', () => {
    const {service, loginInteraction, router} = build();
    loginInteraction.login$.and.returnValue(of(loginResponse('/modules/browser')));
    service.fields.user.control.setValue('user@example.com');
    service.fields.password.control.setValue('password123');

    service.mailLoginClick$.next();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/modules/browser');
  });

  it('falls back when login returns an external returnUrl', () => {
    const {service, loginInteraction, router} = build();
    loginInteraction.login$.and.returnValue(of(loginResponse('https://evil.example/phish')));
    service.fields.user.control.setValue('user@example.com');
    service.fields.password.control.setValue('password123');

    service.mailLoginClick$.next();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/user/area');
  });

  it('retries login and produces a new authentication request after a rejected password, then succeeds', () => {
    const {service, loginInteraction, router} = build();
    loginInteraction.login$.and.returnValue(
      throwError(() => new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))
    );
    service.fields.user.control.setValue('user@example.com');
    service.fields.password.control.setValue('wrongpass');

    service.mailLoginClick$.next();

    loginInteraction.login$.and.returnValue(of(loginResponse(null)));
    service.fields.password.control.setValue('correctpass');
    service.mailLoginClick$.next();

    expect(loginInteraction.login$).toHaveBeenCalledTimes(2);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/user/area');
  });

  it('suppresses a second concurrent login request while the first is still pending', () => {
    const {service, loginInteraction} = build();
    const pending = new Subject<SupabaseLoginResponse>();
    loginInteraction.login$.and.returnValue(pending.asObservable());
    service.fields.user.control.setValue('user@example.com');
    service.fields.password.control.setValue('password123');

    service.mailLoginClick$.next();
    service.mailLoginClick$.next();
    pending.next(loginResponse(null));
    pending.complete();

    expect(loginInteraction.login$).toHaveBeenCalledTimes(1);
  });

  it('shows password reset form and clears messages when toggle is true', () => {
    const {service} = build();
    service.resetSuccessMessage$.next('old success');
    service.resetErrorMessage$.next('old error');

    service.togglePasswordReset$.next(true);

    expect(service.showPasswordReset$.value).toBeTrue();
    expect(service.resetSuccessMessage$.value).toBe('');
    expect(service.resetErrorMessage$.value).toBe('');
  });

  it('hides password reset form when toggle is false', () => {
    const {service} = build();
    service.togglePasswordReset$.next(true);
    service.togglePasswordReset$.next(false);

    expect(service.showPasswordReset$.value).toBeFalse();
  });

  it('sets error message when requesting reset with empty email', () => {
    const {service} = build();
    service.fields.user.control.setValue('');

    service.requestPasswordReset$.next();

    expect(service.resetErrorMessage$.value).toContain('email address');
    expect(service.isSubmittingReset$.value).toBeFalse();
  });

  it('sets error message when requesting reset with invalid email format', () => {
    const {service} = build();
    service.fields.user.control.setValue('not-an-email');

    service.requestPasswordReset$.next();

    expect(service.resetErrorMessage$.value).toContain('valid email');
    expect(service.isSubmittingReset$.value).toBeFalse();
  });

  it('calls resetPassword$ and sets success message on valid email', () => {
    const {service, loginInteraction} = build();
    loginInteraction.resetPassword$.and.returnValue(of(undefined));
    service.fields.user.control.setValue('valid@example.com');

    service.requestPasswordReset$.next();

    expect(loginInteraction.resetPassword$).toHaveBeenCalledWith('valid@example.com');
    expect(service.resetSuccessMessage$.value).toContain('email');
    expect(service.isSubmittingReset$.value).toBeFalse();
  });

  it('sets error message when resetPassword$ backend call fails', () => {
    const {service, loginInteraction} = build();
    loginInteraction.resetPassword$.and.returnValue(throwError(() => new PasswordResetError('network error')));
    service.fields.user.control.setValue('valid@example.com');

    service.requestPasswordReset$.next();

    expect(service.resetErrorMessage$.value).toBe(SharedConstants.messages.passwordResetEmailFailed);
    expect(service.isSubmittingReset$.value).toBeFalse();
  });

  it('shows the rate-limit inline message and re-enables submit when resetPassword$ rejects with a 429 PasswordResetError', () => {
    const {service, loginInteraction} = build();
    loginInteraction.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Email rate limit exceeded', 'over_email_send_rate_limit', 429))
    );
    service.fields.user.control.setValue('user@example.com');

    service.requestPasswordReset$.next();

    expect(service.resetErrorMessage$.value).toBe(SharedConstants.messages.overEmailSendRateLimit);
    expect(service.isSubmittingReset$.value).toBeFalse();
  });

  it('shows the rate-limit inline message for over_request_rate_limit without requiring status 429', () => {
    const {service, loginInteraction} = build();
    loginInteraction.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Request rate limit exceeded', 'over_request_rate_limit', 400))
    );
    service.fields.user.control.setValue('user@example.com');

    service.requestPasswordReset$.next();

    expect(service.resetErrorMessage$.value).toBe(SharedConstants.messages.overEmailSendRateLimit);
    expect(service.isSubmittingReset$.value).toBeFalse();
  });

  it('shows the passwordResetEmailFailed inline message when resetPassword$ rejects with a non-rate-limit PasswordResetError', () => {
    const {service, loginInteraction} = build();
    loginInteraction.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Some other failure', 'weak_password', 422))
    );
    service.fields.user.control.setValue('user@example.com');

    service.requestPasswordReset$.next();

    expect(service.resetErrorMessage$.value).toBe(SharedConstants.messages.passwordResetEmailFailed);
    expect(service.isSubmittingReset$.value).toBeFalse();
  });

  it('clears stale reset success text immediately when a new reset request starts', () => {
    const {service, loginInteraction} = build();
    const pending = new Subject<void>();
    loginInteraction.resetPassword$.and.returnValue(pending.asObservable());
    service.resetSuccessMessage$.next('old success');
    service.resetErrorMessage$.next('old error');
    service.fields.user.control.setValue('user@example.com');

    service.requestPasswordReset$.next();

    expect(service.resetSuccessMessage$.value).toBe('');
    expect(service.resetErrorMessage$.value).toBe('');
    expect(service.isSubmittingReset$.value).toBeTrue();

    pending.next();
    pending.complete();
  });

  it('allows a second reset-request after a 429 failure, and again after a generic failure', () => {
    const {service, loginInteraction} = build();
    loginInteraction.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Email rate limit exceeded', 'over_email_send_rate_limit', 429))
    );
    service.fields.user.control.setValue('user@example.com');
    service.requestPasswordReset$.next();

    loginInteraction.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Some other failure', 'weak_password', 422))
    );
    service.requestPasswordReset$.next();

    loginInteraction.resetPassword$.and.returnValue(of(undefined));
    service.requestPasswordReset$.next();

    expect(loginInteraction.resetPassword$).toHaveBeenCalledTimes(3);
    expect(service.resetSuccessMessage$.value).toContain('email');
  });
});
