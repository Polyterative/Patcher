import {
  matchesSearchQuery,
  normalizeForSearch,
  removeAccents
} from './string-utils';


describe('String Utils', () => {
  
  describe('removeAccents', () => {
    
    it('should remove accents from Latin characters', () => {
      expect(removeAccents('Instruō')).toBe('Instruo');
      expect(removeAccents('Blukač')).toBe('Blukac');
      expect(removeAccents('Lùbadh')).toBe('Lubadh');
    });
    
    it('should handle various diacritical marks', () => {
      expect(removeAccents('àáâãäå')).toBe('aaaaaa');
      expect(removeAccents('èéêë')).toBe('eeee');
      expect(removeAccents('ìíîï')).toBe('iiii');
      expect(removeAccents('òóôõö')).toBe('ooooo');
      expect(removeAccents('ùúûü')).toBe('uuuu');
      expect(removeAccents('ñ')).toBe('n');
      expect(removeAccents('ç')).toBe('c');
    });
    
    it('should handle uppercase accented characters', () => {
      expect(removeAccents('ÀÁÂÃÄÅ')).toBe('AAAAAA');
      expect(removeAccents('ÈÉÊË')).toBe('EEEE');
      expect(removeAccents('Ñ')).toBe('N');
    });
    
    it('should leave unaccented text unchanged', () => {
      expect(removeAccents('Hello World')).toBe('Hello World');
      expect(removeAccents('Make Noise')).toBe('Make Noise');
      expect(removeAccents('123456')).toBe('123456');
    });
    
    it('should handle empty and null values', () => {
      expect(removeAccents('')).toBe('');
      expect(removeAccents(null as any)).toBe(null);
      expect(removeAccents(undefined as any)).toBe(undefined);
    });
    
    it('should preserve special characters', () => {
      expect(removeAccents('Test-123')).toBe('Test-123');
      expect(removeAccents('Module@2024')).toBe('Module@2024');
    });
    
  });
  
  describe('normalizeForSearch', () => {
    
    it('should remove accents and convert to lowercase', () => {
      expect(normalizeForSearch('Instruō')).toBe('instruo');
      expect(normalizeForSearch('BLUKAČ')).toBe('blukac');
      expect(normalizeForSearch('Lùbadh')).toBe('lubadh');
    });
    
    it('should be case-insensitive', () => {
      expect(normalizeForSearch('HELLO')).toBe('hello');
      expect(normalizeForSearch('HeLLo')).toBe('hello');
      expect(normalizeForSearch('hello')).toBe('hello');
    });
    
    it('should handle manufacturer names with accents', () => {
      expect(normalizeForSearch('Intellijel')).toBe('intellijel');
      expect(normalizeForSearch('Mutable Instruments')).toBe('mutable instruments');
      expect(normalizeForSearch('Après')).toBe('apres');
      expect(normalizeForSearch('Søstrene')).toBe('sostrene');
    });
    
    it('should make search comparisons consistent', () => {
      const searchTerm = normalizeForSearch('instruo');
      const moduleName = normalizeForSearch('Instruō');
      expect(searchTerm).toBe(moduleName);
    });
    
    it('should handle empty and null values', () => {
      expect(normalizeForSearch('')).toBe('');
      expect(normalizeForSearch(null as any)).toBe(null);
      expect(normalizeForSearch(undefined as any)).toBe(undefined);
    });
    
  });
  
  describe('Real-world use cases', () => {
    
    it('should match Instruō modules regardless of accent usage', () => {
      const modules = ['Instruō Cs-L', 'Instruō Lubadh', 'Instruō Tánh'];
      const searchQuery = 'instruo';
      
      const results = modules.filter(m =>
        normalizeForSearch(m).includes(normalizeForSearch(searchQuery))
      );
      
      expect(results.length).toBe(3);
      expect(results).toContain('Instruō Cs-L');
      expect(results).toContain('Instruō Lubadh');
      expect(results).toContain('Instruō Tánh');
    });
    
    it('should match Blukač modules regardless of accent usage', () => {
      const manufacturer = 'Blukač';
      
      expect(normalizeForSearch(manufacturer).includes(normalizeForSearch('blukac'))).toBe(true);
      expect(normalizeForSearch(manufacturer).includes(normalizeForSearch('Blukac'))).toBe(true);
      expect(normalizeForSearch(manufacturer).includes(normalizeForSearch('BLUKAC'))).toBe(true);
    });
    
    it('should work with partial searches', () => {
      const moduleName = 'Lùbadh';
      
      expect(normalizeForSearch(moduleName).includes(normalizeForSearch('lub'))).toBe(true);
      expect(normalizeForSearch(moduleName).includes(normalizeForSearch('lù'))).toBe(true);
      expect(normalizeForSearch(moduleName).includes(normalizeForSearch('adh'))).toBe(true);
    });
    
  });

  describe('matchesSearchQuery', () => {
    it('matches exact and normalized substrings', () => {
      expect(matchesSearchQuery('instruo', 'Instruō Lùbadh')).toBeTrue();
      expect(matchesSearchQuery('lub', 'Instruō Lùbadh')).toBeTrue();
    });

    it('matches across multiple candidate fields', () => {
      expect(matchesSearchQuery('xaoc belgrade', 'Belgrad', 'Xaoc Devices')).toBeTrue();
      expect(matchesSearchQuery('ambient patch', 'Patch One', 'Ambient drone study')).toBeTrue();
    });

    it('allows one missing or extra character for long search terms', () => {
      expect(matchesSearchQuery('belgrade', 'Belgrad')).toBeTrue();
      expect(matchesSearchQuery('belgrad', 'Belgrade')).toBeTrue();
      expect(matchesSearchQuery('belgade', 'Belgrade')).toBeTrue();
    });

    it('does not get overly fuzzy for unrelated or short terms', () => {
      expect(matchesSearchQuery('berlin', 'Belgrad')).toBeFalse();
      expect(matchesSearchQuery('rings', 'Wings')).toBeFalse();
      expect(matchesSearchQuery('vca', 'vco')).toBeFalse();
    });

    it('returns false when no candidate field matches a non-empty query', () => {
      expect(matchesSearchQuery('plaits', undefined, '', null, 'macro oscillator')).toBeFalse();
    });
  });
  
});
