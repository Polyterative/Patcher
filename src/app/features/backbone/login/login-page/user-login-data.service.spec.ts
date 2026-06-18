import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  of,
  throwError
} from 'rxjs';
import { SupabaseLoginResponse } from 'src/app/features/backend/supabase.types';
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
    loginInteraction.resetPassword$.and.returnValue(throwError(() => new Error('network error')));
    service.fields.user.control.setValue('valid@example.com');

    service.requestPasswordReset$.next();

    expect(service.resetErrorMessage$.value).toContain('wrong');
    expect(service.isSubmittingReset$.value).toBeFalse();
  });
});
