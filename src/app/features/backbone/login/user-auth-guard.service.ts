import { Injectable }            from '@angular/core';
import { MatDialog }             from '@angular/material/dialog';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot
}                                from '@angular/router';
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
    const user = this.authenticationService.user$.value;
    if (user) {return true; }
  
    // this.dialog.open(LoginProposalComponent);
    let snack = this.snackBar.open('⚠ You need to login to use this feature', 'I want to login', {
      duration: 10000
    });
  
    snack.onAction()
         .subscribe(x => this.router.navigate(['/auth/login'], {queryParams: {returnUrl: state.url}}));
  
    snack._open();
  
    return false;
  }
}
