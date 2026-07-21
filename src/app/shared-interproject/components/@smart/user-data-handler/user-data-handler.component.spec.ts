import { Router } from '@angular/router';
import { UserDataHandlerComponent } from './user-data-handler.component';
import { UserDataHandlerService } from './user-data-handler.service';
describe('UserDataHandlerComponent', () => {
  let mockService: UserDataHandlerService;
  beforeEach(() => { mockService = makeService(); });

  function makeService(): UserDataHandlerService {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    return new UserDataHandlerService(router);
  }

  it('creates', () => { expect(new UserDataHandlerComponent(mockService)).toBeTruthy(); });
  it('exposes userDataHandlerService', () => {
    const comp = new UserDataHandlerComponent(mockService);
    expect(comp.userDataHandlerService).toBe(mockService);
  });
  it('service reference is the exact same object', () => {
    const svc = makeService();
    const comp = new UserDataHandlerComponent(svc);
    expect(comp.userDataHandlerService).toBe(svc);
  });
});
