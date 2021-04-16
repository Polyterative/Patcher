import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
}                                from '@angular/common/http';
import { Injectable }            from '@angular/core';
import {
  Observable,
  throwError
}                                from 'rxjs';
import { catchError }            from 'rxjs/operators';
import { UserManagementService } from './user-management.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private authenticationService: UserManagementService) { }
  
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request)
               .pipe(catchError(err => {
                 if ([
                       401,
                       403
                     ].includes(err.status) && this.authenticationService.user$.value) {
                   // auto logout if 401 or 403 response returned from api
                   this.authenticationService.logoff();
                 }
      
                 const error = (err && err.error && err.error.message) || err.statusText;
                 console.error(err);
      
                 return throwError(error);
               }));
  }
}
