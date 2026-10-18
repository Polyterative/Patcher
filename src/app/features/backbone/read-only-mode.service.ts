import {
  inject,
  Injectable
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';
import { environment } from 'src/environments/environment';


/**
 * Maintenance read-only mode (build-time flag `readOnlyModeEnabled`).
 * Create/edit controls stay visible but are disabled with `tooltip`.
 */
@Injectable({providedIn: 'root'})
export class ReadOnlyModeService {
  /** Read live from the environment so specs can flip it. */
  get enabled(): boolean {
    return environment.features.readOnlyModeEnabled;
  }

  readonly tooltip = 'Temporarily disabled for maintenance';
}


/** Redirects away from create/edit routes while read-only mode is on. */
export const readOnlyModeGuard: CanActivateFn = (): boolean | UrlTree => {
  const readOnly = inject(ReadOnlyModeService);
  
  if (!readOnly.enabled) {
    return true;
  }
  
  inject(MatSnackBar)
    .open(readOnly.tooltip, undefined, {duration: 4000, panelClass: 'snack-error'});
  
  return inject(Router)
    .parseUrl('/modules/browser');
};
