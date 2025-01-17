import {
  AbstractControl,
  UntypedFormControl,
  Validators
}                     from '@angular/forms';
import { ErrorCodes } from './app-form-utils';
import DOMPurify      from "dompurify";


export interface FormLineSetup {
  hideRequired: boolean;
  floatLabel: 'auto' | 'always' | 'never';
}

export enum FormTypes {
  // OKKO                  = 'okko',
  TEXT                  = 'text',
  MULTI_TEXT            = 'multi_text',
  TIME                  = 'time',
  EMAIL                 = 'email',
  PASSWORD_CURRENT      = 'password_current',  // for autocomplete, password managers
  PASSWORD_NEW          = 'password_new',  // for autocomplete, password managers
  NUMBER                = 'number',
  AREA                  = 'area',
  DATE                  = 'date',
  SELECT                = 'select',
  MULTISELECT           = 'multiselect',
  MULTISELECT_GROUPED   = 'multiselect_group',
  AUTOCOMPLETE          = 'autocomplete',
  AUTOCOMPLETE_GROUPED  = 'autocomplete_group',
  AUTOCOMPLETE_MULTIPLE = 'autocomplete_multiple'
  // AUTOCOMPLETE_MULTIPLE_GROUPED = 'autocomplete_multiple_group' //to finish
}

export namespace CustomValidators {
  export function includesHttps(control: AbstractControl) {
    control.hasValidator(Validators.required);
  
    if (!(control.value.length > 0)) {return null;}
  
    const valid: boolean = control.value.includes('https://');
    return valid ? null : {[ErrorCodes.form.errorCode.custom.doesNotContainHttps]: true};
  }
  
  export function onlyIntegers(control: AbstractControl) {
    const valid: boolean = Number.isInteger(Number.parseFloat(control.value));
    return valid ? null : {[ErrorCodes.form.errorCode.custom.numberNotInteger]: true};
  }
  
  export function atLeastOneObject(control: AbstractControl) {
    const valid: boolean = control.value && control.value.length > 0;
    return valid ? null : {[ErrorCodes.form.errorCode.custom.lessThanOneElement]: true};
  }
  
  
  export function notEmpty(control: AbstractControl) {
    // if string check if empty or only spaces
    if (typeof control.value === 'string') {
      return /^\s*$/.test(control.value) ? {[ErrorCodes.form.errorCode.custom.empty]: true} : null;
    }
    // if array check if empty
    if (Array.isArray(control.value)) {
      return control.value.length > 0 ? null : {[ErrorCodes.form.errorCode.custom.empty]: true};
    }
    // if object check if empty
    if (typeof control.value === 'object') {
      return Object.keys(control.value).length > 0 ? null : {[ErrorCodes.form.errorCode.custom.empty]: true};
    }
    // else check if null or undefined
    return control.value ? null : {[ErrorCodes.form.errorCode.custom.empty]: true};
  }
  
  // check sanitized html vs original html and error if different
  export function onlyCleanHtml(control: AbstractControl) {
    let original  = control.value;
    let sanitized = DOMPurify.sanitize(original);
    return original === sanitized ? null : {[ErrorCodes.form.errorCode.custom.invalidContent]: true};
  }
  // @ts-ignore
  function onlyNumbers(control: AbstractControl) {
    return !(typeof control.value === 'number') ? {[ErrorCodes.form.errorCode.custom.numberNot]: true} : null;
  }
  
  // @ts-ignore
  function onlyPositiveAndInteger(control: AbstractControl) {
    const input = control.value;
    return input <= 0 || Math.round(input) !== input ? {[ErrorCodes.form.errorCode.custom.numberNotPositiveInteger]: true} : null;
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
  options?: ISelectable[];
  disabled?: boolean;
}

export function isOption(value: any): value is ISelectable {
  return value && value.id && typeof (value.id) === 'string' && value.name && typeof (value.name) === 'string';
}

export function findAndApplyOptionForIdInGroup(id: string, control: UntypedFormControl, options: ISelectable[]): void {
  const flattenedOptions: ISelectable[] = flatOptionGroupToArray(options);
  
  const optionForInput: ISelectable | undefined = findOptionForId(id, flattenedOptions);
  if (optionForInput) {control.patchValue(optionForInput); }
  
}

/**
 * Pass-by-reference input applier
 * alternative:    this.fields.skills.control.patchValue(data.skills); works most of the time
 * @param input
 * @param control
 * @param options
 */
export function findAndApplyOptionsForSelectablesInGroup(input: ISelectable[], control: UntypedFormControl, options: ISelectable[]): void {
  const flattenedOptions: ISelectable[] = flatOptionGroupToArray(options);
  
  const optionForInput = input.map(item => flattenedOptions.find(value => value.id === item.id && value.name === item.name));
  
  if (optionForInput) {
    control.patchValue(optionForInput);
  }
  
}

export function findAndApplyOptionForId(id: string, control: UntypedFormControl, options: ISelectable[]): void {
  const optionForInput: ISelectable | undefined = findOptionForId(id, options);
  
  if (optionForInput) {control.patchValue(optionForInput); }
  
}

export function findAndApplyOptionForName(id: string, control: UntypedFormControl, options: ISelectable[]): void {
  const optionForInput: ISelectable | undefined = findOptionForName(id, options);
  if (optionForInput) {control.patchValue(optionForInput); }
  
}

export function getCleanedValue(control: UntypedFormControl): string | ISelectable {
  return isOption(control.value) ? control.value : control.value.toString() as string;
}

export function getCleanedValueId(control: UntypedFormControl, defaultVal = ''): string {
  return isOption(control.value) ? control.value.id : defaultVal;
}

export function getCleanedValueName(control: UntypedFormControl, defaultVal = ''): string {
  return isOption(control.value) ? control.value.name : defaultVal;
}

export function flatOptionGroupToArray(options: Array<ISelectable>): ISelectable[] {
  const cleanOptions = options.map(x => x.options)
                              .filter((item): item is ISelectable[] => !!item);
  
  return cleanOptions.reduce((accumulator, options) => accumulator.concat(options));
}

export function findOptionForName(name: string, options: Array<ISelectable>): ISelectable | undefined {
  return options.find(x => x.name === name);
}

export function findOptionForId(id: string, options: Array<ISelectable>): ISelectable | undefined {
  return options.find(x => x.id === id);
}