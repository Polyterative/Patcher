import { UntypedFormControl } from '@angular/forms';
import { of } from 'rxjs';
import { toArray } from 'rxjs/operators';
import {
  AppFormUtils,
  ErrorCodes,
  ErrorMessages,
  plainSanitize,
  sanitizeItemInPipe,
  sanitizeObjectInPipe
} from './app-form-utils';


describe('AppFormUtils', () => {
  it('returns empty message when control has no errors', () => {
    const control = new UntypedFormControl('');
    
    expect(AppFormUtils.getErrors(control)).toBe('');
  });
  
  it('maps known error codes to user-facing messages', () => {
    const checks: Array<{
      error: any;
      expected: string
    }> = [
      {error: {required: true}, expected: ErrorMessages.form.error_required},
      {error: {minlength: true}, expected: ErrorMessages.form.error_minLength},
      {error: {maxlength: true}, expected: ErrorMessages.form.error_maxLength},
      {error: {max: true}, expected: ErrorMessages.form.error_max},
      {error: {pattern: true}, expected: ErrorMessages.form.error_pattern},
      {error: {[ErrorCodes.form.errorCode.custom.codeNotValid]: true}, expected: ErrorMessages.form.error_codeNotValid},
      {error: {[ErrorCodes.form.errorCode.custom.lessThanOneElement]: true}, expected: ErrorMessages.form.error_lessThanOneElement},
      {error: {[ErrorCodes.form.errorCode.custom.notInOptions]: true}, expected: ErrorMessages.form.error_notInOptions},
      {error: {[ErrorCodes.form.errorCode.custom.numberNot]: true}, expected: ErrorMessages.form.error_numberNot},
      {error: {[ErrorCodes.form.errorCode.custom.numberNotInteger]: true}, expected: ErrorMessages.form.error_numberNotInteger},
      {error: {[ErrorCodes.form.errorCode.custom.numberNotPositiveInteger]: true}, expected: ErrorMessages.form.error_numberNotPositiveInteger},
      {error: {[ErrorCodes.form.errorCode.custom.numberBiggerThanInterval]: true}, expected: ErrorMessages.form.error_numberBiggerThanInterval},
      {error: {[ErrorCodes.form.errorCode.custom.doesNotContainHttps]: true}, expected: ErrorMessages.form.error_doesNotContainHttps},
      {error: {min: true}, expected: ErrorMessages.form.error_min}
    ];
    
    checks.forEach(({error, expected}) => {
      const control = new UntypedFormControl('');
      control.setErrors(error);
      expect(AppFormUtils.getErrors(control)).toBe(expected);
    });
  });
});

describe('sanitizers', () => {
  it('sanitizeItemInPipe sanitizes and drops empty strings', (done) => {
    of('  <b>hello</b>  ', '   ', {any: 'value'} as any)
      .pipe(sanitizeItemInPipe(), toArray())
      .subscribe(values => {
        expect(values[0]).toContain('hello');
        expect(values.length).toBe(2);
        expect(values[1]).toEqual({any: 'value'});
        done();
      });
  });
  
  it('plainSanitize removes dangerous attributes from html', () => {
    const sanitized = plainSanitize('<img src=x onerror=alert(1)>text') as string;
    expect(sanitized).toContain('text');
    expect(sanitized).not.toContain('onerror');
  });
  
  it('sanitizeObjectInPipe sanitizes string fields and keeps non-string fields', (done) => {
    of({a: '<img src=x onerror=alert(1)>text', b: 5} as any)
      .pipe(sanitizeObjectInPipe({} as any), toArray())
      .subscribe(values => {
        expect(values.length).toBe(1);
        expect(values[0].a).toContain('text');
        expect(values[0].a).not.toContain('onerror');
        expect(values[0].b).toBe(5);
        done();
      });
  });
});