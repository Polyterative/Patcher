import {
  ErrorCodes,
  ErrorMessages
} from './app-form-utils';


describe('ErrorCodes', () => {
  it('custom error codes are distinct non-empty strings', () => {
    const custom = ErrorCodes.form.errorCode.custom;
    const values = Object.values(custom);
    const unique = new Set(values);
    // All values should be unique
    expect(unique.size).toBe(values.length);
    for (const v of values) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });
  
  it('standard error codes are present', () => {
    const codes = ErrorCodes.form.errorCode;
    expect(codes.required).toBe('required');
    expect(codes.minlength).toBe('minlength');
    expect(codes.maxlength).toBe('maxlength');
    expect(codes.min).toBe('min');
    expect(codes.max).toBe('max');
    expect(codes.pattern).toBe('pattern');
  });
  
  it('custom.empty code is defined', () => {
    expect(ErrorCodes.form.errorCode.custom.empty).toBeDefined();
    expect(ErrorCodes.form.errorCode.custom.empty.length).toBeGreaterThan(0);
  });
  
  it('custom.invalidContent code is defined', () => {
    expect(ErrorCodes.form.errorCode.custom.invalidContent).toBeDefined();
    expect(ErrorCodes.form.errorCode.custom.invalidContent.length).toBeGreaterThan(0);
  });
});


describe('ErrorMessages', () => {
  it('all messages are non-empty strings', () => {
    const msgs = ErrorMessages.form;
    for (const key of Object.keys(msgs) as (keyof typeof msgs)[]) {
      expect(typeof msgs[key]).toBe('string');
      expect(msgs[key].length).toBeGreaterThan(0);
    }
  });
  
  it('error_required message is descriptive', () => {
    expect(ErrorMessages.form.error_required.toLowerCase()).toContain('empty');
  });
  
  it('error_doesNotContainHttps message mentions https', () => {
    expect(ErrorMessages.form.error_doesNotContainHttps.toLowerCase()).toContain('https');
  });
  
  it('error_minLength and error_maxLength messages mention length/minimum/maximum', () => {
    const minMsg = ErrorMessages.form.error_minLength.toLowerCase();
    const maxMsg = ErrorMessages.form.error_maxLength.toLowerCase();
    expect(minMsg.includes('minimum') || minMsg.includes('below') || minMsg.includes('length')).toBeTrue();
    expect(maxMsg.includes('maximum') || maxMsg.includes('over') || maxMsg.includes('length')).toBeTrue();
  });
});