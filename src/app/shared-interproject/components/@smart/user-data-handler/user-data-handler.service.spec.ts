import { Router } from '@angular/router';
import { UserDataHandlerService } from './user-data-handler.service';

function build() {
  const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
  return { service: new UserDataHandlerService(router), router };
}

describe('UserDataHandlerService', () => {
  it('routes to login when login click is emitted', () => {
    const { service, router } = build();
    
    service.loginButtonClick$.next();
    
    expect(router.navigate).toHaveBeenCalledWith(['/auth', 'login']);
  });

  it('routes to signup when signup click is emitted', () => {
    const { service, router } = build();
    
    service.signupButtonClick$.next();
    
    expect(router.navigate).toHaveBeenCalledWith(['/auth', 'signup']);
  });

  it('logoffButtonClick$ can be emitted without error', () => {
    const { service } = build();
    expect(() => service.logoffButtonClick$.next()).not.toThrow();
  });

  it('store.user$ is a ReplaySubject — no initial value before first emission', () => {
    const { service } = build();
    let received = false;
    service.store.user$.subscribe(() => { received = true; });
    expect(received).toBeFalse();
  });
});