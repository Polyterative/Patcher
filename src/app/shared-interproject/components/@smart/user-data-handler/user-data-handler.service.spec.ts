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
});