import { ErrorInterceptor } from './error.interceptor';
import {
  BehaviorSubject,
  of,
  throwError
} from 'rxjs';


function buildInterceptor(loggedUser: any = {id: 'user-1'}) {
  const loggedUser$ = new BehaviorSubject<any>(loggedUser);
  const logoff$ = jasmine.createSpy('logoff$');
  const interceptor = new ErrorInterceptor({loggedUser$, logoff$} as any);
  return {interceptor, logoff$, loggedUser$};
}

function makeHandler(response: any) {
  return {handle: jasmine.createSpy('handle').and.returnValue(response)};
}


describe('ErrorInterceptor', () => {
  it('passes through successful responses unchanged', (done) => {
    const {interceptor} = buildInterceptor();
    const handler = makeHandler(of({} as any));
    interceptor.intercept({} as any, handler).subscribe((_: any) => {
      expect(handler.handle).toHaveBeenCalled();
      done();
    });
  });
  
  it('rethrows error for non-auth status codes', (done) => {
    const {interceptor} = buildInterceptor();
    const err = {status: 500, statusText: 'Server Error', error: {message: 'Internal'}};
    interceptor.intercept({} as any, makeHandler(throwError(() => err))).subscribe({
      error: (e: any) => {
        expect(e).toBeDefined();
        done();
      }
    });
  });
  
  it('logs off user on 401 when user is logged in', (done) => {
    const {interceptor, logoff$} = buildInterceptor({id: 'user-1'});
    const err = {status: 401, statusText: 'Unauthorized', error: {message: 'Unauthorized'}};
    interceptor.intercept({} as any, makeHandler(throwError(() => err))).subscribe({
      error: () => {
        expect(logoff$).toHaveBeenCalled();
        done();
      }
    });
  });
  
  it('logs off user on 403 when user is logged in', (done) => {
    const {interceptor, logoff$} = buildInterceptor({id: 'user-1'});
    const err = {status: 403, statusText: 'Forbidden', error: {message: 'Forbidden'}};
    interceptor.intercept({} as any, makeHandler(throwError(() => err))).subscribe({
      error: () => {
        expect(logoff$).toHaveBeenCalled();
        done();
      }
    });
  });
  
  it('does not call logoff when 401 but user is not logged in', (done) => {
    const {interceptor, logoff$} = buildInterceptor(null);
    const err = {status: 401, statusText: 'Unauthorized', error: {}};
    interceptor.intercept({} as any, makeHandler(throwError(() => err))).subscribe({
      error: () => {
        expect(logoff$).not.toHaveBeenCalled();
        done();
      }
    });
  });
  
  it('uses err.error.message when available', (done) => {
    const {interceptor} = buildInterceptor();
    const err = {status: 500, statusText: 'Server Error', error: {message: 'Custom error'}};
    interceptor.intercept({} as any, makeHandler(throwError(() => err))).subscribe({
      error: (e: any) => {
        expect(e).toBe('Custom error');
        done();
      }
    });
  });
  
  it('falls back to statusText when error.message is missing', (done) => {
    const {interceptor} = buildInterceptor();
    const err = {status: 500, statusText: 'Internal Server Error', error: {}};
    interceptor.intercept({} as any, makeHandler(throwError(() => err))).subscribe({
      error: (e: any) => {
        expect(e).toBe('Internal Server Error');
        done();
      }
    });
  });
});