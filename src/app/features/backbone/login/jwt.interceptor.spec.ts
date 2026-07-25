import { JwtInterceptor } from './jwt.interceptor';
import {
  HttpEvent,
  HttpHandler,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BehaviorSubject,
  Observable,
  of
} from 'rxjs';
import { SimpleUserModel } from '../../backend/supabase.types';
import { UserManagementService } from './user-management.service';


type LoggedUserState = SimpleUserModel | null | undefined;

interface JwtAuthenticationFixture {
  loggedUser$: BehaviorSubject<LoggedUserState>;
}

function simpleUserFixture(id = 'user-1'): SimpleUserModel {
  return {
    id,
    email: `${id}@example.com`,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };
}

function buildInterceptor(loggedUser: LoggedUserState = null) {
  TestBed.resetTestingModule();
  const loggedUser$ = new BehaviorSubject<LoggedUserState>(loggedUser);
  const authService: JwtAuthenticationFixture = {loggedUser$};
  TestBed.configureTestingModule({
    providers: [
      JwtInterceptor,
      {
        provide: UserManagementService,
        useValue: authService
      }
    ]
  });
  return {interceptor: TestBed.inject(JwtInterceptor), loggedUser$};
}

function makeRequest(url = 'https://api.example.com'): HttpRequest<unknown> {
  return new HttpRequest<unknown>('GET', url);
}

function makeHandler(
  response: Observable<HttpEvent<unknown>> = of(new HttpResponse<unknown>({body: {}}))
): jasmine.SpyObj<HttpHandler> {
  const handler = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
  handler.handle.and.returnValue(response);
  return handler;
}


describe('JwtInterceptor', () => {
  it('calls next.handle with the original request when user is logged in', (done) => {
    const {interceptor} = buildInterceptor(simpleUserFixture());
    const request = makeRequest();
    const response = new HttpResponse<unknown>({body: {ok: true}});
    const handler = makeHandler(of(response));
    interceptor.intercept(request, handler).subscribe((event) => {
      expect(event).toBe(response);
      expect(handler.handle).toHaveBeenCalledWith(request);
      done();
    });
  });
  
  it('calls next.handle for supabase API URL', (done) => {
    const {interceptor} = buildInterceptor(simpleUserFixture());
    const request = makeRequest('https://test-project.supabase.co/rest/v1/modules');
    const handler = makeHandler();
    interceptor.intercept(request, handler).subscribe(() => {
      expect(handler.handle).toHaveBeenCalledWith(request);
      done();
    });
  });
  
  it('passes through when user is not logged in', (done) => {
    const {interceptor} = buildInterceptor(null);
    const request = makeRequest();
    const handler = makeHandler();
    interceptor.intercept(request, handler).subscribe(() => {
      expect(handler.handle).toHaveBeenCalled();
      done();
    });
  });
  
  it('passes through for external URL', (done) => {
    const {interceptor} = buildInterceptor(simpleUserFixture());
    const request = makeRequest('https://external.example.com/data');
    const handler = makeHandler();
    interceptor.intercept(request, handler).subscribe(() => {
      expect(handler.handle).toHaveBeenCalledWith(request);
      done();
    });
  });
});