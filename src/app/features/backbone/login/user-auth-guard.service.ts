import {
  inject,
  Injectable
}                                from '@angular/core';
import { MatSnackBar }           from "@angular/material/snack-bar";
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot
}                                from '@angular/router';
import {
  map,
  of,
  tap
}                                from 'rxjs';
import { UserManagementService } from './user-management.service';
import { MatDialog }             from "@angular/material/dialog";
import {
  switchMap,
  take
}                                from "rxjs/operators";


@Injectable()
export class UserAuthGuard {
  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private authenticationService: UserManagementService
  ) { }
  
  canActivate(
    route: ActivatedRouteSnapshot, state: RouterStateSnapshot
  ) {
    // get the current user observable from the service and subscribe to it, return true if the user is logged in
    // this.authenticationService.checkUserInCookies();
    return of(undefined).pipe(
      switchMap(() => this.authenticationService.loggedUser$.pipe(
        take(1)
      )),
      tap((user) => {
        if (!user) {
          // this.dialog.open(LoginProposalComponent);
          let snack = this.snackBar.open('Login to use this feature', 'Login now', {
            duration: 10000
          });
      
          snack.onAction()
               .subscribe(x => this.router.navigate(['/auth/login'], {queryParams: {returnUrl: state.url}}));
        
          snack._open();
          
          // route to the login page if the user is not logged in
          this.router.navigate(['/auth/login'], {queryParams: {returnUrl: state.url}});
        
        }
      
      }),
      map((user) => !!user)
    );
  
  
  }
}

export const AuthGuard: CanActivateFn = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  return inject(UserAuthGuard).canActivate(next, state);
}