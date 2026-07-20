import { LoginEmailComponent } from './login-email.component';
import { FormControl } from '@angular/forms';
import { UserLoginDataService } from '../user-login-data.service';

describe('LoginEmailComponent', () => {
  let comp: LoginEmailComponent;
  let mockDataService: UserLoginDataService;
  let emailControl: FormControl<string>;

  beforeEach(() => {
    emailControl = new FormControl('', {nonNullable: true});
    mockDataService = {
      fields: {
        user: {
          control: emailControl
        }
      }
    } as UserLoginDataService;
    comp = new LoginEmailComponent(mockDataService);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

  it('emailChange is an EventEmitter', () => {
    expect(comp.emailChange).toBeTruthy();
  });

  it('ngOnInit wires emailChange to email control value changes', () => {
    comp.ngOnInit();
    let emitted: string | undefined;
    comp.emailChange.subscribe(v => (emitted = v));
    emailControl.setValue('test@example.com');
    expect(emitted).toBe('test@example.com');
  });

  it('emailChange emits each new value from valueChanges', () => {
    comp.ngOnInit();
    const values: string[] = [];
    comp.emailChange.subscribe(v => values.push(v));
    emailControl.setValue('a@example.com');
    emailControl.setValue('b@example.com');
    expect(values).toEqual(['a@example.com', 'b@example.com']);
  });
});
