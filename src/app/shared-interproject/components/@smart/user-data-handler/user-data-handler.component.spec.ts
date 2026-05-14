import { UserDataHandlerComponent } from './user-data-handler.component';
describe('UserDataHandlerComponent', () => {
  let mockService: any;
  beforeEach(() => { mockService = {}; });
  it('creates', () => { expect(new UserDataHandlerComponent(mockService)).toBeTruthy(); });
  it('exposes userDataHandlerService', () => {
    const comp = new UserDataHandlerComponent(mockService);
    expect(comp.userDataHandlerService).toBe(mockService);
  });
});
