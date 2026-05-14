import { LoginEmailComponent } from './login-email.component';
import { Subject } from 'rxjs';

describe('LoginEmailComponent', () => {
  let comp: LoginEmailComponent;
  let mockDataService: any;
  let valueChanges$: Subject<string>;

  beforeEach(() => {
    valueChanges$ = new Subject<string>();
    mockDataService = {
      fields: {
        user: {
          control: { valueChanges: valueChanges$.asObservable() }
        }
      }
    };
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
    valueChanges$.next('test@example.com');
    expect(emitted).toBe('test@example.com');
  });

  it('emailChange emits each new value from valueChanges', () => {
    comp.ngOnInit();
    const values: string[] = [];
    comp.emailChange.subscribe(v => values.push(v));
    valueChanges$.next('a@example.com');
    valueChanges$.next('b@example.com');
    expect(values).toEqual(['a@example.com', 'b@example.com']);
  });
});
