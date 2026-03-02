import { AppTablesUtils } from './app-tables-utils';


describe('AppTablesUtils.nestedFilterCheck', () => {
  it('concatenates a scalar value onto the search accumulator', () => {
    const result = AppTablesUtils.nestedFilterCheck('', {name: 'Plaits'}, 'name');
    expect(result).toBe('Plaits');
  });
  
  it('recursively walks nested objects and appends leaf values', () => {
    const data = {manufacturer: {name: 'Mutable Instruments', id: 5}};
    const result = AppTablesUtils.nestedFilterCheck('', data, 'manufacturer');
    expect(result).toContain('Mutable Instruments');
    expect(result).toContain('5');
  });
  
  it('skips null children without throwing', () => {
    const data = {info: {a: null, b: 'ok'}};
    expect(() => AppTablesUtils.nestedFilterCheck('', data, 'info')).not.toThrow();
    const result = AppTablesUtils.nestedFilterCheck('', data, 'info');
    expect(result).toContain('ok');
  });
});


describe('AppTablesUtils.nestedObjectsFilterPredicate', () => {
  const predicate = AppTablesUtils.nestedObjectsFilterPredicate;
  
  it('matches when filter is a substring of a flat field', () => {
    expect(predicate({name: 'Rings', hp: 10}, 'ring')).toBeTrue();
  });
  
  it('returns false when no field matches', () => {
    expect(predicate({name: 'Rings', hp: 10}, 'plaits')).toBeFalse();
  });
  
  it('is case-insensitive', () => {
    expect(predicate({name: 'Mutable Instruments'}, 'MUTABLE')).toBeTrue();
  });
  
  it('matches across nested object fields', () => {
    const data = {module: {name: 'Warps', manufacturer: {name: 'Mutable'}}};
    expect(predicate(data, 'warps')).toBeTrue();
    expect(predicate(data, 'mutable')).toBeTrue();
  });
  
  it('strips accents from both data and filter before comparing', () => {
    expect(predicate({name: 'Instruō'}, 'instruo')).toBeTrue();
    expect(predicate({name: 'Blukač'}, 'blukac')).toBeTrue();
  });
  
  it('trims whitespace from the filter string', () => {
    expect(predicate({name: 'Plaits'}, '  plaits  ')).toBeTrue();
  });
});


describe('AppTablesUtils.nestedObjectsfilterPredicateIgnoreColumns', () => {
  it('ignores listed columns when filtering', () => {
    const predicate = AppTablesUtils.nestedObjectsfilterPredicateIgnoreColumns(['id']);
    const data = {name: 'Rings', id: 999};
    // 'rings' is in name — should match
    expect(predicate(data, 'rings')).toBeTrue();
    // '999' is in id but id is excluded — should NOT match on id alone
    expect(predicate(data, '999')).toBeFalse();
  });
  
  it('still matches non-excluded columns', () => {
    const predicate = AppTablesUtils.nestedObjectsfilterPredicateIgnoreColumns(['hp']);
    const data = {name: 'Ripples', hp: 8};
    expect(predicate(data, 'ripples')).toBeTrue();
    expect(predicate(data, '8')).toBeFalse();
  });
});