import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import type {
  CropperPosition,
  Dimensions,
  ImageCroppedEvent
} from 'ngx-image-cropper';
import {
  BehaviorSubject,
  combineLatest,
  concat,
  EMPTY,
  Observable,
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
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import { UploadGuardrailAdvisory } from 'src/app/shared-interproject/upload-guardrails/upload-guardrails';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { ModuleDetailDataService } from '../module-detail-data.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  FormCV,
  ModuleEditorDataService,
  PendingSaveState
} from './module-editor-data.service';
import { ModuleEditorCropperComponent } from './module-editor-cropper.component';
import { ModuleEditorFormStateService } from './module-editor-form-state.service';
import { ModuleEditorPanelStateService } from './module-editor-panel-state.service';
import {
  CvSectionKind,
  PanelCropOutputFormat,
  ValidationFeedback
} from './module-editor.types';
import {
  buildSaveFabState,
  getModuleEditorValidationFeedback,
  SaveFabState
} from './module-editor-validation.utils';

@Component({
  selector: 'app-module-editor',
  templateUrl: './module-editor.component.html',
  styleUrls: ['./module-editor.component.scss'],
  providers: [FileDragHostService, ModuleEditorDataService, ModuleEditorFormStateService, ModuleEditorPanelStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleEditorComponent extends SubManager implements OnInit, OnDestroy {
  @Input() data: DbModule;

  readonly saveAll$ = new Subject<void>();
  readonly saveInProgress$ = new BehaviorSubject<boolean>(false);
  readonly saveJustCompleted$ = new BehaviorSubject<boolean>(false);
  readonly removeIN$ = new Subject<number>();
  readonly removeOUT$ = new Subject<number>();
  readonly addIN$ = new Subject<CV>();
  readonly addOUT$ = new Subject<CV>();
  readonly INs$ = new BehaviorSubject<FormCV[]>([]);
  readonly OUTs$ = new BehaviorSubject<FormCV[]>([]);
  readonly inSummary$ = this.INs$.pipe(map(cvs => this.moduleEditorDataService.buildCvSummary(cvs)));
  readonly outSummary$ = this.OUTs$.pipe(map(cvs => this.moduleEditorDataService.buildCvSummary(cvs)));
  readonly selectedPanelSourceFile$: BehaviorSubject<File | undefined>;
  readonly selectedPanelSourcePreviewUrl$: BehaviorSubject<string | null>;
  readonly croppedPanelFile$: BehaviorSubject<File | undefined>;
  readonly croppedPanelPreviewUrl$: BehaviorSubject<string | null>;
  readonly panelUploadGuardrail$: BehaviorSubject<UploadGuardrailAdvisory | null>;
  readonly panelUploadGuardrailConfirmed$: BehaviorSubject<boolean>;
  readonly panelCropLoading$: BehaviorSubject<boolean>;
  readonly panelCropLoadFailed$: BehaviorSubject<boolean>;
  readonly panelCropPosition$: BehaviorSubject<CropperPosition | undefined>;
  readonly panelTypeAutoSelectionCue$: BehaviorSubject<boolean>;
  readonly panelCropOutputFormat: PanelCropOutputFormat;
  readonly panelCropOutputQuality: number;
  readonly hasPendingChanges$: Observable<boolean>;

  formGroupA: UntypedFormGroup; formGroupB: UntypedFormGroup; formGroupPanel: UntypedFormGroup;
  formGroupPower: UntypedFormGroup; formGroupPhysical: UntypedFormGroup;
  panelDescription: IMatFormEntityConfig; panelType: IMatFormEntityConfig;
  powerRailPositive: IMatFormEntityConfig; powerRailNegative: IMatFormEntityConfig; powerRailFiveVolts: IMatFormEntityConfig;
  weight: IMatFormEntityConfig; depth: IMatFormEntityConfig;
  panelTypeAlreadyExists$ = new BehaviorSubject<boolean>(false);
  duplicatePanelTypeName$ = new BehaviorSubject<string>('');

  private readonly _existingPanelColors$ = new BehaviorSubject<Set<number>>(new Set());
  private saveCompletedTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @ViewChild(ModuleEditorCropperComponent) private panelCropper?: ModuleEditorCropperComponent;

  constructor(
    public dataService: ModuleDetailDataService,
    public snackBar: MatSnackBar,
    public fileDragHostService: FileDragHostService,
    private readonly moduleEditorDataService: ModuleEditorDataService,
    private readonly formState: ModuleEditorFormStateService,
    private readonly panelState: ModuleEditorPanelStateService
  ) {
    super();
    this.bindFormState();
    this.selectedPanelSourceFile$ = this.panelState.selectedPanelSourceFile$;
    this.selectedPanelSourcePreviewUrl$ = this.panelState.selectedPanelSourcePreviewUrl$;
    this.croppedPanelFile$ = this.panelState.croppedPanelFile$;
    this.croppedPanelPreviewUrl$ = this.panelState.croppedPanelPreviewUrl$;
    this.panelUploadGuardrail$ = this.panelState.panelUploadGuardrail$;
    this.panelUploadGuardrailConfirmed$ = this.panelState.panelUploadGuardrailConfirmed$;
    this.panelCropLoading$ = this.panelState.panelCropLoading$;
    this.panelCropLoadFailed$ = this.panelState.panelCropLoadFailed$;
    this.panelCropPosition$ = this.panelState.panelCropPosition$;
    this.panelTypeAutoSelectionCue$ = this.panelState.panelTypeAutoSelectionCue$;
    this.panelCropOutputFormat = this.panelState.panelCropOutputFormat;
    this.panelCropOutputQuality = this.panelState.panelCropOutputQuality;
    this.hasPendingChanges$ = this.buildHasPendingChanges$();
    this.initializeSubscriptions();
  }

  private bindFormState(): void {
    this.formGroupA = this.formState.formGroupA; this.formGroupB = this.formState.formGroupB;
    this.formGroupPanel = this.formState.formGroupPanel; this.formGroupPower = this.formState.formGroupPower;
    this.formGroupPhysical = this.formState.formGroupPhysical; this.panelDescription = this.formState.panelDescription;
    this.panelType = this.formState.panelType; this.powerRailPositive = this.formState.powerRailPositive;
    this.powerRailNegative = this.formState.powerRailNegative; this.powerRailFiveVolts = this.formState.powerRailFiveVolts;
    this.weight = this.formState.weight; this.depth = this.formState.depth;
  }

  get panelCropOutputMimeType(): string { return this.panelState.panelCropOutputMimeType; }
  get panelCropAspectRatio(): number { return this.panelState.getAspectRatio(this.data); }
  get panelCropPosition(): CropperPosition | undefined { return this.panelState.panelCropPosition; }
  get panelCropOverride(): CropperPosition | undefined { return this.panelState.panelCropOverride; }

  ngOnInit(): void {
    if (this.data) {
      this.hydrateCvSections();
      this.formState.hydrateModule(this.data);
    } else {
      console.error('Data input is undefined.');
    }

    this.initializeExistingPanelColors();
    this.markEditorFormsPristine();
    this.formState.markPowerAutofillReady();
  }

  ngOnDestroy(): void {
    if (this.saveCompletedTimeoutId) {
      clearTimeout(this.saveCompletedTimeoutId);
      this.saveCompletedTimeoutId = null;
    }
    this.panelState.dispose();
    this.dataService.moduleEditorHasPendingChanges$.next(false);
    super.ngOnDestroy();
  }

  onPanelImageCropped(event: ImageCroppedEvent): Promise<void> { return this.panelState.onPanelImageCropped(event, this.panelType.control); }
  onPanelImageLoaded(): void { this.panelState.onPanelImageLoaded(); }
  onPanelCropperReady(dimensions?: Dimensions): void { this.panelState.onPanelCropperReady(dimensions); }
  onPanelCropperChange(position: CropperPosition): void { this.panelState.onPanelCropperChange(position); }
  onPanelImageLoadFailed(): void { this.panelState.onPanelImageLoadFailed(); }
  fitPanelImage(): void { this.panelState.fitPanelImage(this.panelCropper, this.panelCropAspectRatio); }
  fillPanelImage(): void { this.panelState.fillPanelImage(this.panelCropper, this.panelCropAspectRatio); }
  resetPanelCropper(): void { this.panelState.resetPanelCropper(this.panelCropper); }
  confirmPanelUploadGuardrail(): void { this.panelState.confirmPanelUploadGuardrail(); }

  nudgePanelCrop(direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): void {
    this.panelState.nudgePanelCrop(this.panelCropper, direction);
  }

  get saveFabState(): SaveFabState {
    const pendingState = this.getPendingSaveState();
    return buildSaveFabState(
      this.saveInProgress$.value,
      this.saveJustCompleted$.value,
      pendingState,
      this.getValidationFeedback(pendingState)
    );
  }

  get isSaveFabDisabled(): boolean { return this.saveFabState.disabled; }
  get saveFabLabel(): string { return this.saveFabState.label; }
  get saveFabIcon(): string { return this.saveFabState.icon; }
  get saveFabAriaLabel(): string { return this.saveFabState.ariaLabel; }
  get saveFabDisabledReason(): string { return this.saveFabState.disabledReason; }

  private buildHasPendingChanges$(): Observable<boolean> {
    return combineLatest([
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
  }

  private initializeSubscriptions(): void {
    this.addIN$
      .pipe(this.takeUntilDestroyed())
      .subscribe(cv => this.addCv(cv, 'IN'));

    this.addOUT$
      .pipe(this.takeUntilDestroyed())
      .subscribe(cv => this.addCv(cv, 'OUT'));

    this.removeIN$
      .pipe(this.takeUntilDestroyed())
      .subscribe(index => this.removeCvWithUndo(index, 'IN'));

    this.removeOUT$
      .pipe(this.takeUntilDestroyed())
      .subscribe(index => this.removeCvWithUndo(index, 'OUT'));

    this.saveAll$
      .pipe(
        filter(() => !this.saveInProgress$.value),
        switchMap(() => this.persistAllChanges$()),
        this.takeUntilDestroyed()
      )
      .subscribe();

    this.hasPendingChanges$
      .pipe(this.takeUntilDestroyed())
      .subscribe(hasPending => this.dataService.moduleEditorHasPendingChanges$.next(hasPending));

    this.panelType.control.valueChanges
      .pipe(
        startWith(this.panelType.control.value),
        withLatestFrom(this.panelType.options$),
        this.takeUntilDestroyed()
      )
      .subscribe(([panelTypeValue, options]) => {
        this.panelState.handlePanelTypeControlChange();
        const descValue = this.panelDescription.control.value;
        const isDefaultDescription = options.map(option => option.name).includes(descValue);

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
        .pipe(this.takeUntilDestroyed())
        .subscribe(value => this.formState.autoFillBlankPowerRails(control, value));
    });

    combineLatest([
      this.panelType.control.valueChanges.pipe(startWith(this.panelType.control.value)),
      this._existingPanelColors$
    ])
      .pipe(this.takeUntilDestroyed())
      .subscribe(([panelTypeValue, existingColors]) => {
        const selectedColor: number = panelTypeValue?.value;
        const isDuplicate = existingColors.has(selectedColor);
        this.panelTypeAlreadyExists$.next(isDuplicate);
        this.duplicatePanelTypeName$.next(isDuplicate ? panelTypeValue?.name ?? '' : '');
      });

    this.fileDragHostService.files$
      .pipe(
        map(files => files[0]),
        distinctUntilChanged(),
        this.takeUntilDestroyed()
      )
      .subscribe(file => this.panelState.handleSelectedFile(file));
  }

  private hydrateCvSections(): void {
    if (Array.isArray(this.data.ins)) {
      this.data.ins.forEach(cv => this.addIN$.next(cv));
    }
    if (Array.isArray(this.data.outs)) {
      this.data.outs.forEach(cv => this.addOUT$.next(cv));
    }
  }

  private initializeExistingPanelColors(): void {
    if (this.data?.panels) {
      this._existingPanelColors$.next(new Set(this.data.panels.map(p => p.color)));
    }

    const initialColor: number = this.panelType.control.value?.value;
    const initialColors = this._existingPanelColors$.value;
    if (initialColors.has(initialColor)) {
      this.panelTypeAlreadyExists$.next(true);
      this.duplicatePanelTypeName$.next(this.panelType.control.value?.name ?? '');
    }
  }

  private addCv(cv: CV, section: CvSectionKind): void {
    const source$ = section === 'IN' ? this.INs$ : this.OUTs$;
    const group = section === 'IN' ? this.formGroupA : this.formGroupB;
    const formCVs = [
      ...source$.value,
      this.moduleEditorDataService.createFormCV(cv, this.formState.validatorsName, this.formState.validatorsNum)
    ];
    this.moduleEditorDataService.updateFormGroupAndContainer(formCVs, group, source$);
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
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        const restored = [...source$.value];
        const restoredIndex = Math.min(index, restored.length);
        restored.splice(restoredIndex, 0, cv);
        this.moduleEditorDataService.updateFormGroupAndContainer(restored, group, source$);
      });
  }

  private persistAllChanges$(): Observable<unknown> {
    const pendingState = this.getPendingSaveState();
    const validationFeedback = this.getValidationFeedback(pendingState);
    if (validationFeedback.disabledReason) {
      SharedConstants.errorCustom(this.snackBar, validationFeedback.errorMessage || validationFeedback.disabledReason);
      return EMPTY;
    }

    if (!pendingState.hasPendingChanges) {
      SharedConstants.successCustom(this.snackBar, 'No pending changes to save.');
      return EMPTY;
    }

    const {operations, savedSections} = this.moduleEditorDataService.buildPersistPlan({
      module: this.data,
      pendingState,
      powerPos12: this.powerRailPositive.control.value,
      powerNeg12: this.powerRailNegative.control.value,
      powerPos5: this.powerRailFiveVolts.control.value,
      weight: this.weight.control.value,
      depth: this.depth.control.value,
      panelFile: this.croppedPanelFile$.value,
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
        tap((saved: string[]) => this.afterSuccessfulSave(pendingState, saved))
      );
  }

  private afterSuccessfulSave(pendingState: PendingSaveState, saved: string[]): void {
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
    this.panelState.resetPanelCropState();
    this.dataService.moduleEditorHasPendingChanges$.next(false);
    this.dataService.updateSingleModuleData$.next(this.data.id);
    this.showSaveCompletedState();
    SharedConstants.successCustom(this.snackBar, `Saved ${ saved.join(', ') }.`);
  }

  private getValidationFeedback(pendingState: PendingSaveState): ValidationFeedback {
    return getModuleEditorValidationFeedback({
      pendingState,
      formGroupA: this.formGroupA,
      formGroupB: this.formGroupB,
      formGroupPower: this.formGroupPower,
      formGroupPhysical: this.formGroupPhysical,
      formIns: this.INs$.value,
      formOuts: this.OUTs$.value,
      panelFields: [this.panelType, this.panelDescription],
      powerFields: [
        this.powerRailPositive,
        this.powerRailNegative,
        this.powerRailFiveVolts
      ],
      physicalFields: [
        this.depth,
        this.weight
      ],
      panelTypeAlreadyExists: this.panelTypeAlreadyExists$.value,
      duplicatePanelTypeName: this.duplicatePanelTypeName$.value,
      panelCropLoadFailed: this.panelCropLoadFailed$.value,
      croppedPanelFile: this.croppedPanelFile$.value,
      panelUploadGuardrailRequiresConfirmation: this.panelUploadGuardrail$.value?.requiresConfirmation ?? false,
      panelUploadGuardrailConfirmed: this.panelUploadGuardrailConfirmed$.value,
      panelSaveBlocked: this.isPanelSaveBlocked()
    });
  }

  private markEditorFormsPristine(): void {
    this.formState.markEditorFormsPristine(this.INs$.value, this.OUTs$.value);
  }

  private isPanelSaveBlocked(): boolean {
    const shouldSavePanel = (this.fileDragHostService.files$.value?.length ?? 0) > 0;
    const guardrailRequiresConfirmation = this.panelUploadGuardrail$.value?.requiresConfirmation ?? false;
    // Admins may overwrite an existing panel of the same type in one Save action, so a
    // duplicate panel type only blocks Save for non-admin users.
    const duplicateBlocksSave = this.panelTypeAlreadyExists$.value && !this.dataService.isAdmin$.value;
    return shouldSavePanel
      && (
        this.formGroupPanel.invalid
        || duplicateBlocksSave
        || this.panelCropLoadFailed$.value
        || !this.croppedPanelFile$.value
        || (guardrailRequiresConfirmation && !this.panelUploadGuardrailConfirmed$.value)
      );
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
}
