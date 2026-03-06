import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AuthError,
  SupabaseClient,
  User
} from '@supabase/supabase-js';
import {
  from as rxFrom,
  Observable,
  of,
  shareReplay,
  throwError
} from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  withLatestFrom
} from 'rxjs/operators';
import { Database } from 'src/backend/database.types';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { DbPaths } from './DatabaseStrings';
import { cacheBuster$ } from './supabase.cache';
import {
  OAuthProvider,
  RichUserModel,
  SimpleUserModel,
  SupabaseLoginResponse,
  SupabaseSignupResponse
} from './supabase.types';


class PasswordResetError extends Error {
  constructor(
    public override message: string,
    public errorCode?: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'PasswordResetError';
  }
}


export function createAuthNamespace(
  supabase: SupabaseClient<Database>,
  activated: ActivatedRoute,
  snackBar: MatSnackBar
) {
  const ns = {
    login$(email: string, password: string): Observable<SupabaseLoginResponse> {
      const params$ = of('').pipe(
        withLatestFrom(activated.queryParams),
        map(([, data]) => data)
      );
      
      return rxFrom(supabase.auth.signInWithPassword({email, password})).pipe(
        switchMap(authResponse => {
          const updateConfirmed$ = rxFrom(
            supabase
              .from(DbPaths.profiles)
              .update({confirmed: true})
              .filter('id', 'eq', authResponse.data.user.id)
          ).pipe(map(() => authResponse));
          
          return authResponse.error ? of(authResponse) : updateConfirmed$.pipe(map(() => authResponse));
        }),
        withLatestFrom(params$),
        switchMap(([authResponse, params]) => {
          if (authResponse.error || !authResponse.data?.user) {
            return throwError(() => authResponse.error || new Error('Authentication failed'));
          }
          return rxFrom(
            supabase
              .from(DbPaths.profiles)
              .select('username')
              .filter('id', 'eq', authResponse.data.user.id)
          ).pipe(
            map(usernameGetterResponse => ({
              returnUrl: params['returnUrl'],
              user: {
                ...authResponse.data.user,
                username: usernameGetterResponse.data[0].username
              }
            }))
          );
        })
      );
    },
    
    loginWithOAuth$(provider: OAuthProvider, redirectTo?: string): Observable<void> {
      const redirectUrl = redirectTo || `${ window.location.origin }/auth/callback`;
      
      return rxFrom(
        supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
            scopes: 'email'
          }
        })
      ).pipe(
        map(response => {
          if (response.error) throw response.error;
          return void 0;
        })
      );
    },
    
    handleOAuthCallback$(): Observable<RichUserModel | null> {
      return rxFrom(supabase.auth.getSession()).pipe(
        switchMap(sessionResponse => {
          if (sessionResponse.error || !sessionResponse.data.session) {
            return of(null);
          }
          const user = sessionResponse.data.session.user;
          return ns.getRichUserSession$().pipe(
            switchMap(richUser => {
              if (!richUser || !richUser.username) {
                return ns._ensureOAuthUserProfile$(user).pipe(map(() => richUser));
              }
              return of(richUser);
            })
          );
        })
      );
    },
    
    _ensureOAuthUserProfile$(user: User): Observable<void> {
      const email = user.email || '';
      const tempUsername = email.split('@')[0] || `user_${ user.id.substring(0, 8) }`;
      
      return rxFrom(
        supabase
          .from(DbPaths.profiles)
          .upsert({
            id: user.id,
            email,
            username: tempUsername,
            confirmed: true,
            created_at: user.created_at,
            updated_at: new Date().toISOString()
          }, {onConflict: 'id'})
      ).pipe(map(() => void 0));
    },
    
    signup$(username: string, email: string, password: string): SupabaseSignupResponse {
      return rxFrom(supabase.auth.signUp({email, password})).pipe(
        switchMap(x => x.error ? of(x.data) : ns._updateUserProfile(email, password, username))
      );
    },
    
    getUserSession$(): Observable<SimpleUserModel | null> {
      return rxFrom(supabase.auth.getSession()).pipe(
        switchMap(sessionOutput => {
          if (sessionOutput.data.session == null) return of(null);
          
          const userFullData: SimpleUserModel = {
            id: sessionOutput.data.session.user.id,
            email: sessionOutput.data.session.user.email,
            created_at: sessionOutput.data.session.user.created_at,
            updated_at: sessionOutput.data.session.user.updated_at
          };
          return of(userFullData);
        }),
        shareReplay(1)
      );
    },
    
    getRichUserSession$(): Observable<RichUserModel | null> {
      return ns.getUserSession$().pipe(
        switchMap(simpleUserData => {
          if (simpleUserData == null) return of(null);
          return ns._getUserNameFromDatabase(simpleUserData.id).pipe(
            map(usernameGetterResponse => ({
              ...simpleUserData,
              username: usernameGetterResponse.data[0].username,
              email: simpleUserData.email
            }))
          );
        }),
        shareReplay(1)
      );
    },
    
    _getUserNameFromDatabase(userId: string) {
      return rxFrom(
        supabase
          .from(DbPaths.profiles)
          .select('username')
          .filter('id', 'eq', userId)
      );
    },
    
    logoff$(): Observable<{
      error: AuthError | null
    }> {
      ns._burstAllCaches();
      return rxFrom(supabase.auth.signOut());
    },
    
    resetPassword$(emailOrToken: string, newPassword?: string): Observable<void> {
      if (newPassword) {
        return rxFrom(supabase.auth.updateUser({password: newPassword})).pipe(
          map(response => {
            if (response.error) throw ns._createPasswordResetError(response.error);
          }),
          catchError(error => {
            return throwError(() => ns._createPasswordResetError(error));
          })
        );
      } else {
        if (!ns._isValidEmail(emailOrToken)) {
          return throwError(() => new Error('Invalid email address.'));
        }
        const redirectTo = `${ window.location.origin }/auth/reset-password`;
        return rxFrom(supabase.auth.resetPasswordForEmail(emailOrToken, {redirectTo})).pipe(
          map(response => {
            if (response.error) {
              throw new PasswordResetError('Failed to send password reset email.', response.error.message);
            }
          }),
          catchError(error => throwError(() => error))
        );
      }
    },
    
    updateUsername$(userId: string, newUsername: string): Observable<void> {
      const trimmedUsername = newUsername.trim();
      
      if (!trimmedUsername || trimmedUsername.length < 3) {
        return throwError(() => new Error('Username must be at least 3 characters long.'));
      }
      if (trimmedUsername.length > 30) {
        return throwError(() => new Error('Username must be 30 characters or less.'));
      }
      const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!validUsernameRegex.test(trimmedUsername)) {
        return throwError(() => new Error('Username can only contain letters, numbers, underscores, and hyphens.'));
      }
      
      return rxFrom(
        supabase
          .from(DbPaths.profiles)
          .update({username: trimmedUsername, updated_at: new Date().toISOString()})
          .eq('id', userId)
      ).pipe(
        map(response => {
          if (response.error) {
            if (response.error.code === '23505' || response.error.message?.includes('unique')) {
              throw new Error('This username is already taken. Please choose another one.');
            }
            throw new Error(response.error.message || 'Failed to update username.');
          }
          return void 0;
        }),
        catchError(error => {
          console.error('Username update failed:', error);
          return throwError(() => error);
        })
      );
    },
    
    updatePassword$(newPassword: string): Observable<void> {
      return rxFrom(supabase.auth.updateUser({password: newPassword})).pipe(
        map(response => {
          if (response.error) throw new Error(response.error.message || 'Password update failed.');
          return void 0;
        }),
        catchError(error => {
          console.error('Password change failed:', error);
          return throwError(() => error);
        })
      );
    },
    
    _errorMsg() {
      return SharedConstants.errorHandlerOperation(snackBar);
    },
    
    _burstAllCaches() {
      cacheBuster$.next([
        'comments',
        'modules',
        'currentUserModules',
        'moduleWithId',
        'manufacturers',
        'patchConnections',
        'patchModuleInstances',
        'rackWithId',
        'patches',
        'currentUserComments'
      ]);
    },
    
    _updateUserProfile(email: string, password: string, username: string): Observable<SupabaseLoginResponse> {
      return ns.login$(email, password).pipe(
        switchMap(x =>
          rxFrom(
            supabase
              .from(DbPaths.profiles)
              .update({confirmed: true, username})
              .eq('id', x.user.id)
          ).pipe(
            map(() => x),
            switchMap(x => rxFrom(supabase.auth.signOut()).pipe(map(() => x)))
          )
        )
      );
    },
    
    _createPasswordResetError(error: any): PasswordResetError {
      const errorCode = error?.error_code || error?.code || error?.name;
      const message = error?.msg || error?.message || error?.error_description;
      const statusCode = error?.code;
      const errorMessages = SharedConstants.messages.resetPassword;
      
      if (errorCode === 'same_password' || message?.toLowerCase().includes('same password')) {
        return new PasswordResetError(errorMessages.samePassword, errorCode, statusCode);
      }
      if (errorCode === 'weak_password' || message?.toLowerCase().includes('weak password')) {
        return new PasswordResetError(errorMessages.weakPassword, errorCode, statusCode);
      }
      if (
        errorCode === 'invalid_credentials' || errorCode === 'invalid_grant' ||
        message?.toLowerCase().includes('invalid') || message?.toLowerCase().includes('expired')
      ) {
        return new PasswordResetError(errorMessages.invalidSession, errorCode, statusCode);
      }
      if (errorCode === 'network_error' || message?.toLowerCase().includes('network') || message?.toLowerCase().includes('fetch')) {
        return new PasswordResetError(errorMessages.networkError, errorCode, statusCode);
      }
      
      return new PasswordResetError(message || errorMessages.unknownError, errorCode, statusCode);
    },
    
    _isValidEmail(email: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * Returns an observable that emits `true` only when the active session's
     * JWT contains `app_metadata.role === 'admin'`.
     * Falls back to `false` for all other users and unauthenticated sessions.
     */
    hasAdminRole$(): Observable<boolean> {
      return rxFrom(supabase.auth.getSession()).pipe(
        map(({ data }) => {
          const metadata = data?.session?.user?.app_metadata as Record<string, unknown> | undefined;
          return metadata?.['role'] === 'admin';
        }),
        catchError(() => of(false))
      );
    }
  };
  
  return ns;
}