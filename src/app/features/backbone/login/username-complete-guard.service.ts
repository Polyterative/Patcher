import {
  inject,
  Injectable
} from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import {
  map,
  take
} from 'rxjs/operators';
import { UserManagementService } from './user-management.service';


/** Returns true when a username is real (set, non-empty, not a temp OAuth placeholder). */
export function isUsernameComplete(username: string | null | undefined): boolean {
  return !!username && username.trim() !== '' && !username.startsWith('user_');
}

/**
 * Blocks routes that require a fully completed profile (real username).
 * Redirects to /auth/complete-profile when the user has no username or
 * is still using the auto-generated OAuth placeholder (user_<id>).
 */
@Injectable()
export class UsernameCompleteGuard {
  constructor(
    private userManagementService: UserManagementService,
    private router: Router
  ) {
  }
  
  canActivate() {
    return this.userManagementService.loggedUserFullProfile$.pipe(
      take(1),
      map(user => {
        if (isUsernameComplete(user?.username)) {
          return true;
        }
        this.router.navigate(['/auth/complete-profile']);
        return false;
      })
    );
  }
}

export const UsernameGuard: CanActivateFn = () => inject(UsernameCompleteGuard).canActivate();