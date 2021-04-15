import {
  AbstractControl,
  FormControl,
  ValidationErrors
}                  from '@angular/forms';
import { Strings } from '../../../app-form-utils';

export interface FormLineSetup {
  hideRequired: boolean;
  floatLabel: 'auto' | 'always' | 'never';
}

export enum FormTypes {
  // OKKO                  = 'okko',
  TEXT                  = 'text',
  MULTI_TEXT            = 'multi_text',
  TIME                  = 'time',
  PASSWORD              = 'password',
  NUMBER                = 'number',
  AREA                  = 'area',
  DATE                  = 'date',
  SELECT                = 'select',
  MULTISELECT           = 'multiselect',
  MULTISELECT_GROUPED   = 'multiselect_group',
  AUTOCOMPLETE          = 'autocomplete',
  AUTOCOMPLETE_GROUPED  = 'autocomplete_group',
  AUTOCOMPLETE_MULTIPLE = 'autocomplete_multiple',
  // AUTOCOMPLETE_MULTIPLE_GROUPED = 'autocomplete_multiple_group' //to finish
}


export namespace CustomValidators {
  export function onlyIntegers(control: AbstractControl): ValidationErrors {
    let valid: boolean = Number.isInteger(Number.parseFloat(control.value));
    return valid ? null : {[Strings.form.errorCode.custom.numberNotInteger]: true};
  }
  
  export function atLeastOneObject(control: AbstractControl): ValidationErrors {
    let valid: boolean = control.value && control.value.length > 0;
    return valid ? null : {[Strings.form.errorCode.custom.lessThanOneElement]: true};
  }
  
  function onlyNumbers(control: AbstractControl): ValidationErrors | null {
    return !(typeof control.value === 'number') ? {[Strings.form.errorCode.custom.numberNot]: true} : null;
  }
  
  function onlyPositiveAndInteger(control: AbstractControl): ValidationErrors | null {
    const input = control.value;
    return input <= 0 || Math.round(input) !== input ? {[Strings.form.errorCode.custom.numberNotPositiveInteger]: true} : null;
  }
  
}

export enum MatFormAppearences {
  LEGACY   = 'legacy',
  STANDARD = 'standard',
  FILL     = 'fill',
  OUTLINE  = 'outline'
}

export interface ISelectable {
  id: string;
  name: string;
  options?: ISelectable[]
  disabled?: boolean;
}


export function isOption(value: any): value is ISelectable {
  // console.warn(value) //useful for debug
  return value && value.id && typeof (value.id) == 'string' && value.name && typeof (value.name) == 'string';
}

export function findAndApplyOptionForIdInGroup(id: string, control: FormControl, options: ISelectable[]): void {
  let flattenedOptions: ISelectable[] = flatOptionGroupToArray(options);
  
  let optionForInput: ISelectable | undefined = findOptionForId(id, flattenedOptions);
  if (optionForInput) {control.patchValue(optionForInput);}
  
}

/**
 * Pass-by-reference input applier
 * alternative:    this.fields.skills.control.patchValue(data.skills); works most of the time
 * @param input
 * @param control
 * @param options
 */
export function findAndApplyOptionsForSelectablesInGroup(input: ISelectable[], control: FormControl, options: ISelectable[]): void {
  // debugger
  
  
  let flattenedOptions: ISelectable[] = flatOptionGroupToArray(options);
  
  let optionForInput: ISelectable[] = input.map(item => flattenedOptions.find(value => value.id == item.id && value.name == item.name));
  
  if (optionForInput) {
    control.patchValue(optionForInput);
  }
  
}

export function findAndApplyOptionForId(id: string, control: FormControl, options: ISelectable[]): void {
  let optionForInput: ISelectable | undefined = findOptionForId(id, options);
  
  if (optionForInput) {control.patchValue(optionForInput);}
  
}


export function findAndApplyOptionForName(id: string, control: FormControl, options: ISelectable[]): void {
  let optionForInput: ISelectable | undefined = findOptionForName(id, options);
  if (optionForInput) {control.patchValue(optionForInput);}
  
}


export function getCleanedValue(control: FormControl): string | ISelectable {
  return isOption(control.value) ? control.value : control.value.toString() as string;
}

export function getCleanedValueId(control: FormControl, defaultVal: string = ''): string {
  return isOption(control.value) ? control.value.id : defaultVal;
}

export function getCleanedValueName(control: FormControl, defaultVal: string = ''): string {
  return isOption(control.value) ? control.value.name : defaultVal;
}

export function flatOptionGroupToArray(options: Array<ISelectable>): ISelectable[] {
  return options.map(x => x.options)
                .reduce((accumulator, value) => accumulator.concat(value), []);
}

export function findOptionForName(name: string, options: Array<ISelectable>): ISelectable | undefined {
  return options.find(x => x.name === name);
}

export function findOptionForId(id: string, options: Array<ISelectable>): ISelectable | undefined {
  return options.find(x => x.id === id);
}
