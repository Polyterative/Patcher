import {
  COMMA,
  ENTER
}                            from '@angular/cdk/keycodes';
import {
  Component,
  Input
}                            from '@angular/core';
import {
  FormControl,
  ValidatorFn
}                            from '@angular/forms';
import {
  MatAutocompleteSelectedEvent,
  MatChipInputEvent,
  MatFormFieldAppearance,
  TooltipPosition
}                            from '@angular/material';
import { BehaviorSubject }   from 'rxjs';
import {
  debounceTime,
  filter,
  share,
  startWith,
  takeUntil
}                            from 'rxjs/operators';
import { AngularEntityBase } from 'src/app/Utils/LocalLibraries/OrangeStructures/base/angularEntityBase';
import { Strings }           from 'src/app/Utils/LocalLibraries/VioletUtilities/app-strings';
import { ConstantsService }  from 'src/app/Utils/LocalLibraries/VioletUtilities/constants.service';
import { DimensionsService } from 'src/app/Utils/LocalLibraries/VioletUtilities/dimensions.service';
import { LoggerService }     from 'src/app/Utils/LocalLibraries/VioletUtilities/logger/logger.service';
import { isArray }           from 'util';
import {
  FormTypes,
  IFormLineSetup,
  ISelectable
}                            from './form-element-models';

@Component({
  selector:    'lib-mat-form-entity',
  templateUrl: './mat-form-entity.component.html',
  styleUrls:   ['./mat-form-entity.component.scss']
})
export class MatFormEntityComponent extends AngularEntityBase {
  
  private findOptionForName: (name: string, options: Array<ISelectable>) => ISelectable = (name: string, options: Array<ISelectable>): ISelectable => {
    return options.find(x => x.name === name);
  };
  
  errors: string;
  
  /**
   * Types reference, do not use from outside
   */
  types = FormTypes;
  
  @Input() formGroupRoot: IFormLineSetup;
  
  @Input() control: FormControl;
  
  // internal, DO NOT USE
  ghostControl: FormControl;
  
  @Input() textTransformFunction: (x: string) => string;
  
  /**
   * The Angular Material tooltip provides a text label that is displayed when the user hovers over or longpresses an element.
   */
  @Input() tooltip = '';
  
  @Input() formFieldAppearenceType: MatFormFieldAppearance = 'standard';
  
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
  
  /**
   * In autocomplete mode, allows case insensitive search
   */
  @Input() autocompleteCaseSensitiveComparison = false;
  @Input() dateMin?: Date;
  
  @Input() dateMax?: Date;
  
  @Input() dateOpenPosition?: Date;
  
  @Input() tooltipPosition?: TooltipPosition = 'below';
  /**
   * Options, necessary when using FormTypes.SELECT or FormTypes.AUTOCOMPLETE
   */
  @Input() options: Array<ISelectable>;
  // @Input()
  optionsFiltered: BehaviorSubject<Array<ISelectable>> = new BehaviorSubject<Array<ISelectable>>([]);
  @Input() placeholder: string;
  @Input() label: string;
  @Input() type: FormTypes = FormTypes.TEXT;
  @Input() default = false;
  /**
   *   You can use something like
   *   public getElementsErrors(toBeChecked: FormControl): string {
   *   let toReturn: string;
   *
   *   const voidChar = '';
   *
   *   toReturn =
   *       toBeChecked.hasError(Strings.form.errorCode.min) ? Strings_it.form.error_min : toBeChecked.hasError(Strings.form.errorCode.max) ? Strings_it.form.error_max : toBeChecked.hasError(Strings.form.errorCode.custom.operation_notInRange) ? Strings_it.form.error_operation_notInRange : toBeChecked.hasError(Strings.form.errorCode.custom.staff_notInRange) ? Strings_it.form.error_staff_notInRange : voidChar;
   *
   *   if (toReturn === voidChar) {
   *       toReturn = super.getDefaultErrors(toBeChecked);
   *   }
   *   return toReturn;
   *
   * }
   */
  @Input() errorProvider: (formControl: FormControl) => string;
  
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
  
  readonly separatorKeysCodes: Array<number> = [
    ENTER,
    COMMA
    // TAB // add ONLY if you add TAB-to-add  to autocomplete
  ];
  
  private static safelyAddValidator(hostControl: FormControl, hostValidator: ValidatorFn | null, newValidator: ValidatorFn): void {
    hostControl.setValidators(hostValidator ? [
      hostValidator,
      newValidator
    ] : newValidator);
  }
  
  constructor(
    public Log: LoggerService,
    public Dimens: DimensionsService,
    public Constants: ConstantsService
  ) {
    super(Constants, Dimens);
    
  }
  
  /**
   * DO NOT STATICIZE, USED IN HTML
   * @param entry
   */
  autocomplete_displayFunction(entry?: string): string {
    // modify input to manipulate it before showing on the input
    // order is:
    // option click => displayfunction => output
    return entry || '';
  }
  
  ngOnInit(): void {
    super.ngOnInit();
    
    const hostControl = this.control;
    const hostValidator: ValidatorFn | null = hostControl.validator;
  
    // noinspection JSMissingSwitchDefault,JSMissingSwitchBranches,JSMissingSwitchBranches
    switch (this.type) {
      case FormTypes.TEXT:
        if (this.textTransformFunction) {
          hostControl.valueChanges.pipe(filter(x => x.length > 0), takeUntil(this.destroyEvent$)).subscribe(x => {
            const result = this.textTransformFunction(x);
            
            if (x !== result) { // prevent loop
              this.control.patchValue(result);
            }
          });
        }
        
        break;
      case FormTypes.NUMBER:
        break;
      case FormTypes.AREA:
        break;
      case FormTypes.SELECT:
        this.checkOptions();
        
        if (this.disableVoidSelection) {
          
          const errorObject = {[Strings.form.errorCode.custom.notInOptions]: true};
          
          const myValidator = x => x.value === '' ? errorObject : null; // if void return error
          
          MatFormEntityComponent.safelyAddValidator(hostControl, hostValidator, myValidator);
        }
        
        break;
      case FormTypes.AUTOCOMPLETE:
        this.checkOptions();
        hostControl.valueChanges
          .pipe(
            takeUntil(this.destroyEvent$),
            startWith(''),
            debounceTime(250),
            filter(value => isArray(this.options))
          )
          .subscribe((input: string) => this.optionsFiltered.next(this.options.filter(opt => {
            return this.autocompleteCaseSensitiveComparison ? opt.name.includes(input) : opt.name.toLowerCase()
              .includes(input.toLowerCase());
          })));
        
        if (this.strictAutocomplete) {
          // const isValueInOptions = this.options.some(y => y.name === this.control.value);
          const errorObject = {[Strings.form.errorCode.custom.notInOptions]: true};
          
          const myValidator = x => {
            const foundSome = this.options.some(y => y.name === x.value);
            const isVoid = x.value === '';
  
            // tslint:disable-next-line:no-null-keyword
            return (foundSome || isVoid && this.autocompleteCanBeVoid) ? null : errorObject;
          };
          
          MatFormEntityComponent.safelyAddValidator(hostControl, hostValidator, myValidator);
        }
        
        break;
      case FormTypes.MULTICOMPLETE:
        this.checkOptions();
        this.ghostControl = new FormControl('');
        this.ghostControl.valueChanges
          .pipe(
            takeUntil(this.destroyEvent$),
            startWith(''),
            debounceTime(250),
            filter(() => isArray(this.options))
          )
          .subscribe((input: string) => this.optionsFiltered.next(this.options.filter(opt => {
            return this.autocompleteCaseSensitiveComparison ? opt.name.includes(input) : opt.name.toLowerCase().includes(input.toLowerCase());
          })));
        
        if (this.strictAutocomplete) {
          // const isValueInOptions = this.options.some(y => y.name === this.control.value);
          const errorObject = {[Strings.form.errorCode.custom.notInOptions]: true};
          
          const myValidator = x => {
            
            const input: Array<ISelectable> = x.value;
            
            let foundAll = false;
            
            for (const currInputOption of input) {
              const isIncluded = this.options.some(option => option.id === currInputOption.id && option.name === currInputOption.name);
              if (isIncluded) {
                foundAll = true;
              } else {
                foundAll = false;
                break;
              }
            }
            
            const isVoid = input.length < 1;
            const isVoidWhileCanBe = this.autocompleteCanBeVoid ? (isVoid) : false;
  
            // tslint:disable-next-line:no-null-keyword
            return (foundAll) || (isVoidWhileCanBe) ? null : errorObject;
          };
          
          MatFormEntityComponent.safelyAddValidator(hostControl, hostValidator, myValidator);
          
        }
        
        break;
    }
    
    const observable = hostControl.valueChanges
      .pipe(
        takeUntil(this.destroyEvent$),
        startWith(hostControl.value),
        debounceTime(250),
        share()
      );
    
    observable
      .pipe(filter(_ => hostControl.invalid))
      .subscribe(_ => this.errors = this.errorProvider(hostControl));
    
    observable
      .pipe(filter(_ => hostControl.valid))
      .subscribe(_ => this.errors = '');
    
  }
  
  addToMultiText($event: MatChipInputEvent): void {
    const dataCapsule = this.control;
    const input = $event.input;
    const value = $event.value;
    
    // Add our thing
    if ((value || '').trim()) {
      const toAdd: ISelectable = ({name: value.trim(), id: 1});
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
    const dataCapsule = this.control;
    const nameString = $event.option.value;
    
    // Add our thing
    if ((nameString || '').trim()) {
      const isAlreadyPresent = this.findOptionForName(nameString, this.control.value);
      
      if (!isAlreadyPresent || isAlreadyPresent && this.multiChipCompleteAllowDuplicates) {
        const toAdd: ISelectable = this.findOptionForName(nameString, this.options);
        
        dataCapsule.patchValue([
          ...dataCapsule.value,
          toAdd
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
  
  private checkOptions(): void {
    if (!isArray(this.options)) {
      this.Log.error('Options is not array! I\'m a selector, give me the options!');
    }
  }
}
