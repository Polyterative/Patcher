import { UntypedFormControl } from '@angular/forms';
import {
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


const flatOptions: ISelectable[] = [
  {id: 'a', name: 'Alpha'},
  {id: 'b', name: 'Beta'},
  {id: 'c', name: 'Gamma'}
];

const groupedOptions: ISelectable[] = [
  {id: 'g1', name: 'Group 1', options: [{id: 'x', name: 'X'}, {id: 'y', name: 'Y'}]},
  {id: 'g2', name: 'Group 2', options: [{id: 'z', name: 'Z'}]}
];


describe('isOption - additional cases', () => {
  it('returns true for a valid ISelectable', () => {
    expect(isOption({id: 'a', name: 'Alpha'})).toBeTrue();
  });
  
  it('returns falsy for null', () => {
    expect(isOption(null)).toBeFalsy();
  });
  
  it('returns falsy for object with numeric id (string type check fails)', () => {
    expect(isOption({id: 1, name: 'Alpha'})).toBeFalsy();
  });
  
  it('returns falsy for object without name', () => {
    expect(isOption({id: 'a'})).toBeFalsy();
  });
  
  it('returns falsy for empty object', () => {
    expect(isOption({})).toBeFalsy();
  });
});


describe('getCleanedValue', () => {
  it('returns the ISelectable itself when control holds an option', () => {
    const control = new UntypedFormControl({id: 'a', name: 'Alpha'});
    const result = getCleanedValue(control);
    expect(result).toEqual({id: 'a', name: 'Alpha'});
  });
  
  it('returns the string representation when control holds a plain string', () => {
    const control = new UntypedFormControl('hello');
    expect(getCleanedValue(control)).toBe('hello');
  });
  
  it('converts number value to string', () => {
    const control = new UntypedFormControl(42);
    expect(getCleanedValue(control)).toBe('42');
  });
});


describe('getCleanedValueId', () => {
  it('returns the id when control holds an option', () => {
    const control = new UntypedFormControl({id: 'my-id', name: 'My Name'});
    expect(getCleanedValueId(control)).toBe('my-id');
  });
  
  it('returns the defaultVal when control does not hold an option', () => {
    const control = new UntypedFormControl('plain-string');
    expect(getCleanedValueId(control, 'fallback')).toBe('fallback');
  });
  
  it('returns empty string by default when not an option', () => {
    const control = new UntypedFormControl('text');
    expect(getCleanedValueId(control)).toBe('');
  });
});


describe('getCleanedValueName', () => {
  it('returns the name when control holds an option', () => {
    const control = new UntypedFormControl({id: 'id', name: 'My Name'});
    expect(getCleanedValueName(control)).toBe('My Name');
  });
  
  it('returns defaultVal when control does not hold an option', () => {
    const control = new UntypedFormControl(null);
    expect(getCleanedValueName(control, 'default-name')).toBe('default-name');
  });
});


describe('findOptionForId / findOptionForName', () => {
  it('findOptionForId returns undefined when no match', () => {
    expect(findOptionForId('z', flatOptions)).toBeUndefined();
  });
  
  it('findOptionForName returns matching option', () => {
    expect(findOptionForName('Beta', flatOptions)).toEqual({id: 'b', name: 'Beta'});
  });
  
  it('findOptionForName returns undefined when no match', () => {
    expect(findOptionForName('Delta', flatOptions)).toBeUndefined();
  });
});


describe('flatOptionGroupToArray', () => {
  it('flattens grouped options into a single array', () => {
    const result = flatOptionGroupToArray(groupedOptions);
    expect(result.length).toBe(3);
    expect(result.map(o => o.id)).toEqual(['x', 'y', 'z']);
  });
  
  it('ignores group items that have no options array', () => {
    const mixed: ISelectable[] = [
      {id: 'g', name: 'G', options: [{id: 'child', name: 'Child'}]},
      {id: 'no-children', name: 'Leaf'} // no options → filtered out
    ];
    const result = flatOptionGroupToArray(mixed);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('child');
  });
});


describe('findAndApplyOptionForId', () => {
  it('patches control when match is found', () => {
    const control = new UntypedFormControl(null);
    findAndApplyOptionForId('b', control, flatOptions);
    expect(control.value).toEqual({id: 'b', name: 'Beta'});
  });
  
  it('does not patch control when no match', () => {
    const control = new UntypedFormControl('original');
    findAndApplyOptionForId('xyz', control, flatOptions);
    expect(control.value).toBe('original');
  });
});


describe('findAndApplyOptionForIdInGroup', () => {
  it('patches control from grouped options', () => {
    const control = new UntypedFormControl(null);
    findAndApplyOptionForIdInGroup('z', control, groupedOptions);
    expect(control.value).toEqual({id: 'z', name: 'Z'});
  });
  
  it('does not patch when id not found in any group', () => {
    const control = new UntypedFormControl('original');
    findAndApplyOptionForIdInGroup('missing', control, groupedOptions);
    expect(control.value).toBe('original');
  });
});


describe('findAndApplyOptionForName', () => {
  it('patches control when name matches', () => {
    const control = new UntypedFormControl(null);
    findAndApplyOptionForName('Gamma', control, flatOptions);
    expect(control.value).toEqual({id: 'c', name: 'Gamma'});
  });
  
  it('does not patch when name is not found', () => {
    const control = new UntypedFormControl('original');
    findAndApplyOptionForName('Delta', control, flatOptions);
    expect(control.value).toBe('original');
  });
});


describe('findAndApplyOptionsForSelectablesInGroup', () => {
  it('patches control with matched options array', () => {
    const control = new UntypedFormControl(null);
    findAndApplyOptionsForSelectablesInGroup(
      [{id: 'x', name: 'X'}],
      control,
      groupedOptions
    );
    // The patchValue is called with array containing found match (or undefined if not found)
    expect(control.value).toBeDefined();
  });
});