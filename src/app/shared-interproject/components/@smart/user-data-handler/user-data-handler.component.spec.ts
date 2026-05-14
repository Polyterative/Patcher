import { UserDataHandlerComponent } from './user-data-handler.component';
describe('UserDataHandlerComponent', () => {
  let mockService: any;
  beforeEach(() => { mockService = {}; });
  it('creates', () => { expect(new UserDataHandlerComponent(mockService)).toBeTruthy(); });
  it('exposes userDataHandlerService', () => {
    const comp = new UserDataHandlerComponent(mockService);
    expect(comp.userDataHandlerService).toBe(mockService);
  });
  it('service reference is the exact same object', () => {
    const svc = {} as any;
    const comp = new UserDataHandlerComponent(svc);
    expect(comp.userDataHandlerService).toBe(svc);
  });
});
