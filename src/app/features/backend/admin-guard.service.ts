import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SupabaseService } from './supabase.service';


@Injectable()
export class AdminGuardService {

  constructor(private supabase: SupabaseService) {}

  canActivate(_route: ActivatedRouteSnapshot): Observable<boolean> {
    if (environment.production) {
      return of(false);
    }
    return this.supabase.auth.getUserSession$().pipe(
      switchMap(user => of(!!user)),
      map(hasSession => hasSession)
    );
  }
}
