import {
  AbstractControl,
  AsyncValidatorFn,
  UntypedFormControl,
  ValidatorFn
} from '@angular/forms';
import {
  BehaviorSubject,
  merge,
  NEVER,
  Observable,
  of,
  Subscription
} from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import {
  AppEnterKeyHint,
  AppInputMode,
  findOptionForId,
  flatOptionGroupToArray,
  FormTypes,
  ISelectable,
  isOption
} from './form-element-models';
import { normalizeForSearch } from './string-utils';
import { ErrorCodes } from './app-form-utils';

export const FORM_ENTITY_NOT_IN_OPTIONS_ERROR = {[ErrorCodes.form.errorCode.custom.notInOptions]: true};

export interface FormEntityValidationStreamsConfig {
  control: UntypedFormControl;
  options$: Observable<ISelectable[]> | undefined;
  invalid$: BehaviorSubject<boolean>;
  errors$: BehaviorSubject<string>;
  errorProvider: (formControl: UntypedFormControl) => string;
  detectChanges: () => void;
  manageSub: (subscription?: Subscription) => void;
}

export interface FormEntityTypeSetupConfig {
  type: FormTypes;
  hostControl: UntypedFormControl;
  options$: Observable<ISelectable[]>;
  optionsFiltered: BehaviorSubject<ISelectable[]>;
  textTransformFunction?: (x: string) => string;
  autocompleteCaseSensitiveComparison: boolean;
  strictAutocomplete: boolean;
  autocompleteCanBeVoid: boolean;
  disableVoidSelection: boolean;
  errorObjectNotInOptions: typeof FORM_ENTITY_NOT_IN_OPTIONS_ERROR;
  manageSub: (subscription?: Subscription) => void;
  setGhostControl: (control: UntypedFormControl) => void;
  safelyAddValidator: (validator: ValidatorFn) => void;
  safelyAddAsyncValidator: (validator: AsyncValidatorFn) => void;
  checkOptions: () => void;
}

export function connectFormEntityValidationStreams(config: FormEntityValidationStreamsConfig): void {
  const changes$ = merge(config.control.statusChanges, config.control.valueChanges);
  config.manageSub(
    changes$
      .pipe(
        map(() => config.control.invalid),
        tap(() => config.detectChanges())
      )
      .subscribe(data => config.invalid$.next(data))
  );

  config.manageSub(
    merge(changes$, config.options$ ? config.options$ : NEVER)
      .pipe(
        map(_ => config.errorProvider(config.control))
      )
      .subscribe(errors => config.errors$.next(errors))
  );
}

export function setupFormEntityType(config: FormEntityTypeSetupConfig): void {
  switch (config.type) {
    case FormTypes.EMAIL:
    case FormTypes.PASSWORD_CURRENT:
    case FormTypes.PASSWORD_NEW:
      break;
    case FormTypes.TEXT:
      setupTextTransform(config);
      break;
    case FormTypes.SELECT:
    case FormTypes.MULTISELECT_GROUPED:
      setupSelectValidation(config);
      break;
    case FormTypes.AUTOCOMPLETE_GROUPED:
      setupGroupedAutocomplete(config);
      break;
    case FormTypes.AUTOCOMPLETE:
      setupFlatAutocomplete(config);
      break;
    case FormTypes.AUTOCOMPLETE_MULTIPLE:
      setupMultiAutocomplete(config);
      break;
  }
}

function setupTextTransform(config: FormEntityTypeSetupConfig): void {
  if (!config.textTransformFunction) {
    return;
  }

  config.manageSub(
    config.hostControl.valueChanges
      .pipe(
        filter(x => x.length > 0)
      )
      .subscribe(x => {
        const result = config.textTransformFunction?.(x);

        if (x !== result) {
          config.hostControl.patchValue(result);
        }
      })
  );
}

function setupSelectValidation(config: FormEntityTypeSetupConfig): void {
  config.checkOptions();

  if (config.disableVoidSelection) {
    config.safelyAddValidator(control => control.value === '' ? config.errorObjectNotInOptions : null);
  }
}

function setupGroupedAutocomplete(config: FormEntityTypeSetupConfig): void {
  config.checkOptions();

  config.manageSub(
    merge(
      config.hostControl.valueChanges,
      config.options$
    )
      .pipe(
        map(() => config.hostControl.value),
        debounceTime(200),
        withLatestFrom(config.options$)
      )
      .subscribe(([input, options]: [ISelectable | string, ISelectable[]]) => {
        config.optionsFiltered.next(filterGroupedOptions(input, options, config.autocompleteCaseSensitiveComparison));
      })
  );

  if (config.strictAutocomplete) {
    config.safelyAddAsyncValidator(buildGroupedStrictAutocompleteValidator(
      config.options$,
      config.autocompleteCanBeVoid,
      config.errorObjectNotInOptions
    ));
  }
}

function setupFlatAutocomplete(config: FormEntityTypeSetupConfig): void {
  config.checkOptions();
  config.manageSub(
    merge(config.hostControl.valueChanges, config.options$)
      .pipe(
        map(() => config.hostControl.value),
        debounceTime(200),
        withLatestFrom(config.options$)
      )
      .subscribe(([input, options]: [ISelectable | string, ISelectable[]]) => {
        config.optionsFiltered.next(filterFlatOptions(input, options, config.autocompleteCaseSensitiveComparison));
      })
  );

  if (config.strictAutocomplete) {
    config.safelyAddAsyncValidator(buildFlatStrictAutocompleteValidator(
      config.options$,
      config.autocompleteCanBeVoid,
      config.errorObjectNotInOptions
    ));
  }
}

function setupMultiAutocomplete(config: FormEntityTypeSetupConfig): void {
  config.checkOptions();
  const ghostControl = new UntypedFormControl('');
  config.setGhostControl(ghostControl);

  if (config.hostControl.value === '') {
    console.error('Input for multicomplete must be an array ');
  }

  config.manageSub(
    config.hostControl.statusChanges
      .subscribe(() => {
        config.hostControl.disabled ? ghostControl.disable() : ghostControl.enable();
      })
  );

  config.manageSub(
    merge(ghostControl.valueChanges, config.options$)
      .pipe(
        map(() => ghostControl.value),
        debounceTime(200),
        withLatestFrom(config.options$)
      )
      .subscribe(([input, options]: [ISelectable | string, ISelectable[]]) => {
        if (typeof input === 'string') {
          config.optionsFiltered.next(filterFlatOptions(input, options, config.autocompleteCaseSensitiveComparison));
        }
      })
  );

  if (config.strictAutocomplete) {
    config.safelyAddAsyncValidator(buildMultiStrictAutocompleteValidator(
      config.options$,
      config.autocompleteCanBeVoid,
      config.errorObjectNotInOptions
    ));
  }
}

export function mapPresetOptions(presets: (string | number)[]): ISelectable[] {
  return presets.map(v => ({ id: String(v), name: String(v) }));
}

export function displayAutocompleteOption(entry?: ISelectable): string {
  return entry && entry.name || '';
}

export function displayPresetOption(entry?: ISelectable | string | number | null): string {
  if (entry == null) {
    return '';
  }
  if (typeof entry === 'string') {
    return entry;
  }
  if (typeof entry === 'number') {
    return String(entry);
  }
  return entry.name ?? '';
}

export function resolveInputMode(type: FormTypes, inputmode: AppInputMode | undefined, isSearchField: boolean): AppInputMode | null {
  if (inputmode) {
    return inputmode;
  }

  if (isSearchField) {
    return 'search';
  }

  switch (type) {
    case FormTypes.EMAIL:
      return 'email';
    case FormTypes.NUMBER:
      return 'numeric';
    case FormTypes.AUTOCOMPLETE:
    case FormTypes.AUTOCOMPLETE_GROUPED:
      return 'search';
    case FormTypes.TIME:
      return 'numeric';
    default:
      return 'text';
  }
}

export function resolveEnterKeyHint(
  type: FormTypes,
  enterkeyhint: AppEnterKeyHint | undefined,
  isSearchField: boolean
): AppEnterKeyHint | null {
  if (enterkeyhint) {
    return enterkeyhint;
  }

  if (isSearchField || type === FormTypes.AUTOCOMPLETE || type === FormTypes.AUTOCOMPLETE_GROUPED) {
    return 'search';
  }

  return null;
}

export function compareSelectableStrict(o1: ISelectable, o2: ISelectable): boolean {
  return (o1.name === o2.name && o1.id === o2.id);
}

export function copyGroupedOptions(options: ISelectable[]): ISelectable[] {
  return [
    ...options.map((option: ISelectable) => ({
      ...option,
      options: option.options?.slice()
    }))
  ];
}

export function filterFlatOptions(
  input: ISelectable | string,
  options: ISelectable[],
  caseSensitive: boolean
): ISelectable[] {
  if (!input && input !== '') { return options; }
  const searchStr = isOption(input) ? input.name : (input as string);
  return options.filter(opt =>
    caseSensitive
      ? opt.name.includes(searchStr)
      : normalizeForSearch(opt.name).includes(normalizeForSearch(searchStr))
  );
}

export function filterGroupedOptions(
  input: ISelectable | string,
  options: ISelectable[],
  caseSensitive: boolean
): ISelectable[] {
  const allOptions = copyGroupedOptions(options);

  if (!input) {
    return allOptions;
  }

  const searchStr = isOption(input) ? input.name : (input as string);
  return allOptions.map(group => {
    group.options = (group.options ?? []).filter(opt =>
      caseSensitive
        ? opt.name.includes(searchStr)
        : normalizeForSearch(opt.name).includes(normalizeForSearch(searchStr))
    );
    return group;
  }).filter(g => g.options && g.options.length > 0);
}

export function buildFlatStrictAutocompleteValidator(
  options$: Observable<ISelectable[]>,
  autocompleteCanBeVoid: boolean,
  errorObjectNotInOptions = FORM_ENTITY_NOT_IN_OPTIONS_ERROR
): AsyncValidatorFn {
  return (control: AbstractControl) => of(control.value).pipe(
    withLatestFrom(of(control.value), options$),
    map(([_, input, options]: [void, ISelectable | string, ISelectable[]]) => {
      if (options.length === 0) { return null; }
      if (typeof input === 'string') {
        return autocompleteCanBeVoid && input === '' ? null : errorObjectNotInOptions;
      }
      return options.some(y => y?.id === (input as ISelectable)?.id) ? null : errorObjectNotInOptions;
    })
  );
}

export function buildGroupedStrictAutocompleteValidator(
  options$: Observable<ISelectable[]>,
  autocompleteCanBeVoid: boolean,
  errorObjectNotInOptions = FORM_ENTITY_NOT_IN_OPTIONS_ERROR
): AsyncValidatorFn {
  return (control: AbstractControl) => of(control.value).pipe(
    withLatestFrom(of(control.value), options$),
    map(([_, input, options]: [void, ISelectable | string, ISelectable[]]) => {
      if (options.length === 0) { return null; }
      if (typeof input === 'string') {
        return autocompleteCanBeVoid && input === '' ? null : errorObjectNotInOptions;
      }
      const found = flatOptionGroupToArray(options).some(y => y.id === (input as ISelectable).id);
      return found ? null : errorObjectNotInOptions;
    })
  );
}

export function buildMultiStrictAutocompleteValidator(
  options$: Observable<ISelectable[]>,
  autocompleteCanBeVoid: boolean,
  errorObjectNotInOptions = FORM_ENTITY_NOT_IN_OPTIONS_ERROR
): AsyncValidatorFn {
  return (control: AbstractControl) => of(control.value).pipe(
    withLatestFrom(of(control.value), options$),
    map(([_, input, options]: [void, ISelectable[], ISelectable[]]) => {
      const isVoid = input.length === 0;
      if (autocompleteCanBeVoid && isVoid) { return null; }
      const foundAll = input.every(item => options.some(o => o.id === item.id && o.name === item.name));
      return foundAll ? null : errorObjectNotInOptions;
    })
  );
}

export function addMultiTextValue(currentValue: ISelectable[], value: string): ISelectable[] {
  if (!(value || '').trim()) {
    return currentValue;
  }

  return [
    ...currentValue,
    {
      name: value.trim(),
      id: ''
    }
  ];
}

export function addMultiCompleteValue(currentValue: ISelectable[], input: ISelectable, allowDuplicates: boolean): ISelectable[] {
  if (!(input && input.id && input.name)) {
    return currentValue;
  }

  const isAlreadyPresent = !!findOptionForId(input.id, currentValue);
  if (!isAlreadyPresent || (isAlreadyPresent && allowDuplicates)) {
    return [
      ...currentValue,
      input
    ];
  }

  return currentValue;
}

export function removeChipValue(currentValue: ISelectable[], element: ISelectable): ISelectable[] {
  currentValue.splice(currentValue.indexOf(element), 1);
  return currentValue;
}

export function focusNextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const ownerDocument = target.ownerDocument;
  const focusableFields = Array.from(
    ownerDocument.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])')
  ).filter(element => !element.hasAttribute('readonly') && (element.offsetParent !== null || ownerDocument.activeElement === element));
  const currentIndex = focusableFields.indexOf(target);
  const nextField = currentIndex >= 0 ? focusableFields[currentIndex + 1] : null;

  if (!nextField) {
    return false;
  }

  nextField.focus();
  return true;
}
