import {
  inject,
  Injectable
} from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from "@angular/material/snack-bar";
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import {
  filter,
  map,
  tap
} from 'rxjs';
import { UserManagementService } from './user-management.service';
import {
  switchMap,
  take
} from "rxjs/operators";


@Injectable()
export class UserAuthGuard {
  private signInSnack?: MatSnackBarRef<TextOnlySnackBar>;

  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private authenticationService: UserManagementService
  ) { }

  private showSignInPrompt(returnUrl: string): void {
    if (!this.signInSnack) {
      this.signInSnack = this.snackBar.open('Sign in to use this feature.', 'Sign in', {
        duration: 10000,
        panelClass: 'snack-info'
      });

      this.signInSnack.onAction()
          .pipe(take(1))
          .subscribe(() => this.router.navigate(['/auth/login'], {queryParams: {returnUrl}}));

      this.signInSnack.afterDismissed()
          .pipe(take(1))
          .subscribe(() => {
            this.signInSnack = undefined;
          });
    }

    this.router.navigate(['/auth/login'], {queryParams: {returnUrl}});
  }

  private dismissSignInPrompt(): void {
    this.signInSnack?.dismiss();
    this.signInSnack = undefined;
  }
  
  canActivate(
    route: ActivatedRouteSnapshot, state: RouterStateSnapshot
  ) {
    return this.authenticationService.authRestored$.pipe(
      filter(Boolean),
      take(1),
      switchMap(() => this.authenticationService.loggedUser$.pipe(
        take(1)
      )),
      tap((user) => {
        if (!user) {
          this.showSignInPrompt(state.url);
        } else {
          this.dismissSignInPrompt();
        }

      }),
      map((user) => !!user)
    );


  }
}

export const AuthGuard: CanActivateFn = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  return inject(UserAuthGuard).canActivate(next, state);
};