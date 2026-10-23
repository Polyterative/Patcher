import {
  inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {
  CanMatchFn,
  Router,
  UrlTree
} from '@angular/router';
import {
  Observable,
  of
} from 'rxjs';
import {
  catchError,
  map,
  take,
  timeout
} from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SupabaseService } from '../../backend/supabase.service';


/**
 * Full maintenance mode (remote flag `maintenanceModeEnabled`). Admins bypass the
 * route guard and data short-circuit; everyone else is sent to `/maintenance`.
 */
@Injectable({providedIn: 'root'})
export class MaintenanceModeService {
  private readonly supabase = inject(SupabaseService);

  /** Read live from the environment so specs and remote flags can flip it. */
  get enabled(): boolean {
    return environment.features.maintenanceModeEnabled;
  }

  /** True when the signed-in user carries the admin `app_metadata.role` claim. */
  readonly isAdmin$: Observable<boolean> = this.supabase.auth.hasAdminRole$();
}


/** Blocks content routes while maintenance mode is on, unless the user is an admin. */
export const maintenanceGuard: CanMatchFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const maintenance = inject(MaintenanceModeService);
  if (!maintenance.enabled) {
    return true;
  }
  const blocked = inject(Router).parseUrl('/maintenance');
  // The server cannot know the viewer's session, so it always serves the maintenance page.
  if (isPlatformServer(inject(PLATFORM_ID))) {
    return blocked;
  }
  return maintenance.isAdmin$.pipe(
    take(1),
    timeout(3000),
    catchError(() => of(false)),
    map(isAdmin => isAdmin ? true : blocked)
  );
};
