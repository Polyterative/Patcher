import { SignupEmailComponent } from './signup-email.component';

describe('SignupEmailComponent', () => {
  let comp: SignupEmailComponent;
  let mockDataService: any;

  beforeEach(() => {
    mockDataService = {};
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
