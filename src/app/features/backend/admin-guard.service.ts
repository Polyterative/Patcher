import { Injectable }  from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate
}                      from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable()
export class AdminGuardService implements CanActivate {
    
    canActivate(route: ActivatedRouteSnapshot): boolean {
        
        return !environment.production;
    }
}
