import { ErrorInterceptor } from './error.interceptor';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BehaviorSubject,
  Observable,
  of,
  throwError
} from 'rxjs';
import { SimpleUserModel } from '../../backend/supabase.types';
import { UserManagementService } from './user-management.service';


type LoggedUserState = SimpleUserModel | null | undefined;

interface ErrorAuthenticationFixture {
  loggedUser$: BehaviorSubject<LoggedUserState>;
  logoff$: jasmine.Spy<() => void>;
}

function simpleUserFixture(id = 'user-1'): SimpleUserModel {
  return {
    id,
    email: `${id}@example.com`,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };
}

function buildInterceptor(loggedUser: LoggedUserState = simpleUserFixture()) {
  TestBed.resetTestingModule();
  const loggedUser$ = new BehaviorSubject<LoggedUserState>(loggedUser);
  const logoff$: jasmine.Spy<() => void> = jasmine.createSpy('logoff$');
  const authService: ErrorAuthenticationFixture = {loggedUser$, logoff$};
  TestBed.configureTestingModule({
    providers: [
      ErrorInterceptor,
      {
        provide: UserManagementService,
        useValue: authService
      }
    ]
  });
  const interceptor = TestBed.inject(ErrorInterceptor);
  return {interceptor, logoff$, loggedUser$};
}

function makeRequest(): HttpRequest<unknown> {
  return new HttpRequest<unknown>('GET', 'https://api.example.com');
}

function makeHandler(response: Observable<HttpEvent<unknown>>): jasmine.SpyObj<HttpHandler> {
  const handler = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
  handler.handle.and.returnValue(response);
  return handler;
}

function makeErrorResponse(
  status: number,
  statusText: string,
  error: Record<string, string> | Record<string, never>
): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText,
    error,
    url: 'https://api.example.com'
  });
}


describe('ErrorInterceptor', () => {
  it('passes through successful responses unchanged', (done) => {
    const {interceptor} = buildInterceptor();
    const handler = makeHandler(of(new HttpResponse<unknown>({body: {}})));
    interceptor.intercept(makeRequest(), handler).subscribe(() => {
      expect(handler.handle).toHaveBeenCalled();
      done();
    });
  });
  
  it('rethrows error for non-auth status codes', (done) => {
    const {interceptor} = buildInterceptor();
    const err = makeErrorResponse(500, 'Server Error', {message: 'Internal'});
    interceptor.intercept(makeRequest(), makeHandler(throwError(() => err))).subscribe({
      error: (e: unknown) => {
        expect(e).toBeDefined();
        done();
      }
    });
  });
  
  it('logs off user on 401 when user is logged in', (done) => {
    const {interceptor, logoff$} = buildInterceptor(simpleUserFixture());
    const err = makeErrorResponse(401, 'Unauthorized', {message: 'Unauthorized'});
    interceptor.intercept(makeRequest(), makeHandler(throwError(() => err))).subscribe({
      error: () => {
        expect(logoff$).toHaveBeenCalled();
        done();
      }
    });
  });
  
  it('logs off user on 403 when user is logged in', (done) => {
    const {interceptor, logoff$} = buildInterceptor(simpleUserFixture());
    const err = makeErrorResponse(403, 'Forbidden', {message: 'Forbidden'});
    interceptor.intercept(makeRequest(), makeHandler(throwError(() => err))).subscribe({
      error: () => {
        expect(logoff$).toHaveBeenCalled();
        done();
      }
    });
  });
  
  it('does not call logoff when 401 but user is not logged in', (done) => {
    const {interceptor, logoff$} = buildInterceptor(null);
    const err = makeErrorResponse(401, 'Unauthorized', {});
    interceptor.intercept(makeRequest(), makeHandler(throwError(() => err))).subscribe({
      error: () => {
        expect(logoff$).not.toHaveBeenCalled();
        done();
      }
    });
  });
  
  it('uses err.error.message when available', (done) => {
    const {interceptor} = buildInterceptor();
    const err = makeErrorResponse(500, 'Server Error', {message: 'Custom error'});
    interceptor.intercept(makeRequest(), makeHandler(throwError(() => err))).subscribe({
      error: (e: unknown) => {
        expect(e).toBe('Custom error');
        done();
      }
    });
  });
  
  it('falls back to statusText when error.message is missing', (done) => {
    const {interceptor} = buildInterceptor();
    const err = makeErrorResponse(500, 'Internal Server Error', {});
    interceptor.intercept(makeRequest(), makeHandler(throwError(() => err))).subscribe({
      error: (e: unknown) => {
        expect(e).toBe('Internal Server Error');
        done();
      }
    });
  });
});