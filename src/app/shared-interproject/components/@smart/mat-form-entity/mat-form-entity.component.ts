import {
  COMMA,
  ENTER
}                                       from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit
}                                       from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn
}                                       from '@angular/forms';
import { MatChipInputEvent }            from '@angular/material/chips';
import {
  BehaviorSubject,
  merge,
  NEVER,
  Observable,
  of
}                                       from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  tap,
  withLatestFrom
}                                       from 'rxjs/operators';
import { SubManager }                   from '../../../directives/subscription-manager';
import {
  AppFormUtils,
  ErrorCodes
}                                       from './app-form-utils';
import {
  findOptionForId,
  flatOptionGroupToArray,
  FormTypes,
  ISelectable,
  isOption
}                                       from './form-element-models';
import {
  FloatLabelType,
  MatFormFieldAppearance
}                                       from "@angular/material/form-field";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { TooltipPosition }              from "@angular/material/tooltip";


export interface IMatFormEntityConfig {
  type: FormTypes;
  control: UntypedFormControl;
  label: string;
  code: string;
  flex: string;
  // options?: ISelectable[];
  options$?: Observable<ISelectable[]>;
  hint?: string;
}

/**
 * Author Vlady Yakovenko
 * version 4.0 of the library with dynamic types and observable dynamic options
 * handle with care
 * updated 09/12/2021
 * created: 03/03/2018
 */
@Component({
  selector: 'lib-mat-form-entity',
  templateUrl: './mat-form-entity.component.html',
  styleUrls: ['./mat-form-entity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatFormEntityComponent extends SubManager implements OnInit, OnDestroy {
  
  constructor(
    private formBuilder: UntypedFormBuilder,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    super();
    
    if (this.formGroupRoot === undefined) {
      this.formGroupRoot = this.formBuilder.group({});
    }
    
  }
  
  @Input()
  set disabled(value: boolean) {
    // tslint:disable-next-line:switch-default
    switch (value) {
      case true:
        this.control.disable();
        if (this.ghostControl) {
          this.ghostControl.disable();
        }
        break;
      case false:
        this.control.enable();
        if (this.ghostControl) {
          this.ghostControl.enable();
        }
        break;
    }
  }
  
  @Input()
  dataPack?: IMatFormEntityConfig;
  
  // @ts-ignore
  invalid$: BehaviorSubject<boolean> = new BehaviorSubject(false);  // keep this a bsubject otherwise you will have template errors
  errors$: BehaviorSubject<string> = new BehaviorSubject('');       // keep this a bsubject otherwise you will have template errors
  /**
   * Types reference, do not use from outside
   */
  types = FormTypes;
  @Input() formGroupRoot: UntypedFormGroup;
  @Input() styleOptions: {
    hideRequired: boolean,
    floatLabel: FloatLabelType
  } = {
    hideRequired: false,
    floatLabel: 'auto' // can be auto|always|never
  };
  @Input() control: UntypedFormControl;
  @Input() hint ?: string;
  @Input() warning ?: string;
  /**
   * internal, DO NOT USE
   * It's function is to receive user input for filtering multicomplete options
   */
  ghostControl: UntypedFormControl;
  @Input() textTransformFunction!: (x: string) => string;
  /**
   * The Angular Material tooltip provides a text label that is displayed when the user hovers over or longpresses an element.
   */
  @Input() tooltip = '';
  @Input() formFieldAppearanceType: MatFormFieldAppearance = 'outline';
  @Input() disableBrowserAutocomplete = false;
  /**
   * In autocomplete mode Validate input basing on options, INVALID if not found
   */
  @Input() strictAutocomplete = true;
  /**
   * In autocomplete mode Validate input basing on options, INVALID if not found
   */
  @Input() multiChipCompleteAllowDuplicates = false;
  /**
   * Allow autocomplete mode to return a VALID state when value is a void string
   */
  @Input() autocompleteCanBeVoid = false;
  @Input() disableVoidSelection = false;
  @Input() disableClearButton = false;
  @Input() optionsTooltipMinLength = 80;
  /**
   * In autocomplete mode, allows case insensitive search
   */
  @Input() autocompleteCaseSensitiveComparison = false;
  @Input() dateMin?: Date;
  @Input() dateMax?: Date;
  @Input() dateOpenPosition?: Date = new Date();
  @Input() tooltipPosition: TooltipPosition = 'below';
  /**
   * Options, necessary when using FormTypes.SELECT or FormTypes.AUTOCOMPLETE
   * Remember to always value this field otherwise you will have errors
   * especially when using observables in template (|async)
   * Remember to add a starWith([])
   */
  @Input() options$: Observable<ISelectable[]> = of([]);
  // @Input()
  optionsFiltered: BehaviorSubject<Array<ISelectable>> = new BehaviorSubject<Array<ISelectable>>([]);
  @Input() placeholder = '';
  @Input() label = 'Description';
  @Input() type: FormTypes = FormTypes.TEXT;
  @Input() default = false;
  
  //
  // @Input()
  // public max: observable;
  //
  // @Input()
  // public min: observable;
  //
  // @Input()
  // public maxLength: observable;
  //
  // @Input()
  // public minLength: observable;
  readonly autocompleteSeparatorKeysCodes: Array<number> = [
    ENTER,
    COMMA
    // TAB // add ONLY if you add TAB-to-add  to autocomplete
  ];
  
  private errorObjectNotInOptions = {[ErrorCodes.form.errorCode.custom.notInOptions]: true};
  
  hidePassword = true;
  
  ngOnDestroy(): void {
    this.control.setAsyncValidators([]);
  }
  
  /**
   *   You can use something like
   *   public getElementsErrors(toBeChecked: FormControl): string {
   *   let toReturn: string;
   *
   *   const voidChar = '';
   *
   *   toReturn =
   *       toBeChecked.hasError(Strings.form.errorCode.min) ? Strings_it.form.error_min : toBeChecked.hasError(Strings.form.errorCode.max) ? Strings_it.form.error_max :
   * toBeChecked.hasError(Strings.form.errorCode.custom.operation_notInRange) ? Strings_it.form.error_operation_notInRange : toBeChecked.hasError(Strings.form.errorCode.custom.staff_notInRange) ?
   * Strings_it.form.error_staff_notInRange : voidChar;
   *
   *   if (toReturn === voidChar) {
   *       toReturn = super.getDefaultErrors(toBeChecked);
   *   }
   *   return toReturn;
   *
   * }
   */
  @Input() errorProvider: (formControl: UntypedFormControl) => string = (x: UntypedFormControl) => AppFormUtils.getErrors(x);
  
  /**
   * DO NOT STATICIZE, USED IN HTML
   * @param entry
   */
  autocomplete_displayFunction(entry?: ISelectable): string {
    // modify input to manipulate it before showing on the input
    // order is:
    // option click => displayfunction => output
    return entry && entry.name || '';
  }
  
  ngOnInit(): void {
    if (this.dataPack) {
      this.control = this.dataPack.control;
      this.label = this.dataPack.label;
      this.type = this.dataPack.type;
      if (this.dataPack.options$) {
        this.options$ = this.dataPack.options$;
      }
      if (this.dataPack.hint) {
        this.hint = this.dataPack.hint;
      }
    }
    
    const changes$ = merge(this.control.statusChanges, this.control.valueChanges);
    this.manageSub(
      changes$
        .pipe(
          map(() => this.control.invalid),
          tap(() => this.changeDetectorRef.detectChanges())
        )
        .subscribe(data => this.invalid$.next(data))
    );
    
    this.manageSub(
      merge(changes$, this.options$ ? this.options$ : NEVER)
        .pipe(
          map(_ => this.errorProvider(this.control))
        )
        .subscribe(errors => this.errors$.next(errors))
    );
    
    const hostControl = this.control; // alias
    
    switch (this.type) {
      case FormTypes.EMAIL:
        break;
      case FormTypes.PASSWORD_CURRENT:
        break;
      case FormTypes.PASSWORD_NEW:
        break;
      case FormTypes.TEXT:
        if (this.textTransformFunction) {
          this.manageSub(
            hostControl.valueChanges
              .pipe(
                filter(x => x.length > 0)
              )
              .subscribe(x => {
                const result = this.textTransformFunction(x);
                
                if (x !== result) { // prevent loop
                  this.control.patchValue(result);
                }
              })
          );
          
        }
        break;
      case FormTypes.SELECT:
        this.checkOptions();
        
        if (this.disableVoidSelection) {
          this.safelyAddValidator((control) => control.value === '' ? this.errorObjectNotInOptions : null);
        }
        
        break;
      case FormTypes.MULTISELECT_GROUPED:
        this.checkOptions();
        
        if (this.disableVoidSelection) {
          this.safelyAddValidator(control => control.value === '' ? this.errorObjectNotInOptions : null);
        }
        
        break;
      case FormTypes.AUTOCOMPLETE_GROUPED:
        this.checkOptions();
        
        this.manageSub(
          merge(
            hostControl.valueChanges,
            this.options$
          )
            .pipe(
              map(() => hostControl.value),
              debounceTime(200),
              withLatestFrom(this.options$)
            )
            .subscribe(([input, options]: [ISelectable | string, ISelectable[]]) => {
              
              const allOptions: Array<ISelectable> = this.getOptionsGroupedCopy(options);
              let remainingOptions: ISelectable[] = [];
              
              if (input) {
                if (isOption(input)) { // lib-injected object (good)
                  remainingOptions = allOptions.map((group, groupId) => {
                    
                    const groupOptions = allOptions[groupId].options;
                    
                    if (groupOptions) {
                      group.options = groupOptions
                        .map((x => x))
                        .filter(opt =>
                          this.autocompleteCaseSensitiveComparison
                            ? opt.name.includes(input.name)
                            : opt.name.toLowerCase()
                              .includes(input.name.toLowerCase()));
                    }
                    
                    return group;
                  });
                } else if (typeof input === 'string') { // usertext (invalid until obj)
                  
                  remainingOptions = allOptions.map((group, groupId) => {
                    
                    const groupOptions = allOptions[groupId].options;
                    
                    if (groupOptions) {
                      group.options = groupOptions
                        .map((x => x))
                        .filter(opt =>
                          this.autocompleteCaseSensitiveComparison
                            ? opt.name.includes(input)
                            : opt.name.toLowerCase()
                              .includes(input.toLowerCase()));
                    }
                    
                    return group;
                  });
                  
                  // in my original idea this piece of code replaced the inserted string with the found object
                  // but this causes some usage problems, so I decided to keep it simple and not apply this automatism
                  // let flattenedOptions: ISelectable[] = this.flatOptionGroupToArray(this.options);
                  
                  // let optionForInput: ISelectable | undefined = this.findOptionForName(input.toLowerCase()
                  //                                                                           .trim(),
                  //   flattenedOptions
                  // );
                  // if (optionForInput) {hostControl.patchValue(optionForInput);}
                }
                
                // filter out void groups
                remainingOptions = remainingOptions.filter(x => x.options && x.options.length > 0);
              } else { remainingOptions = allOptions; }
              
              this.optionsFiltered.next(remainingOptions);
            })
        );
        
        if (this.strictAutocomplete) {
          
          const myAsyncValidator = (control: AbstractControl) => {
            
            const input$ = of(control.value);
            
            return input$// I would like to update even if options change in the future
              .pipe(
                withLatestFrom(input$, this.options$),
                map(([_, input, options]: [void, ISelectable | string, Array<ISelectable>]) => {
                    
                    if (options.length === 0) {
                      return null;
                    }
                    
                    if (typeof input === 'string') {
                      return this.autocompleteCanBeVoid && input === '' ? null : this.errorObjectNotInOptions;
                    }
                    
                    // flat opt groups
                    const allOptions = flatOptionGroupToArray(options);
                    const foundSome = allOptions.some(y => (y.id === input.id));
                    
                    // tslint:disable-next-line:no-null-keyword
                    return foundSome ? null : this.errorObjectNotInOptions;
                    
                  }
                )
              );
          };
          
          this.safelyAddAsyncValidator(myAsyncValidator);
          
        }
        
        break;
      case FormTypes.AUTOCOMPLETE:
        this.checkOptions();
        this.manageSub(
          merge(hostControl.valueChanges, this.options$)
            .pipe(
              map(() => hostControl.value),
              debounceTime(200),
              withLatestFrom(this.options$)
            )
            .subscribe(([input, options]: [ISelectable | string, ISelectable[]]) => {
              
              const allOptions: Array<ISelectable> = options;
              let remainingOptions: ISelectable[];
              
              if (isOption(input)) {
                remainingOptions = allOptions
                  .map((x => x))
                  .filter(opt =>
                    this.autocompleteCaseSensitiveComparison ? opt.name.includes(input.name) : opt.name.toLowerCase()
                      .includes(input.name.toLowerCase()));
              } else if (typeof input === 'string') {
                remainingOptions = options.filter(opt =>
                  this.autocompleteCaseSensitiveComparison ? opt.name.includes(input) : opt.name.toLowerCase()
                    .includes(input.toLowerCase()));
                
              } else {
                remainingOptions = options;
              }
              this.optionsFiltered.next(remainingOptions);
            })
        );
        
        if (this.strictAutocomplete) {
          
          const myAsyncValidator = (control: AbstractControl) => {
            
            const input$ = of(control.value);
            
            return input$// I would like to update even if options change in the future
              .pipe(
                withLatestFrom(input$, this.options$),
                map(([_, input, options]: [void, ISelectable | string, Array<ISelectable>]) => {
                    
                    if (options.length === 0) {
                      return null;
                    }
                    
                    if (typeof input === 'string') {
                      return this.autocompleteCanBeVoid && input === '' ? null : this.errorObjectNotInOptions;
                    }
                    
                    const foundSome = options.some(y => (y.id === input.id));
                    
                    // tslint:disable-next-line:no-null-keyword
                    return foundSome ? null : this.errorObjectNotInOptions;
                  }
                )
              );
          };
          
          this.safelyAddAsyncValidator(myAsyncValidator);
          
        }
        
        break;
      case FormTypes.AUTOCOMPLETE_MULTIPLE:
        
        this.checkOptions();
        this.ghostControl = new UntypedFormControl('');
        
        if (hostControl.value === '') {
          console.error('Input for multicomplete must be an array ');
        }
        
        this.manageSub(
          hostControl.statusChanges
            .subscribe(() => {
              hostControl.disabled ? this.ghostControl.disable() : this.ghostControl.enable();
            })
        );
        
        this.manageSub(
          merge(this.ghostControl.valueChanges, this.options$)
            .pipe(
              map(() => this.ghostControl.value),
              debounceTime(200),
              withLatestFrom(this.options$)
            )
            .subscribe(([input, options]: [ISelectable | string, ISelectable[]]) => {
              
              if (typeof input === 'string') {
                const filtered: ISelectable[] = options.filter(opt =>
                  this.autocompleteCaseSensitiveComparison ? opt.name.includes(input) : opt.name.toLowerCase()
                    .includes(input.toLowerCase()));
                
                this.optionsFiltered.next(filtered);
                
              }
              
            })
        );
        
        if (this.strictAutocomplete) {
          
          const myAsyncValidator = (control: AbstractControl) => {
            
            const input$ = of(control.value);
            
            return input$// I would like to update even if options change in the future
              .pipe(
                withLatestFrom(input$, this.options$),
                map(([_, input, options]: [void, Array<ISelectable>, Array<ISelectable>]) => {
                    
                    let foundAll = false;
                    
                    for (const currInputOption of input) {
                      const isIncluded = options.some(option =>
                        (option.id === currInputOption.id && option.name === currInputOption.name));
                      
                      if (isIncluded) {
                        foundAll = true;
                      } else {
                        foundAll = false;
                        break;
                      }
                    }
                    
                    const isVoid = input.length === 0;
                    const isVoidWhileCanBe = this.autocompleteCanBeVoid ? (isVoid) : false;
                    
                    // tslint:disable-next-line:no-null-keyword
                    return (foundAll) || (isVoidWhileCanBe) ? null : this.errorObjectNotInOptions;
                    
                  }
                )
              );
          };
          
          this.safelyAddAsyncValidator(myAsyncValidator);
          
        }
        //
        break;
    }
    
  }
  
  compareFunctionStrictObject(o1: ISelectable, o2: ISelectable) {
    return (o1.name === o2.name && o1.id === o2.id);
  }
  
  addToMultiText($event: MatChipInputEvent): void {
    const dataCapsule = this.control;
    const input = $event.input;
    const value = $event.value;
    
    // Add our thing
    if ((value || '').trim()) {
      const toAdd: ISelectable = ({
        name: value.trim(),
        id: ''
      });
      dataCapsule.patchValue([
        ...dataCapsule.value,
        toAdd
      ]);
    }
    
    // Reset the input value
    if (input) {
      input.value = '';
    }
  }
  
  addToMultiComplete($event: MatAutocompleteSelectedEvent): void {
    const input = $event.option.value;
    // Add our thing
    if ((input && input.id && input.name)) {
      
      const isAlreadyPresent = !!findOptionForId(input.id, this.control.value);
      
      if (!isAlreadyPresent || (isAlreadyPresent && this.multiChipCompleteAllowDuplicates)) {
        
        this.control.patchValue([
          ...this.control.value,
          input
        ]);
      }
      
    }
    
    // Reset the input value, useful for resetting the debounce + filtered options smootly, LEAVE THIS HERE
    this.ghostControl.patchValue('');
  }
  
  removeFromChips(element: ISelectable): void {
    const data: Array<ISelectable> = this.control.value;
    data.splice(data.indexOf(element), 1);
    this.control.patchValue(data);
  }
  
  cleanMultiComplete($event: MatChipInputEvent): void {
    $event.input.value = ''; // enough for self-cleanig of the internalForm
  }
  
  private safelyAddValidator(newValidator: ValidatorFn): void {
    const hostValidator: ValidatorFn | null = this.control.validator;
    
    this.control.setValidators(hostValidator ? [
      hostValidator,
      newValidator
    ] : [newValidator]);
  }
  
  private safelyAddAsyncValidator(newValidator: AsyncValidatorFn): void {
    const hostAsyncValidator: AsyncValidatorFn | null = this.control.asyncValidator;
    
    this.control.setAsyncValidators(hostAsyncValidator ? [
      hostAsyncValidator,
      newValidator
    ] : [newValidator]);
  }
  
  // fixed this way because otherwise it caused immutability issues and object by reference passes
  // This is a quick way to make a deep copy of the array and content
  private getOptionsGroupedCopy(options: ISelectable[]): {
    name: string;
    options: ISelectable[];
    disabled?: boolean;
    id: string
  }[] {
    return [
      ...options.map((option: ISelectable) => ({
        ...option,
        options: option.options?.slice()
      }))
    ];
  }
  
  private checkOptions(): void {
    // console.warn([
    //   this.label,
    //   this.options
    // ]);
    
    if (this.options$ === undefined) {
      console.error('Options is not observable! I\'m a selector, give me the options!');
      console.error(this.options$);
    }
  }
}