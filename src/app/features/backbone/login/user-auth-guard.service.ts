import {
  inject,
  Injectable
} from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import {
  map,
  of,
  tap
} from 'rxjs';
import { UserManagementService } from './user-management.service';
import {
  switchMap,
  take
} from "rxjs/operators";


@Injectable()
export class UserAuthGuard {
  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private authenticationService: UserManagementService
  ) { }
  
  canActivate(
    route: ActivatedRouteSnapshot, state: RouterStateSnapshot
  ) {
    return of(undefined).pipe(
      switchMap(() => this.authenticationService.loggedUser$.pipe(
        take(1)
      )),
      tap((user) => {
        if (!user) {
          const snack = this.snackBar.open('Sign in to use this feature.', 'Sign in', {
            duration: 10000,
            panelClass: 'snack-info'
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
};