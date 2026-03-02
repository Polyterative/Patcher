import {
  normalizeForSearch,
  removeAccents
} from './string-utils';


describe('removeAccents - extended unicode', () => {
  it('handles German umlauts', () => {
    expect(removeAccents('über')).toBe('uber');
    expect(removeAccents('Müller')).toBe('Muller');
    expect(removeAccents('Österreich')).toBe('Osterreich');
  });
  
  it('handles Polish characters', () => {
    expect(removeAccents('Łódź')).toBe('Lodz');
    expect(removeAccents('żółw')).toBe('zolw');
  });
  
  it('handles Czech characters', () => {
    expect(removeAccents('Čechy')).toBe('Cechy');
    expect(removeAccents('Brněnský')).toBe('Brnensk\u0079');
  });
  
  it('handles numbers unchanged', () => {
    expect(removeAccents('123')).toBe('123');
  });
  
  it('handles mixed accented and non-accented', () => {
    expect(removeAccents('Café 123')).toBe('Cafe 123');
  });
  
  it('handles string with only symbols unchanged', () => {
    expect(removeAccents('!@#$%')).toBe('!@#$%');
  });
});


describe('normalizeForSearch - consistency', () => {
  it('is idempotent — normalizing twice gives same result as once', () => {
    const input = 'Instruō';
    expect(normalizeForSearch(normalizeForSearch(input))).toBe(normalizeForSearch(input));
  });
  
  it('makes two strings with different cases and accents equal after normalization', () => {
    expect(normalizeForSearch('MUTABLE')).toBe(normalizeForSearch('mutable'));
    expect(normalizeForSearch('Instruō')).toBe(normalizeForSearch('instruo'));
  });
  
  it('preserves spaces', () => {
    expect(normalizeForSearch('Make Noise')).toBe('make noise');
  });
  
  it('handles consecutive spaces', () => {
    expect(normalizeForSearch('A  B')).toBe('a  b');
  });
  
  it('returns empty string for empty input', () => {
    expect(normalizeForSearch('')).toBe('');
  });
  
  it('returns null for null input (passthrough)', () => {
    expect(normalizeForSearch(null as any)).toBeNull();
  });
  
  it('returns undefined for undefined input (passthrough)', () => {
    expect(normalizeForSearch(undefined as any)).toBeUndefined();
  });
});