import {
  BLANK_MODULE_IDS,
  isBlankModule
} from './rack-blank-module.constants';


describe('rack-blank-module.constants', () => {
  describe('BLANK_MODULE_IDS', () => {
    it('contains the first 3U blank (ID 4647)', () => {
      expect(BLANK_MODULE_IDS.has(4647)).toBeTrue();
    });
    
    it('contains the last 3U blank (ID 4666)', () => {
      expect(BLANK_MODULE_IDS.has(4666)).toBeTrue();
    });
    
    it('contains the first 1U blank (ID 4711)', () => {
      expect(BLANK_MODULE_IDS.has(4711)).toBeTrue();
    });
    
    it('contains the last 1U blank (ID 4735)', () => {
      expect(BLANK_MODULE_IDS.has(4735)).toBeTrue();
    });
    
    it('does not contain a regular module ID', () => {
      expect(BLANK_MODULE_IDS.has(1)).toBeFalse();
      expect(BLANK_MODULE_IDS.has(1423)).toBeFalse();
    });
  });
  
  describe('isBlankModule', () => {
    it('returns true for a 3U blank module ID', () => {
      expect(isBlankModule(4650)).toBeTrue();
    });
    
    it('returns true for a 1U blank module ID', () => {
      expect(isBlankModule(4720)).toBeTrue();
    });
    
    it('returns false for a regular module ID', () => {
      expect(isBlankModule(42)).toBeFalse();
    });
    
    it('returns false for an ID just outside the blank range', () => {
      expect(isBlankModule(4646)).toBeFalse();
      expect(isBlankModule(4667)).toBeFalse();
      expect(isBlankModule(4710)).toBeFalse();
      expect(isBlankModule(4736)).toBeFalse();
    });
  });
});