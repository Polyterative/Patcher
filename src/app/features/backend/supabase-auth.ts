import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AuthError,
  Session,
  SupabaseClient,
  User
} from '@supabase/supabase-js';
import {
  from as rxFrom,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  timeout,
  withLatestFrom
} from 'rxjs/operators';
import { Database } from 'src/backend/database.types';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBuster$,
  cacheBust
} from './supabase.cache';
import {
  OAuthProvider,
  RichUserModel,
  SimpleUserModel,
  SupabaseLoginResponse,
  SupabaseSignupResponse
} from './supabase.types';
import {
  AUTH_CACHE_KEYS,
  createPasswordResetError,
  extractSessionId,
  getAuthInitializationSettled$,
  getSettledAuthSession$,
  isValidEmail,
  mapLoginUser,
  mapRichUserSession,
  mapSimpleUserSession,
  OAUTH_CALLBACK_SESSION_TIMEOUT_MS,
  OAUTH_CALLBACK_TOTAL_TIMEOUT_MS,
  PasswordResetError,
  RecoveryEventSession
} from './supabase-auth.helpers';


export function createAuthNamespace(
  supabase: SupabaseClient<Database>,
  activated: ActivatedRoute,
  snackBar: MatSnackBar,
  authSession$: Observable<Session | null>,
  passwordRecoverySession$: Observable<RecoveryEventSession | null>
) {
  const settledAuthSession$ = (nullSessionTimeoutMs?: number): Observable<Session | null> =>
    getSettledAuthSession$(authSession$, nullSessionTimeoutMs);

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
          const authenticatedUser = authResponse.data.user;
          const toLoginResponse$ = () => ns._getUserNameFromDatabase(authenticatedUser.id).pipe(
            map(usernameGetterResponse => {
              if (usernameGetterResponse.error) {
                throw new Error(usernameGetterResponse.error.message || 'Failed to load user profile after login.');
              }

              const profile = usernameGetterResponse.data?.[0];
              if (!profile) {
                throw new Error('User profile not found after login.');
              }

              return {
                returnUrl: params['returnUrl'],
                user: mapLoginUser(authenticatedUser, profile)
              };
            })
          );

          return toLoginResponse$().pipe(
            catchError(error => {
              if (error?.message !== 'User profile not found after login.') {
                return throwError(() => error);
              }

              return ns._ensureOAuthUserProfile$(authenticatedUser).pipe(
                switchMap(() => toLoginResponse$())
              );
            })
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
      return settledAuthSession$(OAUTH_CALLBACK_SESSION_TIMEOUT_MS).pipe(
        switchMap(session => {
          if (!session) {
            return of(null);
          }
          const user = session.user;
          return ns.getRichUserSession$().pipe(
            switchMap(richUser => {
              if (!richUser || !richUser.username) {
                // New OAuth user: create profile then re-fetch so we return a real RichUserModel
                return ns._ensureOAuthUserProfile$(user).pipe(
                  switchMap(() => ns.getRichUserSession$())
                );
              }
              return of(richUser);
            })
          );
        }),
        // Outer settlement guarantee: closes the "authSession$ never emits at
        // all" gap that the inner OAUTH_CALLBACK_SESSION_TIMEOUT_MS cannot
        // cover, since that inner timeout only arms once settledAuthSession$'s
        // own switchMap projection has been entered.
        timeout({
          first: OAUTH_CALLBACK_TOTAL_TIMEOUT_MS,
          with: () => of(null)
        })
      );
    },
    
    _ensureOAuthUserProfile$(user: User): Observable<void> {
      const email = user.email || '';
      // Always use user_ prefix so AuthCallbackComponent can reliably detect new users
      const tempUsername = `user_${ user.id.substring(0, 8) }`;
      
      // INSERT a new profile if none exists; on conflict (existing user) only update
      // non-username fields so a previously set custom username is never overwritten.
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
          }, {onConflict: 'id', ignoreDuplicates: true})
      ).pipe(
        switchMap(insertResult => {
          if (!insertResult.error) {
            // Row was freshly inserted — temp username is correct, nothing more to do
            return of(void 0);
          }
          // Row already exists (conflict not ignored cleanly, or some other error):
          // Update only the fields that are safe to overwrite, leaving username intact.
          return rxFrom(
            supabase
              .from(DbPaths.profiles)
              .update({email, confirmed: true, updated_at: new Date().toISOString()})
              .eq('id', user.id)
          ).pipe(map(() => void 0));
        })
      );
    },
    
    signup$(username: string, email: string, password: string): SupabaseSignupResponse {
      const trimmedUsername = username?.trim() ?? '';
      if (!trimmedUsername) {
        return throwError(() => new Error('Username cannot be empty or whitespace.'));
      }
      return rxFrom(supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: trimmedUsername
          }
        }
      })).pipe(
        map(({data, error}) => {
          if (error) {
            throw error;
          }

          return {
            user: data.user ? {
              id: data.user.id,
              email: data.user.email,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at
            } : null,
            requiresEmailConfirmation: !data.session
          };
        })
      );
    },
    
    getUserSession$(): Observable<SimpleUserModel | null> {
      return settledAuthSession$().pipe(map(mapSimpleUserSession));
    },
    
    getRichUserSession$(): Observable<RichUserModel | null> {
      return settledAuthSession$().pipe(
        switchMap(session => {
          if (!session) return of(null);
          const sessionUser = session.user;
          return ns._getUserNameFromDatabase(sessionUser.id).pipe(
            map(usernameGetterResponse => {
              if (usernameGetterResponse.error) {
                return null;
              }

              const profile = usernameGetterResponse.data?.[0];
              if (!profile) {
                return null;
              }

              return mapRichUserSession(sessionUser, profile);
            })
          );
        })
      );
    },
    
    _getUserNameFromDatabase(userId: string) {
      return rxFrom(
        supabase
          .from(DbPaths.profiles)
          .select('username, public, website, avatar_url')
          .filter('id', 'eq', userId)
      );
    },
    
    logoff$(): Observable<{
      error: AuthError | null
    }> {
      ns._burstAllCaches();
      return rxFrom(supabase.auth.signOut());
    },

    logoffLocal$(): Observable<{
      error: AuthError | null
    }> {
      ns._burstAllCaches();
      return rxFrom(supabase.auth.signOut({scope: 'local'}));
    },

    deleteCurrentUserAccount$(): Observable<void> {
      return rxFrom(supabase.rpc('delete_current_user_account')).pipe(
        map(({error}) => {
          if (error) {
            throw error;
          }
          return void 0;
        }),
        catchError(error => throwError(() => error))
      );
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
        if (!isValidEmail(emailOrToken)) {
          return throwError(() => new Error('Invalid email address.'));
        }
        const redirectTo = `${ window.location.origin }/auth/reset-password`;
        return rxFrom(supabase.auth.resetPasswordForEmail(emailOrToken, {redirectTo})).pipe(
          map(response => {
            if (response.error) throw response.error;
          }),
          catchError(error => throwError(() => ns._createPasswordResetError(error)))
        );
      }
    },

    /**
     * Replays `SupabaseService`'s own `PASSWORD_RECOVERY`/`SIGNED_OUT`-derived
     * recovery event stream — race-free (`BehaviorSubject`) for a late-
     * subscribing lazy route, cleared to `null` centrally on `SIGNED_OUT`.
     */
    passwordRecoverySession$,

    /**
     * Emits once (`undefined`) when the SDK's own auth initialization for
     * this page load has genuinely settled — see
     * `getAuthInitializationSettled$` for the full lifecycle rationale.
     * Consumers use this instead of a fixed wall-clock timer to decide when
     * it is safe to conclude "no recovery event is coming" for a bare/
     * malformed recovery link (no `token_hash`, no hash-based recovery).
     */
    authInitializationSettled$: getAuthInitializationSettled$(authSession$),

    /**
     * Verifies a query-param `token_hash` recovery link (explicit shape).
     * Rethrows the raw SDK error on failure so the caller decides messaging;
     * resolves to a `RecoveryEventSession` (or `null` if the SDK returned no
     * session, or the session's `session_id` claim cannot be safely
     * extracted — fails closed rather than binding a marker to an empty
     * sessionId) on success.
     */
    verifyRecoveryOtp$(tokenHash: string): Observable<RecoveryEventSession | null> {
      return rxFrom(supabase.auth.verifyOtp({token_hash: tokenHash, type: 'recovery'})).pipe(
        map(response => {
          if (response.error) {
            throw response.error;
          }

          const session = response.data?.session;
          if (!session) return null;

          const sessionId = extractSessionId(session.access_token);
          if (!sessionId) return null;

          return {
            userId: session.user.id,
            sessionId,
            emittedAt: Date.now()
          };
        })
      );
    },

    /**
     * Live-session identity used to validate a recovery marker on every
     * mount (reload/back-forward) — never a URL-text-based check.
     */
    getCurrentSessionFingerprint$(): Observable<{userId: string; sessionId: string} | null> {
      return settledAuthSession$().pipe(
        map(session => {
          if (!session) return null;

          const sessionId = extractSessionId(session.access_token);
          if (!sessionId) return null;

          return {userId: session.user.id, sessionId};
        })
      );
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
          .select('username')
      ).pipe(
        map(response => {
          if (response.error) {
            if (response.error.code === '23505' || response.error.message?.includes('unique')) {
              throw new Error('This username is already taken. Please choose another one.');
            }
            throw new Error(response.error.message || 'Failed to update username.');
          }
          // .select() returns an empty array when RLS silently blocks the update (0 rows matched)
          if (!response.data || response.data.length === 0) {
            console.error('Username update silently failed — 0 rows updated. userId:', userId, 'auth.uid check may have failed.');
            throw new Error('Username update had no effect. Your session may have expired — please refresh and try again.');
          }
          return void 0;
        }),
        catchError(error => {
          console.error('Username update failed:', error);
          return throwError(() => error);
        })
      );
    },

    isUsernameAvailable$(username: string, excludeUserId?: string): Observable<boolean> {
      const trimmedUsername = username.trim();
      const escapedUsername = trimmedUsername.replace(/[\\%_]/g, '\\$&');

      if (!trimmedUsername) {
        return of(false);
      }

      let query = supabase
        .from(DbPaths.profiles)
        .select('id')
        .ilike('username', escapedUsername);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      return rxFrom(
        query.limit(1)
      ).pipe(
        map(response => {
          if (response.error) {
            throw new Error(response.error.message || 'Failed to check username availability.');
          }
          return (response.data?.length ?? 0) === 0;
        })
      );
    },

    updateProfileVisibility$(userId: string, isPublic: boolean): Observable<void> {
      return rxFrom(
        supabase
          .from(DbPaths.profiles)
          .update({public: isPublic, updated_at: new Date().toISOString()})
          .eq('id', userId)
          .select('public')
      ).pipe(
        map(response => {
          if (response.error) {
            throw new Error(response.error.message || 'Failed to update profile visibility.');
          }

          if (!response.data || response.data.length === 0) {
            console.error('Profile visibility update silently failed — 0 rows updated. userId:', userId);
            throw new Error('Profile visibility update had no effect. Your session may have expired — please refresh and try again.');
          }

          return void 0;
        }),
        cacheBust(['profiles']),
        catchError(error => {
          console.error('Profile visibility update failed:', error);
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
      cacheBuster$.next([...AUTH_CACHE_KEYS]);
    },
    
    _updateUserProfile(email: string, password: string, username: string): Observable<SupabaseLoginResponse> {
      const trimmedUsername = username?.trim() ?? '';
      if (!trimmedUsername) {
        return throwError(() => new Error('Username cannot be empty or whitespace.'));
      }
      return ns.login$(email, password).pipe(
        switchMap(x =>
          rxFrom(
            supabase
              .from(DbPaths.profiles)
              .update({confirmed: true, username: trimmedUsername})
              .eq('id', x.user.id)
          ).pipe(
            map(() => x),
            switchMap(x => rxFrom(supabase.auth.signOut()).pipe(map(() => x)))
          )
        )
      );
    },
    
    _createPasswordResetError(error: unknown): PasswordResetError {
      return createPasswordResetError(error);
    },
    
    _isValidEmail(email: string): boolean {
      return isValidEmail(email);
    },

    /**
     * Returns an observable that emits `true` only when the active session's
     * JWT contains `app_metadata.role === 'admin'`.
     * Falls back to `false` for all other users and unauthenticated sessions.
     */
    hasAdminRole$(): Observable<boolean> {
      return authSession$.pipe(
        map(session => {
          const metadata = session?.user?.app_metadata as Record<string, unknown> | undefined;
          return metadata?.['role'] === 'admin';
        }),
        catchError(() => of(false))
      );
    }
  };
  
  return ns;
}
