import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  BehaviorSubject,
  combineLatest,
  concat,
  EMPTY,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  finalize,
  last,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { ModuleDetailDataService } from '../module-detail-data.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  FormCV,
  ModuleEditorDataService,
  PendingSaveState
} from './module-editor-data.service';


type CvSectionKind = 'IN' | 'OUT';


@Component({
  selector: 'app-module-editor',
  templateUrl: './module-editor.component.html',
  styleUrls: ['./module-editor.component.scss'],
  providers: [FileDragHostService, ModuleEditorDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleEditorComponent implements OnInit, OnDestroy {
  
  // Inputs
  @Input() data: DbModule;
  
  // Subjects and Observables
  readonly saveAll$ = new Subject<void>();
  readonly saveInProgress$ = new BehaviorSubject<boolean>(false);
  readonly saveJustCompleted$ = new BehaviorSubject<boolean>(false);
  
  removeIN$ = new Subject<number>();
  removeOUT$ = new Subject<number>();
  addIN$ = new Subject<CV>();
  addOUT$ = new Subject<CV>();
  
  INs$ = new BehaviorSubject<FormCV[]>([]);
  OUTs$ = new BehaviorSubject<FormCV[]>([]);
  inSummary$ = this.INs$.pipe(map(cvs => this.moduleEditorDataService.buildCvSummary(cvs)));
  outSummary$ = this.OUTs$.pipe(map(cvs => this.moduleEditorDataService.buildCvSummary(cvs)));
  
  /** Tracks panel color values already present on this module. */
  private _existingPanelColors$ = new BehaviorSubject<Set<number>>(new Set());
  /** True when the currently selected panel type already exists on the module. */
  panelTypeAlreadyExists$ = new BehaviorSubject<boolean>(false);
  /** The human-readable name of the duplicate panel type, for display in the warning. */
  duplicatePanelTypeName$ = new BehaviorSubject<string>('');
  readonly hasPendingChanges$: Observable<boolean>;
  private saveCompletedTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private powerAutofillReady = false;
  
  protected destroyEvent$ = new Subject<void>();
  
  // Forms and FormGroups
  formGroupA: UntypedFormGroup;
  formGroupB: UntypedFormGroup;
  formGroupPanel: UntypedFormGroup;
  formGroupPower: UntypedFormGroup;
  formGroupPhysical: UntypedFormGroup;
  
  panelDescription: IMatFormEntityConfig;
  panelType: IMatFormEntityConfig;
  
  powerRailPositive: IMatFormEntityConfig;
  powerRailNegative: IMatFormEntityConfig;
  powerRailFiveVolts: IMatFormEntityConfig;
  
  weight: IMatFormEntityConfig;
  depth: IMatFormEntityConfig;
  
  // Validators
  private validatorsNum = Validators.compose([
    Validators.max(12),
    Validators.min(-12)
  ]);
  
  private validatorsName = Validators.compose([
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(36)
  ]);
  
  private validatorsPower = Validators.compose([
    Validators.required,
    Validators.min(0),
    Validators.max(2000)
  ]);
  
  // Other properties
  types = FormTypes;
  
  constructor(
    public formBuilder: UntypedFormBuilder,
    public dataService: ModuleDetailDataService,
    public snackBar: MatSnackBar,
    public fileDragHostService: FileDragHostService,
    private readonly moduleEditorDataService: ModuleEditorDataService
  ) {
    this.initializeFormControls();
    this.initializeFormGroups();
    this.hasPendingChanges$ = combineLatest([
      this.formGroupA.valueChanges.pipe(startWith(this.formGroupA.value)),
      this.formGroupB.valueChanges.pipe(startWith(this.formGroupB.value)),
      this.formGroupPower.valueChanges.pipe(startWith(this.formGroupPower.value)),
      this.formGroupPhysical.valueChanges.pipe(startWith(this.formGroupPhysical.value)),
      this.INs$,
      this.OUTs$,
      this.fileDragHostService.files$
    ]).pipe(
      map(() => this.getPendingSaveState().hasPendingChanges),
      distinctUntilChanged(),
      shareReplay(1)
    );
    this.initializeSubscriptions();
  }
  
  ngOnInit(): void {
    this.powerAutofillReady = false;
    if (this.data) {
      if (Array.isArray(this.data.ins)) {
        this.data.ins.forEach(cv => this.addIN$.next(cv));
      }
      if (Array.isArray(this.data.outs)) {
        this.data.outs.forEach(cv => this.addOUT$.next(cv));
      }
      
      // Initialize power form controls with data if available
      if (this.data.powerPos12 != null) {
        this.powerRailPositive.control.setValue(this.data.powerPos12);
      }
      
      if (this.data.powerNeg12 != null) {
        this.powerRailNegative.control.setValue(this.data.powerNeg12);
      }
      
      if (this.data.powerPos5 != null) {
        this.powerRailFiveVolts.control.setValue(this.data.powerPos5);
      }
      
      // Initialize physical form controls with data if available
      if (this.data.weight != null) {
        this.weight.control.setValue(this.data.weight);
      }
      
      if (this.data.depth != null) {
        this.depth.control.setValue(this.data.depth);
      }
      
    } else {
      console.error('Data input is undefined.');
    }
    
    // Initialize existing panel colors for duplicate detection
    if (this.data?.panels) {
      this._existingPanelColors$.next(new Set(this.data.panels.map(p => p.color)));
    }
    
    // Eagerly compute initial duplicate state so the warning renders on first load
    const initialColor: number = this.panelType.control.value?.value;
    const initialColors = this._existingPanelColors$.value;
    if (initialColors.has(initialColor)) {
      this.panelTypeAlreadyExists$.next(true);
      this.duplicatePanelTypeName$.next(this.panelType.control.value?.name ?? '');
    }

    this.markEditorFormsPristine();
    this.powerAutofillReady = true;
  }
  
  ngOnDestroy(): void {
    if (this.saveCompletedTimeoutId) {
      clearTimeout(this.saveCompletedTimeoutId);
      this.saveCompletedTimeoutId = null;
    }
    this.dataService.moduleEditorHasPendingChanges$.next(false);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  private initializeFormControls(): void {
    // Panel form controls
    this.panelDescription = {
      code: 'panelDescription',
      label: 'Panel Description',
      type: FormTypes.TEXT,
      control: new UntypedFormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(144)
      ]),
      flex: 'auto'
    };
    
    this.panelType = {
      code: 'panelType',
      label: 'Panel Type',
      type: FormTypes.SELECT,
      control: new UntypedFormControl(
        {
          name: 'Light',
          value: 1,
          id: '0'
        },
        [Validators.required]
      ),
      options$: of([
        {name: 'Light', value: 1, id: '0'},
        {name: 'Dark', value: 2, id: '1'},
        {name: 'Special edition', value: 3, id: '2'},
        {name: 'Limited edition', value: 4, id: '3'}
      ]),
      flex: 'auto'
    };
    
    // Power form controls
    this.powerRailPositive = {
      code: 'powerRailPositive',
      label: '+12V Rail Current (mA)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', this.validatorsPower),
      flex: 'auto'
    };
    
    this.powerRailNegative = {
      code: 'powerRailNegative',
      label: '-12V Rail Current (mA)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', this.validatorsPower),
      flex: 'auto'
    };
    
    this.powerRailFiveVolts = {
      code: 'powerRailFiveVolts',
      label: '+5V Rail Current (mA)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', this.validatorsPower),
      flex: 'auto'
    };
    
    // Depth and weight form controls
    this.weight = {
      code: 'weight',
      label: 'Weight (g)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', [
        Validators.min(0),
        Validators.max(2000)
      ]),
      flex: 'auto',
      iconL1: 'fitness_center'
    };
    
    this.depth = {
      code: 'depth',
      label: 'Depth (mm)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', [
        Validators.min(0),
        Validators.max(500)
      ]),
      flex: 'auto',
      iconL1: 'vertical_align_center'
    };
  }
  
  private initializeFormGroups(): void {
    this.formGroupPanel = this.formBuilder.group({
      panelDescription: this.panelDescription.control,
      panelType: this.panelType.control
    });
    
    this.formGroupPower = this.formBuilder.group({
      powerRailPositive: this.powerRailPositive.control,
      powerRailNegative: this.powerRailNegative.control,
      powerRailFiveVolts: this.powerRailFiveVolts.control
    });
    
    this.formGroupA = this.formBuilder.group({});
    this.formGroupB = this.formBuilder.group({});
    
    this.formGroupPhysical = this.formBuilder.group({
      weight: this.weight.control,
      depth: this.depth.control
    });
  }
  
  private initializeSubscriptions(): void {
    // Subscriptions for adding INs
    this.addIN$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(cv => {
        const formCVs = [...this.INs$.value, this.moduleEditorDataService.createFormCV(cv, this.validatorsName, this.validatorsNum)];
        this.moduleEditorDataService.updateFormGroupAndContainer(formCVs, this.formGroupA, this.INs$);
      });
    
    // Subscriptions for adding OUTs
    this.addOUT$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(cv => {
        const formCVs = [...this.OUTs$.value, this.moduleEditorDataService.createFormCV(cv, this.validatorsName, this.validatorsNum)];
        this.moduleEditorDataService.updateFormGroupAndContainer(formCVs, this.formGroupB, this.OUTs$);
      });
    
    // Subscriptions for removing INs
    this.removeIN$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(index => {
        this.removeCvWithUndo(index, 'IN');
      });
    
    // Subscriptions for removing OUTs
    this.removeOUT$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(index => {
        this.removeCvWithUndo(index, 'OUT');
      });
    
    this.saveAll$
      .pipe(
        filter(() => !this.saveInProgress$.value),
        switchMap(() => this.persistAllChanges$()),
        takeUntil(this.destroyEvent$)
      )
      .subscribe();

    this.hasPendingChanges$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(hasPending => this.dataService.moduleEditorHasPendingChanges$.next(hasPending));
    
    // Subscription for panelType control value changes
    this.panelType.control.valueChanges
      .pipe(
        takeUntil(this.destroyEvent$),
        startWith(this.panelType.control.value),
        withLatestFrom(this.panelType.options$)
      )
      .subscribe(([panelTypeValue, options]) => {
        const descValue = this.panelDescription.control.value;
        const isDefaultDescription = options
          .map(option => option.name)
          .includes(descValue);
        
        if (!descValue || isDefaultDescription) {
          this.panelDescription.control.patchValue(panelTypeValue.name);
        }
      });

    [
      this.powerRailPositive.control,
      this.powerRailNegative.control,
      this.powerRailFiveVolts.control
    ].forEach(control => {
      control.valueChanges
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(value => this.autoFillBlankPowerRails(control, value));
    });
    
    // Duplicate panel type detection: update panelTypeAlreadyExists$ when panel type selection or existing panels change
    combineLatest([
      this.panelType.control.valueChanges.pipe(startWith(this.panelType.control.value)),
      this._existingPanelColors$
    ])
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(([panelTypeValue, existingColors]) => {
        const selectedColor: number = panelTypeValue?.value;
        const isDuplicate = existingColors.has(selectedColor);
        this.panelTypeAlreadyExists$.next(isDuplicate);
        this.duplicatePanelTypeName$.next(isDuplicate ? panelTypeValue?.name ?? '' : '');
      });
    
  }

  private persistAllChanges$(): Observable<unknown> {
    const pendingState = this.getPendingSaveState();
    
    const blockReason = this.getValidationBlockReason(pendingState);
    if (blockReason) {
      const msgMap: Record<string, string> = {
        'Fix invalid input/output rows': 'Input/output rows have invalid values — check CV names and voltage ranges.',
        'Fix invalid power fields': 'Power form has invalid values — check the fields and try again.',
        'Fix invalid physical fields': 'Physical form has invalid values — check the fields and try again.',
        'Fix panel selection or duplicate panel type': pendingState.shouldSavePanel && this.panelTypeAlreadyExists$.value
          ? `This module already has a "${ this.duplicatePanelTypeName$.value }" panel.`
          : 'Panel fields are invalid — check panel type and description.'
      };
      SharedConstants.errorCustom(this.snackBar, msgMap[blockReason] ?? blockReason);
      return EMPTY;
    }

    if (!pendingState.hasPendingChanges) {
      SharedConstants.successCustom(this.snackBar, 'No pending changes to save.');
      return EMPTY;
    }

    const {
      operations,
      savedSections
    } = this.moduleEditorDataService.buildPersistPlan({
      module: this.data,
      pendingState,
      powerPos12: this.powerRailPositive.control.value,
      powerNeg12: this.powerRailNegative.control.value,
      powerPos5: this.powerRailFiveVolts.control.value,
      weight: this.weight.control.value,
      depth: this.depth.control.value,
      panelFile: this.fileDragHostService.files$.value[0],
      panelTypeValue: this.panelType.control.value,
      panelDescription: this.panelDescription.control.value
    });

    this.saveInProgress$.next(true);
    return concat(...operations, this.moduleEditorDataService.touchModule$(this.data.id))
      .pipe(
        last(),
        map((): string[] => savedSections),
        catchError((error): Observable<string[]> => {
          console.error('Error saving module editor changes:', error);
          if (error && error.message && error.message.includes('duplicate key value violates')) {
            SharedConstants.errorCustom(this.snackBar, 'Panel already exists for this module — upload a different image or remove the existing one first.');
          } else {
            SharedConstants.errorCustom(this.snackBar, 'Changes not saved — the server returned an error. Try again.');
          }
          return EMPTY;
        }),
        finalize(() => this.saveInProgress$.next(false)),
        tap((saved: string[]) => {
          this.data = this.moduleEditorDataService.syncDataSnapshotAfterSave({
            module: this.data,
            pendingState,
            powerPos12: this.powerRailPositive.control.value,
            powerNeg12: this.powerRailNegative.control.value,
            powerPos5: this.powerRailFiveVolts.control.value,
            weight: this.weight.control.value,
            depth: this.depth.control.value
          });
          this.markEditorFormsPristine();
          this.fileDragHostService.removeAllFiles$.emit();
          this.dataService.moduleEditorHasPendingChanges$.next(false);
          this.dataService.updateSingleModuleData$.next(this.data.id);
          this.showSaveCompletedState();
          SharedConstants.successCustom(this.snackBar, `Saved ${ saved.join(', ') }.`);
        })
      );
  }
  
  /** Single source-of-truth for the save FAB — avoids recalculating pendingState four times. */
  get saveFabState(): {
    disabled: boolean;
    label: string;
    icon: string;
    ariaLabel: string;
    disabledReason: string
  } {
    if (this.saveInProgress$.value) {
      return {disabled: true, label: 'Saving...', icon: 'sync', ariaLabel: 'Saving module editor changes', disabledReason: 'Save in progress'};
    }
    if (this.saveJustCompleted$.value) {
      return {disabled: false, label: 'Saved', icon: 'check', ariaLabel: 'Changes saved', disabledReason: ''};
    }

    const pendingState = this.getPendingSaveState();
    const reason = this.getValidationBlockReason(pendingState);
    
    if (reason) {
      return {disabled: true, label: 'Save', icon: 'save', ariaLabel: `Save disabled: ${ reason }`, disabledReason: reason};
    }
    if (!pendingState.hasPendingChanges) {
      return {disabled: true, label: 'No changes', icon: 'save', ariaLabel: 'No pending changes', disabledReason: 'No pending changes'};
    }
    return {disabled: false, label: 'Save', icon: 'save', ariaLabel: 'Save all pending module editor changes', disabledReason: ''};
  }
  
  get isSaveFabDisabled(): boolean {
    return this.saveFabState.disabled;
  }
  
  get saveFabLabel(): string {
    return this.saveFabState.label;
  }
  
  get saveFabIcon(): string {
    return this.saveFabState.icon;
  }
  
  get saveFabAriaLabel(): string {
    return this.saveFabState.ariaLabel;
  }
  
  get saveFabDisabledReason(): string {
    return this.saveFabState.disabledReason;
  }
  
  /** Returns a human-readable reason why saving is blocked, or '' if it's allowed. */
  private getValidationBlockReason(pendingState: PendingSaveState): string {
    if (pendingState.shouldSaveInsOuts && (!this.formGroupA.valid || !this.formGroupB.valid)) {
      return 'Fix invalid input/output rows';
    }
    if (pendingState.shouldSavePower && !this.formGroupPower.valid) {
      return 'Fix invalid power fields';
    }
    if (pendingState.shouldSavePhysical && !this.formGroupPhysical.valid) {
      return 'Fix invalid physical fields';
    }
    if (pendingState.shouldSavePanel && this.isPanelSaveBlocked()) {
      return 'Fix panel selection or duplicate panel type';
    }
    return '';
  }


  private markEditorFormsPristine(): void {
    [this.formGroupPower, this.formGroupPhysical, this.formGroupPanel, this.formGroupA, this.formGroupB]
      .forEach(g => g.markAsPristine());
    
    [...this.INs$.value, ...this.OUTs$.value].forEach(cv => {
      cv.name.markAsPristine();
      cv.a.markAsPristine();
      cv.b.markAsPristine();
    });
  }

  private isPanelSaveBlocked(): boolean {
    const shouldSavePanel = (this.fileDragHostService.files$.value?.length ?? 0) > 0;
    return shouldSavePanel && (this.formGroupPanel.invalid || this.panelTypeAlreadyExists$.value);
  }


  private showSaveCompletedState(): void {
    this.saveJustCompleted$.next(true);
    if (this.saveCompletedTimeoutId) {
      clearTimeout(this.saveCompletedTimeoutId);
    }
    this.saveCompletedTimeoutId = setTimeout(() => {
      this.saveJustCompleted$.next(false);
      this.saveCompletedTimeoutId = null;
    }, 1400);
  }

  private removeCvWithUndo(index: number, section: CvSectionKind): void {
    const source$ = section === 'IN' ? this.INs$ : this.OUTs$;
    const group = section === 'IN' ? this.formGroupA : this.formGroupB;
    const formCVs = [...source$.value];
    const cv = formCVs[index];

    if (!cv) {
      return;
    }

    formCVs.splice(index, 1);
    this.moduleEditorDataService.updateFormGroupAndContainer(formCVs, group, source$);

    const cvLabel = (cv.name.value || '').trim() || 'Unnamed CV';
    const snackRef = this.snackBar.open(`${ section } "${ cvLabel }" removed.`, 'Undo', {duration: 5000});

    snackRef
      .onAction()
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(() => {
        const restored = [...source$.value];
        const restoredIndex = Math.min(index, restored.length);
        restored.splice(restoredIndex, 0, cv);
        this.moduleEditorDataService.updateFormGroupAndContainer(restored, group, source$);
      });
  }

  private getPendingSaveState(): PendingSaveState {
    return this.moduleEditorDataService.getPendingSaveState({
      module: this.data,
      formIns: this.INs$.value,
      formOuts: this.OUTs$.value,
      powerDirty: this.formGroupPower.dirty,
      physicalDirty: this.formGroupPhysical.dirty,
      panelFileCount: this.fileDragHostService.files$.value?.length ?? 0
    });
  }

  private autoFillBlankPowerRails(changedControl: UntypedFormControl, value: unknown): void {
    if (!this.powerAutofillReady || value === '' || value === null || value === undefined) {
      return;
    }

    [
      this.powerRailPositive.control,
      this.powerRailNegative.control,
      this.powerRailFiveVolts.control
    ]
      .filter(control => control !== changedControl && (control.value === '' || control.value === null || control.value === undefined))
      .forEach(control => control.setValue(0, {emitEvent: false}));
  }
}
