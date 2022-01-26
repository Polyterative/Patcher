import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
}                                from '@angular/common/http';
import { Injectable }            from '@angular/core';
import { Observable }            from 'rxjs';
import {
  switchMap,
  take
}                                from 'rxjs/operators';
import { environment }           from '../../../../environments/environment';
import { UserManagementService } from './user-management.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private authenticationService: UserManagementService) { }
  
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // add auth header with jwt if user is logged in and request is to the api url
    // const user = this.authenticationService.loggedUser$.value;
  
    // if (isLoggedIn && isApiUrl) {
    // request = request.clone({
    //     setHeaders: { Authorization: `Bearer ${user.jwtToken}` }
    // });
    // }
  
    const observable = this.authenticationService.loggedUser$.pipe(
      take(1),
      switchMap(user => {
        const isLoggedIn = !!user;
        const isApiUrl = request.url.startsWith(environment.supabase.url);
      
        return next.handle(request);
      })
    );
  
    return observable;
  }
}
