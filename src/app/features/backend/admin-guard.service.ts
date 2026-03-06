import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { createAuthNamespace } from './supabase-auth';

/**
 * Guards admin routes so only users with the `admin` app_metadata role claim
 * can access them. Always returns false for non-admin users in every environment.
 */
@Injectable()
export class AdminGuardService {

  constructor(private supabase: SupabaseService) {}

  canActivate(_route: ActivatedRouteSnapshot): Observable<boolean> {
    const auth: ReturnType<typeof createAuthNamespace> = this.supabase.auth;
    return auth.getUserSession$().pipe(
      switchMap(user => {
        if (!user) return of(false);
        return auth.hasAdminRole$();
      }),
      map(isAdmin => isAdmin)
    );
  }
}