import { JwtInterceptor } from './jwt.interceptor';
import {
  BehaviorSubject,
  of
} from 'rxjs';


function buildInterceptor(loggedUser: any = null) {
  const loggedUser$ = new BehaviorSubject<any>(loggedUser);
  return {interceptor: new JwtInterceptor({loggedUser$} as any)};
}

function makeHandler() {
  return {handle: jasmine.createSpy('handle').and.returnValue(of({} as any))};
}


describe('JwtInterceptor', () => {
  it('calls next.handle with the original request when user is logged in', (done) => {
    const {interceptor} = buildInterceptor({id: 'user-1'});
    const request = {url: 'https://api.example.com'} as any;
    const handler = makeHandler();
    interceptor.intercept(request, handler).subscribe((_: any) => {
      expect(handler.handle).toHaveBeenCalledWith(request);
      done();
    });
  });
  
  it('calls next.handle for supabase API URL', (done) => {
    const {interceptor} = buildInterceptor({id: 'user-1'});
    const request = {url: 'https://test-project.supabase.co/rest/v1/modules'} as any;
    const handler = makeHandler();
    interceptor.intercept(request, handler).subscribe((_: any) => {
      expect(handler.handle).toHaveBeenCalledWith(request);
      done();
    });
  });
  
  it('passes through when user is not logged in', (done) => {
    const {interceptor} = buildInterceptor(null);
    const request = {url: 'https://api.example.com'} as any;
    const handler = makeHandler();
    interceptor.intercept(request, handler).subscribe((_: any) => {
      expect(handler.handle).toHaveBeenCalled();
      done();
    });
  });
  
  it('passes through for external URL', (done) => {
    const {interceptor} = buildInterceptor({id: 'user-1'});
    const request = {url: 'https://external.example.com/data'} as any;
    const handler = makeHandler();
    interceptor.intercept(request, handler).subscribe((_: any) => {
      expect(handler.handle).toHaveBeenCalledWith(request);
      done();
    });
  });
});