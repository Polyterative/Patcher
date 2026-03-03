import {
  FormControl,
  FormGroup
} from '@angular/forms';
import { confirmMatchesNewValidator } from '../user-management.component';


describe('confirmMatchesNewValidator', () => {
  function makeGroup(newPassword: string, confirmPassword: string): FormGroup {
    return new FormGroup(
      {newPassword: new FormControl(newPassword), confirmPassword: new FormControl(confirmPassword)},
      {validators: [confirmMatchesNewValidator()]}
    );
  }
  
  it('returns null when both passwords match', () => {
    expect(confirmMatchesNewValidator()(makeGroup('Password1!', 'Password1!'))).toBeNull();
  });
  
  it('returns confirmMismatch error when passwords differ', () => {
    expect(confirmMatchesNewValidator()(makeGroup('Password1!', 'Different!'))).toEqual({confirmMismatch: true});
  });
  
  it('returns null when newPassword is empty', () => {
    expect(confirmMatchesNewValidator()(makeGroup('', 'SomePass'))).toBeNull();
  });
  
  it('returns null when confirmPassword is empty', () => {
    expect(confirmMatchesNewValidator()(makeGroup('SomePass', ''))).toBeNull();
  });
  
  it('returns null when both are empty', () => {
    expect(confirmMatchesNewValidator()(makeGroup('', ''))).toBeNull();
  });
});