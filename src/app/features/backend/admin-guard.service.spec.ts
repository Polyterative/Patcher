import { ActivatedRouteSnapshot } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AdminGuardService } from './admin-guard.service';


describe('AdminGuardService', () => {
  let service: AdminGuardService;
  let originalProduction: boolean;
  
  beforeEach(() => {
    service = new AdminGuardService();
    originalProduction = environment.production;
  });
  
  afterEach(() => {
    Object.defineProperty(environment, 'production', {value: originalProduction, writable: true, configurable: true});
  });
  
  it('returns false when environment.production is true', () => {
    Object.defineProperty(environment, 'production', {value: true, writable: true, configurable: true});
    expect(service.canActivate({} as ActivatedRouteSnapshot)).toBeFalse();
  });
  
  it('returns true when environment.production is false', () => {
    Object.defineProperty(environment, 'production', {value: false, writable: true, configurable: true});
    expect(service.canActivate({} as ActivatedRouteSnapshot)).toBeTrue();
  });
});