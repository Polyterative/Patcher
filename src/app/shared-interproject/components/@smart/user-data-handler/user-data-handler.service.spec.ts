import { UserDataHandlerService } from './user-data-handler.service';


describe('UserDataHandlerService', () => {
  it('routes to login when login click is emitted', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const service = new UserDataHandlerService(router as any);
    
    service.loginButtonClick$.next();
    
    expect(router.navigate).toHaveBeenCalledWith(['/auth', 'login']);
  });
  
  it('routes to signup when signup click is emitted', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const service = new UserDataHandlerService(router as any);
    
    service.signupButtonClick$.next();
    
    expect(router.navigate).toHaveBeenCalledWith(['/auth', 'signup']);
  });

  it('logoffButtonClick$ can be emitted without error', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const service = new UserDataHandlerService(router as any);
    expect(() => service.logoffButtonClick$.next()).not.toThrow();
  });

  it('store.user$ is a ReplaySubject — no initial value before first emission', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const service = new UserDataHandlerService(router as any);
    let received = false;
    service.store.user$.subscribe(() => { received = true; });
    expect(received).toBeFalse();
  });
});