import { Injectable } from '@angular/core';
import {
  from,
  NEVER,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  catchError,
  exhaustMap,
  filter,
  map,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementContext } from './user-management-internals';

@Injectable({ providedIn: 'root' })
export class UserManagementAccountActionsService {
  register(ctx: UserManagementContext): void {
    this.initializeUpdateUsernameHandler(ctx);
    this.initializeResetUserDataHandler(ctx);
    this.initializeDeleteAccountHandler(ctx);
    this.initializeToggleUsernameFormHandler(ctx);
    this.initializeChangePasswordHandler(ctx);
    this.initializeTogglePasswordFormHandler(ctx);
  }

  updateUsername$(newUsername: string, ctx: UserManagementContext): Observable<void> {
    return ctx.loggedUserFullProfile$.pipe(
      take(1),
      switchMap(profile => {
        if (!profile) {
          SharedConstants.errorCustom(ctx.snackBar, 'Unable to save: user session not found. Please refresh and try again.');
          return throwError(() => new Error('No user profile available'));
        }
        return ctx.backend.auth.updateUsername$(profile.id, newUsername).pipe(
          catchError((error) => {
            ctx.showOperationError(error);
            return throwError(() => error);
          })
        );
      }),
      switchMap(() => ctx.backend.auth.getRichUserSession$()),
      filter(x => !!x),
      tap(updatedProfile => {
        ctx.publishRestoredProfile(updatedProfile);
        SharedConstants.successCustom(ctx.snackBar, `Username changed to "${ newUsername }" — your profile has been synced.`);
      }),
      map(() => void 0)
    );
  }

  isUsernameAvailable$(username: string, ctx: UserManagementContext): Observable<boolean> {
    return ctx.loggedUserFullProfile$.pipe(
      take(1),
      switchMap(profile => {
        if (!profile) {
          return throwError(() => new Error('No user profile available'));
        }
        return ctx.backend.auth.isUsernameAvailable$(username, profile.id);
      })
    );
  }

  updateProfileVisibility$(isPublic: boolean, ctx: UserManagementContext): Observable<void> {
    return ctx.loggedUserFullProfile$.pipe(
      take(1),
      switchMap(profile => {
        if (!profile) {
          SharedConstants.errorCustom(ctx.snackBar, 'Unable to save: user session not found. Please refresh and try again.');
          return throwError(() => new Error('No user profile available'));
        }

        return ctx.backend.auth.updateProfileVisibility$(profile.id, isPublic).pipe(
          tap(() => {
            ctx.publishRestoredProfile({...profile, public: isPublic});
            SharedConstants.successCustom(
              ctx.snackBar,
              isPublic
                ? 'Your public profile is now visible to other users.'
                : 'Your public profile is now private.'
            );
          }),
          catchError((error) => {
            ctx.showOperationError(error);
            return throwError(() => error);
          })
        );
      }),
      map(() => void 0)
    );
  }

  private initializeUpdateUsernameHandler(ctx: UserManagementContext): void {
    ctx.updateUsernameAction$.pipe(
      withLatestFrom(ctx.loggedUserFullProfile$),
      filter(([_, profile]) => !!profile),
      switchMap(([newUsername, profile]) =>
        ctx.backend.auth.updateUsername$(profile!.id, newUsername).pipe(
          map(() => newUsername),
          catchError((error) => {
            ctx.showOperationError(error);
            return NEVER;
          })
        )
      ),
      switchMap((newUsername) => ctx.backend.auth.getRichUserSession$().pipe(
        map(profile => ({profile, newUsername})),
        catchError((error) => {
          ctx.showOperationError(error);
          return NEVER;
        })
      )),
      filter(({profile}) => !!profile),
      tap(({profile, newUsername}) => {
        ctx.publishRestoredProfile(profile);
        ctx.showUsernameFormSubject$.next(false);
        ctx.analytics.capture('account.username_changed', {});
        SharedConstants.successCustom(ctx.snackBar, `Username changed to "${ newUsername }" — your profile has been synced.`);
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeResetUserDataHandler(ctx: UserManagementContext): void {
    ctx.resetUserDataAction$.pipe(
      switchMap(() => {
        const dialogData: ConfirmDialogDataInModel = {
          title: 'Delete all your data?',
          description: 'This will permanently delete all your patches, racks, collections, and comments. This cannot be undone. Your account will stay active so you can start fresh afterward.',
          positive: {label: 'Delete my data', theme: 'warning'}
        };
        return ctx.getDialog().open<ConfirmDialogComponent, ConfirmDialogDataInModel, ConfirmDialogDataOutModel>(
          ConfirmDialogComponent,
          {data: dialogData, disableClose: false, width: '36rem'}
        ).afterClosed();
      }),
      tap((result) => {
        if (!result?.answer) SharedConstants.infoCustom(ctx.snackBar, 'No changes made.');
      }),
      filter((result): result is ConfirmDialogDataOutModel => !!result?.answer),
      exhaustMap(() => ctx.backend.delete.allUserData().pipe(
        catchError((error) => {
          console.error('Data deletion failed:', error);
          SharedConstants.errorCustom(ctx.snackBar, 'Data deletion failed. Please try again or contact support.');
          return NEVER;
        })
      )),
      tap(() => {
        ctx.publishSignedOut();
        ctx.analytics.capture('account.data_deleted', {});
      }),
      switchMap(() => from(ctx.backend.auth.logoff$()).pipe(
        catchError(() => NEVER)
      )),
      tap(() => {
        SharedConstants.successCustom(ctx.snackBar, 'All your data has been deleted. Your account is still available if you want to sign back in.');
        ctx.router.navigate(['/auth/login']);
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeDeleteAccountHandler(ctx: UserManagementContext): void {
    ctx.deleteAccountAction$.pipe(
      switchMap(() => {
        const dialogData: ConfirmDialogDataInModel = {
          title: 'Delete your account?',
          description: 'This permanently deletes your account, profile, and all your data. This cannot be undone.',
          positive: {label: 'Delete my account', theme: 'negative'}
        };
        return ctx.getDialog().open<ConfirmDialogComponent, ConfirmDialogDataInModel, ConfirmDialogDataOutModel>(
          ConfirmDialogComponent,
          {data: dialogData, disableClose: false, width: '36rem'}
        ).afterClosed();
      }),
      tap((result) => {
        if (!result?.answer) SharedConstants.infoCustom(ctx.snackBar, 'No changes made.');
      }),
      filter((result): result is ConfirmDialogDataOutModel => !!result?.answer),
      exhaustMap(() => ctx.backend.delete.allUserData().pipe(
        catchError((error) => {
          console.error('Data deletion failed:', error);
          SharedConstants.errorCustom(ctx.snackBar, 'Account deletion failed while removing your data. Please try again or contact support.');
          return NEVER;
        })
      )),
      switchMap(() => ctx.backend.auth.deleteCurrentUserAccount$().pipe(
        catchError((error) => {
          console.error('Account deletion failed:', error);
          SharedConstants.errorCustom(ctx.snackBar, 'Account deletion failed. Please try again or contact support.');
          return NEVER;
        })
      )),
      tap(() => {
        ctx.publishSignedOut();
        ctx.analytics.capture('account.deleted', {});
      }),
      switchMap(() => ctx.backend.auth.logoffLocal$().pipe(
        catchError((error) => {
          console.error('Local sign-out after account deletion failed:', error);
          return of({error: null});
        })
      )),
      tap(() => {
        SharedConstants.successCustom(ctx.snackBar, 'Your account has been permanently deleted.');
        ctx.router.navigate(['/auth/login']);
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeTogglePasswordFormHandler(ctx: UserManagementContext): void {
    ctx.togglePasswordForm$.pipe(
      tap(show => {
        ctx.showPasswordFormSubject$.next(show);
        if (show) {
          ctx.showUsernameFormSubject$.next(false);
        }
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeToggleUsernameFormHandler(ctx: UserManagementContext): void {
    ctx.toggleUsernameForm$.pipe(
      tap(show => {
        ctx.showUsernameFormSubject$.next(show);
        if (show) {
          ctx.showPasswordFormSubject$.next(false);
        }
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }

  private initializeChangePasswordHandler(ctx: UserManagementContext): void {
    ctx.changePassword$.pipe(
      switchMap(({newPassword}) =>
        ctx.backend.auth.updatePassword$(newPassword).pipe(
          catchError((error) => {
            ctx.showOperationError(error);
            return NEVER;
          })
        )
      ),
      tap(() => {
        ctx.showPasswordFormSubject$.next(false);
        ctx.analytics.capture('auth.password_changed', {});
        SharedConstants.successCustom(ctx.snackBar, 'Password updated successfully.');
      }),
      takeUntil(ctx.destroy$)
    ).subscribe();
  }
}
