import { Injectable }            from '@angular/core';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot
}                                from '@angular/router';
import { fromPromise }           from 'rxjs/internal-compatibility';
import { UserManagementService } from './user-management.service';

@Injectable({providedIn: 'root'})
export class UserAuthGuard implements CanActivate {
  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private authenticationService: UserManagementService
  ) { }
  
  canActivate(
    route: ActivatedRouteSnapshot, state: RouterStateSnapshot
  ) {
    const user = this.authenticationService.user$.value;
    if (user) {return true; }
    fromPromise(this.router.navigate(['/auth/login'], {queryParams: {returnUrl: state.url}}))
      .subscribe(value => {
        this.snackBar.open('You need to login to use this feature');
      });
    
    return false;
  }
}
