import { UntypedFormControl } from '@angular/forms';
import {
  CustomValidators,
  findAndApplyOptionForId,
  findAndApplyOptionForIdInGroup,
  findAndApplyOptionForName,
  findAndApplyOptionsForSelectablesInGroup,
  findOptionForId,
  findOptionForName,
  flatOptionGroupToArray,
  getCleanedValue,
  getCleanedValueId,
  getCleanedValueName,
  ISelectable,
  isOption
} from './form-element-models';


describe('form-element-models', () => {
  describe('CustomValidators', () => {
    it('validates https links', () => {
      const empty = new UntypedFormControl('');
      const valid = new UntypedFormControl('https://example.com');
      const invalid = new UntypedFormControl('http://example.com');
      
      expect(CustomValidators.includesHttps(empty as any)).toBeNull();
      expect(CustomValidators.includesHttps(valid as any)).toBeNull();
      expect(CustomValidators.includesHttps(invalid as any)).toEqual({doesNotContainHttps: true});
    });
    
    it('validates integers and non-empty arrays', () => {
      expect(CustomValidators.onlyIntegers(new UntypedFormControl('10') as any)).toBeNull();
      expect(CustomValidators.onlyIntegers(new UntypedFormControl('10.5') as any)).toEqual({numberNotInteger: true});
      
      expect(CustomValidators.atLeastOneObject(new UntypedFormControl([1]) as any)).toBeNull();
      expect(CustomValidators.atLeastOneObject(new UntypedFormControl([]) as any)).toEqual({lessThanOneElement: true});
    });
    
    it('validates notEmpty for multiple input shapes', () => {
      expect(CustomValidators.notEmpty(new UntypedFormControl('abc') as any)).toBeNull();
      expect(CustomValidators.notEmpty(new UntypedFormControl('   ') as any)).toEqual({empty: true});
      expect(CustomValidators.notEmpty(new UntypedFormControl([1]) as any)).toBeNull();
      expect(CustomValidators.notEmpty(new UntypedFormControl([]) as any)).toEqual({empty: true});
      expect(CustomValidators.notEmpty(new UntypedFormControl({a: 1}) as any)).toBeNull();
      expect(CustomValidators.notEmpty(new UntypedFormControl({}) as any)).toEqual({empty: true});
      expect(CustomValidators.notEmpty(new UntypedFormControl(undefined) as any)).toEqual({empty: true});
    });
    
    it('flags unsafe html content', () => {
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('<b>safe</b>') as any)).toBeNull();
      expect(CustomValidators.onlyCleanHtml(new UntypedFormControl('<img src=x onerror=alert(1)>') as any)).toEqual({invalidContent: true});
    });
  });
  
  describe('selectable helpers', () => {
    const groupedOptions: ISelectable[] = [
      {
        id: 'group-1',
        name: 'Group 1',
        options: [
          {id: 'a', name: 'Alpha'},
          {id: 'b', name: 'Beta'}
        ]
      },
      {
        id: 'group-2',
        name: 'Group 2',
        options: [
          {id: 'c', name: 'Gamma'}
        ]
      }
    ];
    
    const flat: ISelectable[] = [
      {id: 'a', name: 'Alpha'},
      {id: 'b', name: 'Beta'},
      {id: 'c', name: 'Gamma'}
    ];
    
    it('detects option shape', () => {
      expect(isOption({id: 'x', name: 'Name'})).toBeTrue();
      expect(isOption({id: 1, name: 'Name'} as any)).toBeFalse();
      expect(isOption(null)).toBeFalsy();
    });
    
    it('flattens grouped options and finds items by id/name', () => {
      expect(flatOptionGroupToArray(groupedOptions)).toEqual(flat);
      expect(findOptionForId('b', flat)?.name).toBe('Beta');
      expect(findOptionForName('Gamma', flat)?.id).toBe('c');
    });
    
    it('applies selected option to controls', () => {
      const control = new UntypedFormControl('');
      findAndApplyOptionForId('b', control, flat);
      expect(control.value).toEqual({id: 'b', name: 'Beta'});
      
      findAndApplyOptionForName('Gamma', control, flat);
      expect(control.value).toEqual({id: 'c', name: 'Gamma'});
    });
    
    it('applies options in grouped mode', () => {
      const singleControl = new UntypedFormControl('');
      findAndApplyOptionForIdInGroup('a', singleControl, groupedOptions);
      expect(singleControl.value).toEqual({id: 'a', name: 'Alpha'});
      
      const multiControl = new UntypedFormControl([]);
      findAndApplyOptionsForSelectablesInGroup(
        [{id: 'a', name: 'Alpha'}, {id: 'c', name: 'Gamma'}],
        multiControl,
        groupedOptions
      );
      expect(multiControl.value).toEqual([{id: 'a', name: 'Alpha'}, {id: 'c', name: 'Gamma'}]);
    });
    
    it('returns cleaned values for plain text or selectable options', () => {
      const textControl = new UntypedFormControl(123);
      expect(getCleanedValue(textControl)).toBe('123');
      expect(getCleanedValueId(textControl, 'fallback')).toBe('fallback');
      expect(getCleanedValueName(textControl, 'fallback')).toBe('fallback');
      
      const optionControl = new UntypedFormControl({id: 'z', name: 'Zeta'});
      expect(getCleanedValue(optionControl)).toEqual({id: 'z', name: 'Zeta'});
      expect(getCleanedValueId(optionControl, 'fallback')).toBe('z');
      expect(getCleanedValueName(optionControl, 'fallback')).toBe('Zeta');
    });
  });
});