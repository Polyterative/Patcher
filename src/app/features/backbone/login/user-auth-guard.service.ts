import { Injectable } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import {
  map,
  tap
} from 'rxjs';
import { UserManagementService } from './user-management.service';


@Injectable()
export class UserAuthGuard implements CanActivate {
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
  
    return this.authenticationService.loggedUser$.pipe(
      tap((user) => {
        if (!user) {
          // this.dialog.open(LoginProposalComponent);
          let snack = this.snackBar.open('Login to use this feature', 'Login now', {
            duration: 10000
          });
      
          snack.onAction()
               .subscribe(x => this.router.navigate(['/auth/login'], {queryParams: {returnUrl: state.url}}));
        
          snack._open();
        
        }
      
      }),
      map((user) => !!user)
    );
  
  
  }
}