import { Injectable } from '@angular/core';
import {
  Observable,
  of
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import {
  RichUserModel,
  SimpleUserModel
} from '../../backend/supabase.service';
import { UserManagementContext } from './user-management-internals';

@Injectable({ providedIn: 'root' })
export class UserManagementSessionSyncService {
  register(ctx: UserManagementContext): void {
    this.initializeUserBoxHandler(ctx);
    this.initializeProfileFetchHandler(ctx);
    this.initializeUserBoxLogoffHandler(ctx);
    this.initializeCrossTabLogoutHandler(ctx);
    this.initializeCrossTabLoginHandler(ctx);
    this.initializeSentryIdentityHandler(ctx);
    this.initializeAnalyticsIdentityHandler(ctx);
  }

  private initializeUserBoxHandler(ctx: UserManagementContext): void {
    ctx.loggedUserFullProfile$
      .pipe(takeUntil(ctx.destroy$))
      .subscribe(x => {
        ctx.userBoxService.store.user$.next({username: x?.username});
      });
  }

  private initializeSentryIdentityHandler(ctx: UserManagementContext): void {
    ctx.loggedUserFullProfile$
      .pipe(takeUntil(ctx.destroy$))
      .subscribe(profile => {
        if (profile && profile.id) {
          ctx.sentryContext.setUser({
            id:       profile.id,
            email:    profile.email,
            username: profile.username
          });
        } else {
          ctx.sentryContext.clearUser();
        }
      });
  }

  private initializeAnalyticsIdentityHandler(ctx: UserManagementContext): void {
    ctx.loggedUserFullProfile$
      .pipe(takeUntil(ctx.destroy$))
      .subscribe(profile => {
        if (profile && profile.id) {
          ctx.analytics.identify({
            id:       profile.id,
            email:    profile.email,
            username: profile.username
          });
        } else {
          ctx.analytics.reset();
        }
      });
  }

  private initializeProfileFetchHandler(ctx: UserManagementContext): void {
    ctx.loggedUser$
      .pipe(
        tap((user) => {
          ctx.setCurrentUserId(user?.id);
          if (!user) {
            ctx.publishRestoredProfile(undefined);
          }
        }),
        filter((user): user is SimpleUserModel => !!user),
        withLatestFrom(ctx.loggedUserFullProfile$.pipe(startWith(undefined))),
        tap(([user, profile]) => {
          ctx.setProfileRestored(!!profile && profile.id === user.id);
        }),
        filter(([user, profile]) => !profile || profile.id !== user.id),
        tap(() => {
          ctx.setProfileRestored(false);
        }),
        switchMap(() => this.restoreCurrentUserProfile$(ctx)),
        takeUntil(ctx.destroy$)
      )
      .subscribe(x => {
        ctx.publishRestoredProfile(x);
      });
  }

  private initializeUserBoxLogoffHandler(ctx: UserManagementContext): void {
    ctx.userBoxService.logoffButtonClick$.pipe(
      takeUntil(ctx.destroy$)
    ).subscribe(() => {
      ctx.logoffAction$.next();
    });
  }

  private initializeCrossTabLogoutHandler(ctx: UserManagementContext): void {
    ctx.backend.user.logout$.pipe(
      tap(() => {
        ctx.publishSignedOut();
      }),
      filter(() => !ctx.router.url.includes('/auth/login')),
      takeUntil(ctx.destroy$)
    ).subscribe(() => {
      ctx.router.navigate(['/auth/login']);
    });
  }

  private initializeCrossTabLoginHandler(ctx: UserManagementContext): void {
    ctx.backend.user.login$.pipe(
      switchMap(() => ctx.backend.auth.getUserSession$()),
      filter(user => !!user),
      filter(user => !ctx.getCurrentUserId() || ctx.getCurrentUserId() !== user!.id),
      tap(user => {
        ctx.publishLoggedUser(user ?? undefined);
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private restoreCurrentUserProfile$(ctx: UserManagementContext): Observable<RichUserModel | undefined> {
    return ctx.backend.auth.getRichUserSession$().pipe(
      take(1),
      map(profile => this.hasCompleteRichProfile(profile) ? profile : undefined),
      catchError((error) => {
        console.error('Profile restoration failed:', error);
        return of(undefined);
      })
    );
  }

  private hasCompleteRichProfile(profile: RichUserModel | null | undefined): profile is RichUserModel {
    return !!profile && !!profile.username && !!profile.email;
  }
}
