import { UntypedFormControl } from '@angular/forms';
import { CustomValidators } from './form-element-models';


describe('CustomValidators - additional cases', () => {
  
  describe('includesHttps', () => {
    it('returns null for empty string (no length check enforced)', () => {
      expect(CustomValidators.includesHttps(new UntypedFormControl('') as any)).toBeNull();
    });
    
    it('returns error for ftp protocol', () => {
      expect(CustomValidators.includesHttps(new UntypedFormControl('ftp://example.com') as any))
        .toEqual({doesNotContainHttps: true});
    });
    
    it('returns null when URL starts with https', () => {
      expect(CustomValidators.includesHttps(new UntypedFormControl('https://patcher.xyz/modules') as any))
        .toBeNull();
    });
  });
  
  
  describe('onlyIntegers', () => {
    it('accepts integer-like string "0"', () => {
      expect(CustomValidators.onlyIntegers(new UntypedFormControl('0') as any)).toBeNull();
    });
    
    it('rejects decimal string "3.14"', () => {
      expect(CustomValidators.onlyIntegers(new UntypedFormControl('3.14') as any))
        .toEqual({numberNotInteger: true});
    });
    
    it('accepts negative integer "-5"', () => {
      expect(CustomValidators.onlyIntegers(new UntypedFormControl('-5') as any)).toBeNull();
    });
  });
  
  
  describe('atLeastOneObject', () => {
    it('returns null for array with multiple elements', () => {
      expect(CustomValidators.atLeastOneObject(new UntypedFormControl([1, 2, 3]) as any)).toBeNull();
    });
    
    it('returns null for single-element array', () => {
      expect(CustomValidators.atLeastOneObject(new UntypedFormControl([{}]) as any)).toBeNull();
    });
    
    it('returns error for null value', () => {
      expect(CustomValidators.atLeastOneObject(new UntypedFormControl(null) as any))
        .toEqual({lessThanOneElement: true});
    });
  });
  
  
  describe('notEmpty', () => {
    it('returns null for a non-empty string', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl('hello') as any)).toBeNull();
    });
    
    it('returns error for whitespace-only string', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl('   \t\n') as any))
        .toEqual({empty: true});
    });
    
    it('returns null for array with one element', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl(['item']) as any)).toBeNull();
    });
    
    it('returns error for empty array', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl([]) as any))
        .toEqual({empty: true});
    });
    
    it('returns null for a non-empty object', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl({key: 'value'}) as any)).toBeNull();
    });
    
    it('returns error for empty object', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl({}) as any))
        .toEqual({empty: true});
    });
    
    it('returns null for truthy non-string/array/object (number 1)', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl(1) as any)).toBeNull();
    });
  });
  
  
  describe('onlyCleanHtml', () => {
    it('returns null for plain text', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('hello world') as any)).toBeNull();
    });
    
    it('returns null for safe bold html', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('<b>safe</b>') as any)).toBeNull();
    });
    
    it('returns error for script injection', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('<script>alert(1)</script>') as any))
        .toEqual({invalidContent: true});
    });
    
    it('returns error for onerror attribute injection', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('<img src=x onerror=alert(1)>') as any))
        .toEqual({invalidContent: true});
    });
  });
});