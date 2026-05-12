import {
  COMMA,
  ENTER
} from '@angular/cdk/keycodes';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn
} from '@angular/forms';
import {
  MatChipInputEvent,
  MatChipsModule
} from '@angular/material/chips';
import {
  BehaviorSubject,
  merge,
  NEVER,
  Observable,
  of
} from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { SubManager } from '../../../directives/subscription-manager';
import { normalizeForSearch } from './string-utils';
import {
  AppFormUtils,
  ErrorCodes
} from './app-form-utils';
import {
  findOptionForId,
  flatOptionGroupToArray,
  AppEnterKeyHint,
  AppInputMode,
  FormTypes,
  ISelectable,
  MatFormErgonomicsConfig,
  isOption
} from './form-element-models';
import {
  FloatLabelType,
  MatFormFieldAppearance,
  MatFormFieldModule
} from "@angular/material/form-field";
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from "@angular/material/autocomplete";
import {
  MatTooltipModule,
  TooltipPosition
} from "@angular/material/tooltip";
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from "@angular/material/button";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatSelectModule } from "@angular/material/select";
import { MatDialogModule } from "@angular/material/dialog";


export interface IMatFormEntityConfig {
  type: FormTypes;
  control: UntypedFormControl;
  label: string;
  code: string;
  flex: string;
  // options?: ISelectable[];
  options$?: Observable<ISelectable[]>;
  hint?: string;
  iconL1?: string;
  ergonomics?: MatFormErgonomicsConfig;
}

@Component({
  selector: 'lib-mat-form-entity',
  templateUrl: './mat-form-entity.component.html',
  styleUrls: ['./mat-form-entity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    MatButtonModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule
  ]
})
export class MatFormEntityComponent extends SubManager implements OnInit, OnDestroy, AfterViewInit {
  
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
    if (value) {
      this.control.disable();
      this.ghostControl?.disable();
    } else {
      this.control.enable();
      this.ghostControl?.enable();
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
  @Input() voidSelectionLabel = '/';
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
  optionsFiltered: BehaviorSubject<Array<ISelectable>> = new BehaviorSubject<Array<ISelectable>>([]);
  @Input() placeholder = '';
  @Input() label = 'Description';
  @Input() type: FormTypes = FormTypes.TEXT;
  @Input() default = false;
  @Input() iconL1?: string;
  @Input() inputmode?: AppInputMode;
  @Input() enterkeyhint?: AppEnterKeyHint;
  @Input() autofocus = false;
  @Output() enterPressed = new EventEmitter<KeyboardEvent>();
  @ViewChild('primaryInput', {read: ElementRef}) primaryInput?: ElementRef<HTMLElement>;
  
  //
  readonly autocompleteSeparatorKeysCodes: Array<number> = [ENTER, COMMA];
  
  private errorObjectNotInOptions = {[ErrorCodes.form.errorCode.custom.notInOptions]: true};
  
  hidePassword = true;

  get resolvedInputMode(): AppInputMode | null {
    if (this.inputmode) {
      return this.inputmode;
    }

    if (this.isSearchField) {
      return 'search';
    }

    switch (this.type) {
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

  get resolvedEnterKeyHint(): AppEnterKeyHint | null {
    if (this.enterkeyhint) {
      return this.enterkeyhint;
    }

    if (this.isSearchField || this.type === FormTypes.AUTOCOMPLETE || this.type === FormTypes.AUTOCOMPLETE_GROUPED) {
      return 'search';
    }

    return null;
  }
  
  ngOnDestroy(): void {
    this.control.setAsyncValidators([]);
  }

  ngAfterViewInit(): void {
    if (!this.autofocus) {
      return;
    }

    queueMicrotask(() => {
      this.primaryInput?.nativeElement.focus();
    });
  }
  
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
      if (this.dataPack.iconL1) {
        this.iconL1 = this.dataPack.iconL1;
      }
      if (this.dataPack.ergonomics?.inputmode) {
        this.inputmode = this.dataPack.ergonomics.inputmode;
      }
      if (this.dataPack.ergonomics?.enterkeyhint) {
        this.enterkeyhint = this.dataPack.ergonomics.enterkeyhint;
      }
      if (typeof this.dataPack.ergonomics?.autofocus === 'boolean') {
        this.autofocus = this.dataPack.ergonomics.autofocus;
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
              const allOptions = this.getOptionsGroupedCopy(options);
              let remainingOptions: ISelectable[];

              if (input) {
                const searchStr = isOption(input) ? input.name : (input as string);
                remainingOptions = allOptions.map(group => {
                  group.options = (group.options ?? []).filter(opt =>
                    this.autocompleteCaseSensitiveComparison
                      ? opt.name.includes(searchStr)
                      : normalizeForSearch(opt.name).includes(normalizeForSearch(searchStr))
                  );
                  return group;
                }).filter(g => g.options && g.options.length > 0);
              } else {
                remainingOptions = allOptions;
              }

              this.optionsFiltered.next(remainingOptions);
            })
        );
        
        if (this.strictAutocomplete) {
          this.safelyAddAsyncValidator(this.buildGroupedStrictValidator());
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
              this.optionsFiltered.next(this.filterFlatOptions(input, options));
            })
        );
        
        if (this.strictAutocomplete) {
          this.safelyAddAsyncValidator(this.buildFlatStrictValidator());
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
                  this.autocompleteCaseSensitiveComparison ? opt.name.includes(input) : normalizeForSearch(opt.name)
                    .includes(normalizeForSearch(input)));
                
                this.optionsFiltered.next(filtered);
                
              }
              
            })
        );
        
        if (this.strictAutocomplete) {
          this.safelyAddAsyncValidator(this.buildMultiStrictValidator());
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

  onInputEnterPressed(event: KeyboardEvent): void {
    if (this.control.disabled) {
      return;
    }

    if (this.enterkeyhint === 'next' && this.focusNextField(event.target)) {
      event.preventDefault();
      return;
    }

    this.enterPressed.emit(event);
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
  
  private filterFlatOptions(input: ISelectable | string, options: ISelectable[]): ISelectable[] {
    if (!input && input !== '') { return options; }
    const searchStr = isOption(input) ? (input as ISelectable).name : (input as string);
    return options.filter(opt =>
      this.autocompleteCaseSensitiveComparison
        ? opt.name.includes(searchStr)
        : normalizeForSearch(opt.name).includes(normalizeForSearch(searchStr))
    );
  }
  
  private buildFlatStrictValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => of(control.value).pipe(
      withLatestFrom(of(control.value), this.options$),
      map(([_, input, options]: [void, ISelectable | string, ISelectable[]]) => {
        if (options.length === 0) { return null; }
        if (typeof input === 'string') {
          return this.autocompleteCanBeVoid && input === '' ? null : this.errorObjectNotInOptions;
        }
        return options.some(y => y?.id === (input as ISelectable)?.id) ? null : this.errorObjectNotInOptions;
      })
    );
  }
  
  private buildGroupedStrictValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => of(control.value).pipe(
      withLatestFrom(of(control.value), this.options$),
      map(([_, input, options]: [void, ISelectable | string, ISelectable[]]) => {
        if (options.length === 0) { return null; }
        if (typeof input === 'string') {
          return this.autocompleteCanBeVoid && input === '' ? null : this.errorObjectNotInOptions;
        }
        const found = flatOptionGroupToArray(options).some(y => y.id === (input as ISelectable).id);
        return found ? null : this.errorObjectNotInOptions;
      })
    );
  }
  
  private buildMultiStrictValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => of(control.value).pipe(
      withLatestFrom(of(control.value), this.options$),
      map(([_, input, options]: [void, ISelectable[], ISelectable[]]) => {
        const isVoid = input.length === 0;
        if (this.autocompleteCanBeVoid && isVoid) { return null; }
        const foundAll = input.every(item => options.some(o => o.id === item.id && o.name === item.name));
        return foundAll ? null : this.errorObjectNotInOptions;
      })
    );
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

  private focusNextField(target: EventTarget | null): boolean {
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

  private get isSearchField(): boolean {
    return this.iconL1 === 'search';
  }
}
