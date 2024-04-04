import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { environment } from 'src/environments/environment';


@Injectable()
export class AdminGuardService {
    
    canActivate(route: ActivatedRouteSnapshot): boolean {
        
        return !environment.production;
    }
}