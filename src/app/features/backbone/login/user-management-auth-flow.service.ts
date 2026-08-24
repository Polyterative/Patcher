import { Injectable } from '@angular/core';
import {
  from,
  EMPTY,
  NEVER,
  Observable,
  throwError
} from 'rxjs';
import {
  catchError,
  filter,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { isAuthApiError } from '@supabase/supabase-js';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { isPasswordResetRateLimited } from '../../backend/supabase-auth.helpers';
import { SupabaseLoginResponse } from '../../backend/supabase.service';
import {
  OAuthProvider,
  UserManagementContext
} from './user-management-internals';

@Injectable({ providedIn: 'root' })
export class UserManagementAuthFlowService {
  register(ctx: UserManagementContext): void {
    this.initializeLoginHandler(ctx);
    this.initializeLogoffHandler(ctx);
    this.initializeResetPasswordHandler(ctx);
    this.initializeSSOLoginHandler(ctx);
    this.initializeOAuthCallbackHandler(ctx);
  }

  login$(email: string, password: string, ctx: UserManagementContext): Observable<SupabaseLoginResponse> {
    return ctx.backend.auth.login$(email, password).pipe(
      catchError((error) => {
        if (isAuthApiError(error) && error.code === 'invalid_credentials') {
          SharedConstants.errorLogin(ctx.snackBar);
        } else {
          SharedConstants.errorCustom(ctx.snackBar, SharedConstants.messages.operationFailed);
        }
        return EMPTY;
      }),
      tap(x => {
        ctx.publishSignedInProfile(x.user);
      })
    );
  }

  resetPassword$(email: string, ctx: UserManagementContext): Observable<void> {
    return ctx.backend.auth.resetPassword$(email).pipe(
      catchError((error) => {
        ctx.analytics.capture('auth.password_reset_request_failed', {});
        return throwError(() => error);
      }),
      tap(() => SharedConstants.successCustom(ctx.snackBar, SharedConstants.messages.passwordResetEmailSent))
    );
  }

  loginWithSSO(provider: OAuthProvider, redirectUrl: string | undefined, ctx: UserManagementContext): void {
    ctx.ssoLoginAction$.next({provider, redirectUrl});
  }

  handleOAuthCallback(ctx: UserManagementContext): void {
    ctx.handleOAuthCallbackAction$.next();
  }

  private initializeLoginHandler(ctx: UserManagementContext): void {
    ctx.loginAction$.pipe(
      switchMap(({email, password}) => ctx.backend.auth.login$(email, password).pipe(
        catchError(() => {
          SharedConstants.errorLogin(ctx.snackBar);
          return EMPTY;
        })
      )),
      tap(x => {
        ctx.publishSignedInProfile(x.user);
        ctx.analytics.capture('auth.signed_in', { method: 'password' });
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeLogoffHandler(ctx: UserManagementContext): void {
    ctx.logoffAction$.pipe(
      switchMap(() => from(ctx.backend.auth.logoff$()).pipe(
        catchError((error) => {
          console.error('Logout failed:', error);
          SharedConstants.errorCustom(ctx.snackBar, SharedConstants.messages.operationFailed);
          return NEVER;
        })
      )),
      tap(() => {
        ctx.analytics.capture('auth.signed_out');
        ctx.router.navigate(['/auth/login']);
        SharedConstants.successLogout(ctx.snackBar);
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeResetPasswordHandler(ctx: UserManagementContext): void {
    ctx.resetPasswordAction$.pipe(
      switchMap(email => ctx.backend.auth.resetPassword$(email).pipe(
        catchError((error) => {
          this.showResetPasswordError(error, ctx);
          return EMPTY;
        })
      )),
      tap(() => {
        ctx.analytics.capture('auth.password_reset_requested', {});
        SharedConstants.successCustom(ctx.snackBar, SharedConstants.messages.passwordResetEmailSent);
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeSSOLoginHandler(ctx: UserManagementContext): void {
    ctx.ssoLoginAction$.pipe(
      switchMap(({provider, redirectUrl}) => ctx.backend.auth.loginWithOAuth$(provider, redirectUrl).pipe(
        tap(() => ctx.analytics.capture('auth.sso_login_initiated', { provider })),
        catchError((error) => {
          console.error('SSO login failed:', error);
          SharedConstants.errorCustom(
            ctx.snackBar,
            'Social login failed. Please try again.'
          );
          return NEVER;
        })
      )),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeOAuthCallbackHandler(ctx: UserManagementContext): void {
    ctx.handleOAuthCallbackAction$.pipe(
      switchMap(() => ctx.backend.auth.handleOAuthCallback$().pipe(
        catchError((error) => {
          console.error('OAuth callback handling failed:', error);
          SharedConstants.errorCustom(
            ctx.snackBar,
            'Authentication failed. Please try again.'
          );
          return NEVER;
        })
      )),
      filter(user => !!user),
      tap(user => {
        ctx.publishSignedInProfile(user);
        ctx.analytics.capture('auth.signed_in', { method: 'oauth' });
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private showResetPasswordError(error: unknown, ctx: UserManagementContext): void {
    SharedConstants.errorCustom(
      ctx.snackBar,
      isPasswordResetRateLimited(error)
        ? SharedConstants.messages.overEmailSendRateLimit
        : SharedConstants.messages.passwordResetEmailFailed
    );
  }
}
