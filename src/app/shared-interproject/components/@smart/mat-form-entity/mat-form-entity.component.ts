import {
  COMMA,
  ENTER
} from '@angular/cdk/keycodes';
import {
  AfterViewInit,
  booleanAttribute,
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
  AsyncValidatorFn,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn
} from '@angular/forms';
import type { MatChipInputEvent } from '@angular/material/chips';
import {
  BehaviorSubject,
  Observable,
  of
} from 'rxjs';
import { SubManager } from '../../../directives/subscription-manager';
import { AppFormUtils } from './app-form-utils';
import {
  AppEnterKeyHint,
  AppInputMode,
  FormTypes,
  ISelectable,
  MatFormErgonomicsConfig
} from './form-element-models';
import {
  FloatLabelType,
  MatFormFieldAppearance,
  MatFormFieldModule
} from "@angular/material/form-field";
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent
} from "@angular/material/autocomplete";
import {
  MatTooltipModule,
  TooltipPosition
} from "@angular/material/tooltip";
import { CommonModule } from '@angular/common';
import { MatButtonModule } from "@angular/material/button";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { MatSelectModule } from "@angular/material/select";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormEntityChipInputComponent } from './mat-form-entity-chip-input.component';
import { MatFormEntityDateInputComponent } from './mat-form-entity-date-input.component';
import {
  addMultiCompleteValue,
  addMultiTextValue,
  compareSelectableStrict,
  connectFormEntityValidationStreams,
  displayAutocompleteOption,
  displayPresetOption,
  focusNextField,
  FORM_ENTITY_NOT_IN_OPTIONS_ERROR,
  mapPresetOptions,
  resolveAutocompleteTypedValueOnBlur,
  resolveEnterKeyHint,
  resolveInputMode,
  removeChipValue,
  setupFormEntityType
} from './mat-form-entity.helpers';


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
    MatButtonModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatFormEntityChipInputComponent,
    MatFormEntityDateInputComponent
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
  
  disabledInput = false;
  private hasDisabledInput = false;

  @Input({ transform: booleanAttribute })
  set disabled(value: boolean) {
    this.hasDisabledInput = true;
    this.disabledInput = value;
    this.applyDisabledInput();
  }
  
  @Input()
  dataPack?: IMatFormEntityConfig;
  
  // @ts-ignore
  readonly invalid$: BehaviorSubject<boolean> = new BehaviorSubject(false);  // keep this a bsubject otherwise you will have template errors
  readonly errors$: BehaviorSubject<string> = new BehaviorSubject('');       // keep this a bsubject otherwise you will have template errors
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
  /**
   * Latest full (unfiltered) options list, kept in sync for the AUTOCOMPLETE
   * blur-reconciliation handler - see {@link onAutocompleteBlur}.
   */
  private latestOptions: ISelectable[] = [];
  @Input() placeholder = '';
  @Input() label = 'Description';
  @Input() type: FormTypes = FormTypes.TEXT;
  @Input() default = false;
  @Input() iconL1?: string;
  @Input() inputmode?: AppInputMode;
  @Input() enterkeyhint?: AppEnterKeyHint;
  @Input() autofocus = false;
  @Input({ transform: booleanAttribute }) noCapture = false;
  /** Optional preset values shown as quick-select chips when the input is focused. */
  @Input() presets: (string | number)[] = [];
  @Output() enterPressed = new EventEmitter<KeyboardEvent>();
  @ViewChild('primaryInput', {read: ElementRef}) primaryInput?: ElementRef<HTMLElement>;
  
  //
  readonly autocompleteSeparatorKeysCodes: Array<number> = [ENTER, COMMA];
  
  private errorObjectNotInOptions = FORM_ENTITY_NOT_IN_OPTIONS_ERROR;
  
  hidePassword = true;

  get presetOptions(): ISelectable[] {
    return mapPresetOptions(this.presets);
  }

  get resolvedInputMode(): AppInputMode | null {
    return resolveInputMode(this.type, this.inputmode, this.isSearchField);
  }

  get resolvedEnterKeyHint(): AppEnterKeyHint | null {
    return resolveEnterKeyHint(this.type, this.enterkeyhint, this.isSearchField);
  }

  get resolvedDisabled(): boolean {
    return this.hasDisabledInput ? this.disabledInput : !!this.control?.disabled;
  }
  
  ngOnDestroy(): void {
    this.control?.setAsyncValidators([]);
    super.ngOnDestroy();
  }

  ngAfterViewInit(): void {
    this.syncNativeDisabledState();
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
    return displayAutocompleteOption(entry);
  }

  /**
   * Display function for the preset autocomplete panel.
   *
   * The matAutocomplete trigger calls this for every writeValue, including
   * programmatic resets where the control value is a plain string or number
   * (e.g. a rack name pre-fill). Returning `entry?.name` for those would wipe
   * the displayed value, so we pass primitives through unchanged and only
   * unwrap ISelectable objects coming from the preset chip panel.
   */
  presetDisplayFunction = displayPresetOption;

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
    this.applyDisabledInput();
    connectFormEntityValidationStreams({
      control: this.control,
      options$: this.options$,
      invalid$: this.invalid$,
      errors$: this.errors$,
      errorProvider: this.errorProvider,
      detectChanges: () => this.changeDetectorRef.detectChanges(),
      manageSub: subscription => this.manageSub(subscription)
    });

    setupFormEntityType({
      type: this.type,
      hostControl: this.control,
      options$: this.options$,
      optionsFiltered: this.optionsFiltered,
      textTransformFunction: this.textTransformFunction,
      autocompleteCaseSensitiveComparison: this.autocompleteCaseSensitiveComparison,
      strictAutocomplete: this.strictAutocomplete,
      autocompleteCanBeVoid: this.autocompleteCanBeVoid,
      disableVoidSelection: this.disableVoidSelection,
      errorObjectNotInOptions: this.errorObjectNotInOptions,
      manageSub: subscription => this.manageSub(subscription),
      setGhostControl: control => this.ghostControl = control,
      safelyAddValidator: validator => this.safelyAddValidator(validator),
      safelyAddAsyncValidator: validator => this.safelyAddAsyncValidator(validator),
      checkOptions: () => this.checkOptions()
    });

    if (this.type === FormTypes.AUTOCOMPLETE || this.type === FormTypes.AUTOCOMPLETE_GROUPED) {
      this.manageSub(
        this.options$.subscribe(options => { this.latestOptions = options; })
      );
    }
    
  }
  
  /**
   * Reconciles a typed-but-never-selected autocomplete value on blur.
   * See {@link resolveAutocompleteTypedValueOnBlur} for the full rationale.
   */
  onAutocompleteBlur(): void {
    resolveAutocompleteTypedValueOnBlur({
      control: this.control,
      options: this.latestOptions,
      grouped: this.type === FormTypes.AUTOCOMPLETE_GROUPED,
      caseSensitive: this.autocompleteCaseSensitiveComparison
    });
  }
  
  compareFunctionStrictObject(o1: ISelectable, o2: ISelectable) {
    return compareSelectableStrict(o1, o2);
  }
  
  addToMultiText($event: MatChipInputEvent): void {
    const nextValue = addMultiTextValue(this.control.value, $event.value);
    if (nextValue !== this.control.value) {
      this.control.patchValue(nextValue);
    }
    if ($event.input) {
      $event.input.value = '';
    }
  }
  
  addToMultiComplete($event: MatAutocompleteSelectedEvent): void {
    const nextValue = addMultiCompleteValue(
      this.control.value,
      $event.option.value,
      this.multiChipCompleteAllowDuplicates
    );
    if (nextValue !== this.control.value) {
      this.control.patchValue(nextValue);
    }
    this.ghostControl.patchValue('');
  }
  
  removeFromChips(element: ISelectable): void {
    this.control.patchValue(removeChipValue(this.control.value, element));
  }
  
  cleanMultiComplete($event: MatChipInputEvent): void {
    $event.input.value = ''; // enough for self-cleanig of the internalForm
  }

  onInputEnterPressed(event: KeyboardEvent): void {
    if (this.control.disabled) {
      return;
    }

    if (this.enterkeyhint === 'next' && focusNextField(event.target)) {
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
    this.control.updateValueAndValidity({emitEvent: false});
  }
  
  private safelyAddAsyncValidator(newValidator: AsyncValidatorFn): void {
    const hostAsyncValidator: AsyncValidatorFn | null = this.control.asyncValidator;
    
    this.control.setAsyncValidators(hostAsyncValidator ? [
      hostAsyncValidator,
      newValidator
    ] : [newValidator]);
    this.control.updateValueAndValidity({emitEvent: false});
  }
  
  private checkOptions(): void {
    if (this.options$ === undefined) {
      console.error('Options is not observable! I\'m a selector, give me the options!');
      console.error(this.options$);
    }
  }


  private get isSearchField(): boolean {
    return this.iconL1 === 'search';
  }

  private applyDisabledInput(): void {
    if (!this.hasDisabledInput || !this.control) {
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (this.disabledInput && this.control.enabled) {
      this.control.disable();
    } else if (!this.disabledInput && this.control.disabled) {
      this.control.enable();
    }

    if (this.disabledInput && this.ghostControl?.enabled) {
      this.ghostControl.disable();
    } else if (!this.disabledInput && this.ghostControl?.disabled) {
      this.ghostControl?.enable();
    }
    this.changeDetectorRef.markForCheck();
    this.syncNativeDisabledState();
  }

  private syncNativeDisabledState(): void {
    const element = this.primaryInput?.nativeElement as HTMLInputElement | HTMLTextAreaElement | undefined;
    if (!element) {
      return;
    }
    element.disabled = this.resolvedDisabled;
    element.toggleAttribute('disabled', this.resolvedDisabled);
  }
}
