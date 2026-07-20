import { SignupEmailComponent } from './signup-email.component';
import { UserSignupDataService } from '../user-signup-data.service';

describe('SignupEmailComponent', () => {
  let comp: SignupEmailComponent;
  let mockDataService: UserSignupDataService;

  beforeEach(() => {
    mockDataService = {} as UserSignupDataService;
    comp = new SignupEmailComponent(mockDataService);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('dataService is the same reference as the injected mock', () => {
    expect(comp.dataService).toEqual(mockDataService);
  });
});
