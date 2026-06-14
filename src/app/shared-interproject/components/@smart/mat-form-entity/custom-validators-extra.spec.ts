import { UntypedFormControl } from '@angular/forms';
import { CustomValidators } from './form-element-models';


describe('CustomValidators - additional cases', () => {
  
  describe('includesHttps', () => {
    it('returns null for empty string (no length check enforced)', () => {
      expect(CustomValidators.includesHttps(new UntypedFormControl(''))).toBeNull();
    });
    
    it('returns error for ftp protocol', () => {
      expect(CustomValidators.includesHttps(new UntypedFormControl('ftp://example.com')))
        .toEqual({doesNotContainHttps: true});
    });
    
    it('returns null when URL starts with https', () => {
      expect(CustomValidators.includesHttps(new UntypedFormControl('https://patcher.xyz/modules')))
        .toBeNull();
    });
  });
  
  
  describe('onlyIntegers', () => {
    it('accepts integer-like string "0"', () => {
      expect(CustomValidators.onlyIntegers(new UntypedFormControl('0'))).toBeNull();
    });
    
    it('rejects decimal string "3.14"', () => {
      expect(CustomValidators.onlyIntegers(new UntypedFormControl('3.14')))
        .toEqual({numberNotInteger: true});
    });
    
    it('accepts negative integer "-5"', () => {
      expect(CustomValidators.onlyIntegers(new UntypedFormControl('-5'))).toBeNull();
    });
  });
  
  
  describe('atLeastOneObject', () => {
    it('returns null for array with multiple elements', () => {
      expect(CustomValidators.atLeastOneObject(new UntypedFormControl([1, 2, 3]))).toBeNull();
    });
    
    it('returns null for single-element array', () => {
      expect(CustomValidators.atLeastOneObject(new UntypedFormControl([{}]))).toBeNull();
    });
    
    it('returns error for null value', () => {
      expect(CustomValidators.atLeastOneObject(new UntypedFormControl(null)))
        .toEqual({lessThanOneElement: true});
    });
  });
  
  
  describe('notEmpty', () => {
    it('returns null for a non-empty string', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl('hello'))).toBeNull();
    });
    
    it('returns error for whitespace-only string', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl('   \t\n')))
        .toEqual({empty: true});
    });
    
    it('returns null for array with one element', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl(['item']))).toBeNull();
    });
    
    it('returns error for empty array', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl([])))
        .toEqual({empty: true});
    });
    
    it('returns null for a non-empty object', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl({key: 'value'}))).toBeNull();
    });
    
    it('returns error for empty object', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl({})))
        .toEqual({empty: true});
    });
    
    it('returns null for truthy non-string/array/object (number 1)', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl(1))).toBeNull();
    });
  });
  
  
  describe('onlyCleanHtml', () => {
    it('returns null for plain text', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('hello world'))).toBeNull();
    });
    
    it('returns null for safe bold html', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('<b>safe</b>'))).toBeNull();
    });
    
    it('returns error for script injection', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('<script>alert(1)</script>')))
        .toEqual({invalidContent: true});
    });
    
    it('returns error for onerror attribute injection', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('<img src=x onerror=alert(1)>')))
        .toEqual({invalidContent: true});
    });
  });
});