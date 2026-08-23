import {
  UntypedFormBuilder,
  UntypedFormControl,
  Validators
} from '@angular/forms';
import {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import type { ImageCroppedEvent } from 'ngx-image-cropper';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { DbModule } from 'src/app/models/module';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import { buildUploadGuardrailAdvisory } from 'src/app/shared-interproject/upload-guardrails/upload-guardrails';
import { MODULE_FORMAT_GEOMETRY } from '../module-format-geometry.constants';
import { ModuleDetailDataService } from '../module-detail-data.service';
import {
  FormCV,
  ModuleEditorDataService,
  PendingSaveState
} from './module-editor-data.service';
import { ModuleEditorComponent } from './module-editor.component';
import { ModuleEditorCropperComponent } from './module-editor-cropper.component';
import { ModuleEditorFormStateService } from './module-editor-form-state.service';
import { ModuleEditorPanelStateService } from './module-editor-panel-state.service';

type SnackBarOpen = (
  message: string | undefined,
  action?: string,
  config?: MatSnackBarConfig
) => MatSnackBarRef<TextOnlySnackBar>;
type SnackBarDouble = MatSnackBar & {open: jasmine.Spy<SnackBarOpen>};
type ModuleEditorDataServiceDouble = ModuleEditorDataService & {
  buildCvSummary: jasmine.Spy<ModuleEditorDataService['buildCvSummary']>;
  createFormCV: jasmine.Spy<ModuleEditorDataService['createFormCV']>;
  updateFormGroupAndContainer: jasmine.Spy<ModuleEditorDataService['updateFormGroupAndContainer']>;
  buildPersistPlan: jasmine.Spy<ModuleEditorDataService['buildPersistPlan']>;
  buildCroppedPanelFile: jasmine.Spy<ModuleEditorDataService['buildCroppedPanelFile']>;
  buildGuardedCroppedPanelFile: jasmine.Spy<ModuleEditorDataService['buildGuardedCroppedPanelFile']>;
  getPreferredPanelCropFormat: jasmine.Spy<ModuleEditorDataService['getPreferredPanelCropFormat']>;
  suggestPanelTypeFromBlob: jasmine.Spy<ModuleEditorDataService['suggestPanelTypeFromBlob']>;
  touchModule$: jasmine.Spy<ModuleEditorDataService['touchModule$']>;
  syncDataSnapshotAfterSave: jasmine.Spy<ModuleEditorDataService['syncDataSnapshotAfterSave']>;
  getPendingSaveState: jasmine.Spy<ModuleEditorDataService['getPendingSaveState']>;
};
type PendingSaveStateParams = Parameters<ModuleEditorDataService['getPendingSaveState']>[0];
type SyncDataSnapshotParams = Parameters<ModuleEditorDataService['syncDataSnapshotAfterSave']>[0];
type GuardedCroppedPanelFile = Awaited<ReturnType<ModuleEditorDataService['buildGuardedCroppedPanelFile']>>;

function makeSnackBar(): SnackBarDouble {
  const open = jasmine.createSpy<SnackBarOpen>('open').and.returnValue(makeSnackBarRef());
  return Object.assign(Object.create(MatSnackBar.prototype) as MatSnackBar, {open});
}

function makeSnackBarRef(): MatSnackBarRef<TextOnlySnackBar> {
  const snackBarRef = Object.create(MatSnackBarRef.prototype) as MatSnackBarRef<TextOnlySnackBar>;
  snackBarRef.onAction = () => of(undefined);
  return snackBarRef;
}

function makeModuleDetailDataService(): ModuleDetailDataService {
  return Object.assign(Object.create(ModuleDetailDataService.prototype) as ModuleDetailDataService, {
    moduleEditorHasPendingChanges$: new BehaviorSubject<boolean>(false),
    updateSingleModuleData$: new Subject<number>(),
    isAdmin$: new BehaviorSubject<boolean>(false)
  });
}

function makeDbModule(partial: Partial<DbModule> = {}): DbModule {
  return {
    id: 1,
    name: 'Test Module',
    hp: 4,
    ins: [],
    outs: [],
    switches: [],
    manualURL: '',
    store_url: null,
    additional: null,
    isComplete: false,
    isApproved: false,
    isDIY: false,
    powerPos12: null,
    powerNeg12: null,
    powerPos5: null,
    depth: 0,
    weight: 0,
    public: true,
    manufacturer: {id: 1, name: 'Test Manufacturer'},
    manufacturerId: 1,
    standard: {id: 1, name: '3U'},
    tags: [],
    panels: [],
    description: '',
    created: '',
    updated: '',
    ...partial
  };
}

function makeModuleEditorDataService(
  preferredPanelCropFormat: 'webp' | 'jpeg' = 'webp'
): ModuleEditorDataServiceDouble {
  const methods = {
    buildCvSummary: jasmine.createSpy<ModuleEditorDataService['buildCvSummary']>('buildCvSummary')
      .and.returnValue({total: 0, editable: 0, locked: 0}),
    createFormCV: jasmine.createSpy<ModuleEditorDataService['createFormCV']>('createFormCV')
      .and.callFake((data, validatorsName, validatorsNum) => ({
        id: data.id ?? 0,
        isApproved: data.isApproved ?? false,
        name: new UntypedFormControl(data.name ?? '', validatorsName),
        a: new UntypedFormControl(data.min ?? '', validatorsNum),
        b: new UntypedFormControl(data.max ?? '', validatorsNum)
      })),
    updateFormGroupAndContainer: jasmine
      .createSpy<ModuleEditorDataService['updateFormGroupAndContainer']>('updateFormGroupAndContainer')
      .and.callFake((cvs, group, subject) => {
        Object.keys(group.controls).forEach(name => group.removeControl(name));
        cvs
          .filter(cv => !cv.isApproved)
          .forEach((cv, index) => {
            group.addControl(`name${ index }`, cv.name);
            group.addControl(`a${ index }`, cv.a);
            group.addControl(`b${ index }`, cv.b);
          });
        subject.next(cvs);
      }),
    buildPersistPlan: jasmine.createSpy<ModuleEditorDataService['buildPersistPlan']>('buildPersistPlan')
      .and.returnValue({operations: [], savedSections: []}),
    buildCroppedPanelFile: jasmine.createSpy<ModuleEditorDataService['buildCroppedPanelFile']>('buildCroppedPanelFile')
      .and.callFake((sourceFile, blob) =>
        new File([blob], `${ sourceFile.name.replace(/\.[^.]*$/, '') || 'panel' }-cropped.webp`, {
          type: blob.type || 'image/webp'
        })),
    buildGuardedCroppedPanelFile: jasmine
      .createSpy<ModuleEditorDataService['buildGuardedCroppedPanelFile']>('buildGuardedCroppedPanelFile'),
    getPreferredPanelCropFormat: jasmine
      .createSpy<ModuleEditorDataService['getPreferredPanelCropFormat']>('getPreferredPanelCropFormat')
      .and.returnValue(preferredPanelCropFormat),
    suggestPanelTypeFromBlob: jasmine.createSpy<ModuleEditorDataService['suggestPanelTypeFromBlob']>('suggestPanelTypeFromBlob')
      .and.resolveTo(1),
    touchModule$: jasmine.createSpy<ModuleEditorDataService['touchModule$']>('touchModule$').and.returnValue(of(null)),
    syncDataSnapshotAfterSave: jasmine
      .createSpy<ModuleEditorDataService['syncDataSnapshotAfterSave']>('syncDataSnapshotAfterSave')
      .and.callFake(({module}: SyncDataSnapshotParams) => module),
    getPendingSaveState: jasmine.createSpy<ModuleEditorDataService['getPendingSaveState']>('getPendingSaveState')
      .and.callFake(({powerDirty, physicalDirty, panelFileCount}: PendingSaveStateParams): PendingSaveState => ({
        ins: [],
        outs: [],
        shouldSaveInsOuts: false,
        shouldSavePower: powerDirty,
        shouldSavePhysical: physicalDirty,
        shouldSavePanel: panelFileCount > 0,
        hasPendingChanges: powerDirty || physicalDirty || panelFileCount > 0
      }))
  };
  const service = Object.assign(
    Object.create(ModuleEditorDataService.prototype) as ModuleEditorDataService,
    methods
  );
  service.buildGuardedCroppedPanelFile.and.callFake((sourceFile, blob) => Promise.resolve({
    file: service.buildCroppedPanelFile(sourceFile, blob),
    compression: {
      blob,
      widthPx: 320,
      heightPx: 640,
      attempt: null,
      advisory: buildUploadGuardrailAdvisory('module-panel', {
        byteSize: blob.size,
        widthPx: 320,
        heightPx: 640,
        mimeType: blob.type
      })
    }
  }));
  return service;
}

function makeComponent(preferredPanelCropFormat: 'webp' | 'jpeg' = 'webp') {
  const dataService = makeModuleDetailDataService();
  const snackBar = makeSnackBar();
  const fileDragHostService = new FileDragHostService(snackBar);
  const moduleEditorDataService = makeModuleEditorDataService(preferredPanelCropFormat);
  const formBuilder = new UntypedFormBuilder();
  const formState = new ModuleEditorFormStateService(formBuilder);
  const panelState = new ModuleEditorPanelStateService(moduleEditorDataService);
  const component = new ModuleEditorComponent(
    dataService,
    snackBar,
    fileDragHostService,
    moduleEditorDataService,
    formState,
    panelState
  );

  component.data = makeDbModule();

  return {component, moduleEditorDataService, fileDragHostService, snackBar, dataService};
}

function makePendingSaveState(partial: Partial<PendingSaveState> = {}): PendingSaveState {
  return {
    ins: [],
    outs: [],
    shouldSaveInsOuts: false,
    shouldSavePower: false,
    shouldSavePhysical: false,
    shouldSavePanel: false,
    hasPendingChanges: false,
    ...partial
  };
}

function makeCropEvent(blob: Blob = new Blob(['cropped'], {type: 'image/jpeg'})): ImageCroppedEvent {
  return {
    blob,
    objectUrl: 'blob:panel-preview',
    width: 320,
    height: 640,
    cropperPosition: {x1: 0, y1: 0, x2: 320, y2: 640},
    imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
  };
}

function makeDraftCv(partial: Partial<FormCV> = {}): FormCV {
  return {
    id: partial.id ?? 0,
    isApproved: partial.isApproved ?? false,
    name: partial.name ?? new UntypedFormControl('', Validators.required),
    a: partial.a ?? new UntypedFormControl(0, [Validators.min(-12), Validators.max(12)]),
    b: partial.b ?? new UntypedFormControl(5, [Validators.min(-12), Validators.max(12)])
  };
}

describe('ModuleEditorComponent power autofill', () => {
  it('fills blank sibling rails with zero after the user enters one rail', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.powerRailPositive.control.setValue(120);

    expect(component.powerRailPositive.control.value).toBe(120);
    expect(component.powerRailNegative.control.value).toBe(0);
    expect(component.powerRailFiveVolts.control.value).toBe(0);
  });

  it('does not override sibling rails that already have values', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.powerRailNegative.control.setValue(35);
    component.powerRailPositive.control.setValue(120);

    expect(component.powerRailPositive.control.value).toBe(120);
    expect(component.powerRailNegative.control.value).toBe(35);
    expect(component.powerRailFiveVolts.control.value).toBe(0);
  });

  it('does not auto-fill during initial data hydration', () => {
    const {component} = makeComponent();
    component.data = {
      ...component.data,
      powerPos12: 80,
      powerNeg12: null,
      powerPos5: null
    };

    component.ngOnInit();

    expect(component.powerRailPositive.control.value).toBe(80);
    expect(component.powerRailNegative.control.value).toBe('');
    expect(component.powerRailFiveVolts.control.value).toBe('');
  });
});

describe('ModuleEditorComponent validation messaging', () => {
  it('pinpoints the invalid power rail in the save reason', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.powerRailNegative.control.setValue(-1);
    component.formGroupPower.markAsDirty();

    expect(component.saveFabDisabledReason).toBe('Fix -12V Rail Current (mA)');
  });

  it('pinpoints the invalid physical field in the save reason', () => {
    const {component, moduleEditorDataService} = makeComponent();
    moduleEditorDataService.getPendingSaveState.and.callFake(({powerDirty, physicalDirty}: PendingSaveStateParams) => makePendingSaveState({
      shouldSavePower: powerDirty,
      shouldSavePhysical: physicalDirty,
      hasPendingChanges: powerDirty || physicalDirty
    }));
    component.ngOnInit();

    component.depth.control.setValue(-1);
    component.formGroupPhysical.markAsDirty();

    expect(component.saveFabDisabledReason).toBe('Fix Depth (mm)');
  });

  it('reports duplicate panel type explicitly', () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    moduleEditorDataService.getPendingSaveState.and.returnValue(makePendingSaveState({
      shouldSavePanel: true,
      hasPendingChanges: true
    }));
    component.ngOnInit();

    fileDragHostService.files$.next([new File(['panel'], 'panel.jpg', {type: 'image/jpeg'})]);
    component.panelTypeAlreadyExists$.next(true);
    component.duplicatePanelTypeName$.next('Light');

    expect(component.saveFabDisabledReason).toBe('Duplicate panel type: Light');
  });

  it('does not block save on duplicate panel type for admins', () => {
    const {component, moduleEditorDataService, fileDragHostService, dataService} = makeComponent();
    moduleEditorDataService.getPendingSaveState.and.returnValue(makePendingSaveState({
      shouldSavePanel: true,
      hasPendingChanges: true
    }));
    component.ngOnInit();

    dataService.isAdmin$.next(true);
    fileDragHostService.files$.next([new File(['panel'], 'panel.jpg', {type: 'image/jpeg'})]);
    component.panelTypeAlreadyExists$.next(true);
    component.duplicatePanelTypeName$.next('Light');
    component.croppedPanelFile$.next(new File(['cropped'], 'panel.jpg', {type: 'image/jpeg'}));

    expect(component.saveFabDisabledReason).toBe('');
  });

  it('pinpoints the invalid port row and field', () => {
    const {component, moduleEditorDataService, snackBar} = makeComponent();
    component.ngOnInit();

    component.INs$.next([
      makeDraftCv({
        name: new UntypedFormControl('', Validators.required)
      })
    ]);
    component.formGroupA.addControl('name0', component.INs$.value[0].name);
    moduleEditorDataService.getPendingSaveState.and.returnValue(makePendingSaveState({
      shouldSaveInsOuts: true,
      hasPendingChanges: true
    }));

    expect(component.saveFabDisabledReason).toBe('Fix Input 1 name');

    component.saveAll$.next();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Port fields need attention: Input 1 name.',
      undefined,
      jasmine.objectContaining({duration: 5000, panelClass: 'snack-error'})
    );
  });

  it('lists multiple invalid power rails together', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.powerRailPositive.control.setValue(-1);
    component.powerRailNegative.control.setValue(-2);
    component.formGroupPower.markAsDirty();

    expect(component.saveFabDisabledReason).toBe('Fix +12V Rail Current (mA), -12V Rail Current (mA)');
  });

  it('requires a local crop before panel save can proceed', () => {
    const {component, fileDragHostService} = makeComponent();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    component.ngOnInit();

    fileDragHostService.files$.next([new File(['panel'], 'panel.jpg', {type: 'image/jpeg'})]);

    expect(component.saveFabDisabledReason).toBe('Adjust panel crop');
    expect(component.isSaveFabDisabled).toBeTrue();
  });
});

describe('ModuleEditorComponent panel crop flow', () => {
  it('uses the selected file as the initial preview while waiting for the cropped file', () => {
    const {component, fileDragHostService} = makeComponent();
    const sourceFile = new File(['panel'], 'panel.jpg', {type: 'image/jpeg'});
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    component.ngOnInit();

    fileDragHostService.files$.next([sourceFile]);

    expect(component.selectedPanelSourcePreviewUrl$.value).toBe('blob:source-panel');
    expect(component.croppedPanelFile$.value).toBeUndefined();
  });

  it('locks the cropper to the same panel aspect ratio used by module rendering for each supported format', () => {
    const {component} = makeComponent();
    const expectations = [
      {id: 0, name: '3U', expectedHeightRem: MODULE_FORMAT_GEOMETRY.EURORACK_3U.heightRem},
      {id: 1, name: 'Intellijel 1U', expectedHeightRem: MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem},
      {id: 2, name: 'Pulp Logic 1U', expectedHeightRem: MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightRem}
    ];

    expectations.forEach(testCase => {
      component.data = makeDbModule({
        ...component.data,
        hp: 12,
        standard: {id: testCase.id, name: testCase.name}
      });

      expect(component.panelCropAspectRatio).toBeCloseTo(12 / testCase.expectedHeightRem, 6);
    });
  });

  describe('ModuleEditorCropperComponent', () => {
    it('delegates imperative cropper controls to the wrapped image cropper', () => {
      const component = new ModuleEditorCropperComponent();
      const keyboardEvent = new KeyboardEvent('keydown', {key: 'ArrowLeft'});
      const cropper = {
        resetCropperPosition: jasmine.createSpy('resetCropperPosition'),
        keyboardAccess: jasmine.createSpy('keyboardAccess')
      };

      Object.defineProperty(component, 'cropperComponent', {value: cropper});

      component.resetCropperPosition();
      component.keyboardAccess(keyboardEvent);

      expect(cropper.resetCropperPosition).toHaveBeenCalled();
      expect(cropper.keyboardAccess).toHaveBeenCalledOnceWith(keyboardEvent);
    });
  });

  it('prefers webp crop output when the browser supports it', () => {
    const {component} = makeComponent();

    expect(component.panelCropOutputFormat).toBe('webp');
    expect(component.panelCropOutputMimeType).toBe('image/webp');
  });

  it('falls back to jpeg crop output when webp is unavailable', () => {
    const {component} = makeComponent('jpeg');

    expect(component.panelCropOutputFormat).toBe('jpeg');
    expect(component.panelCropOutputMimeType).toBe('image/jpeg');
  });

  it('stores the locally cropped file and preview', async () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    const sourceFile = new File(['panel'], 'panel.jpg', {type: 'image/jpeg'});
    const croppedFile = new File(['cropped'], 'panel-cropped.jpg', {type: 'image/jpeg'});
    const previewUrl = 'blob:panel-preview';
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    moduleEditorDataService.buildCroppedPanelFile.and.returnValue(croppedFile);
    component.ngOnInit();

    fileDragHostService.files$.next([sourceFile]);
    await component.onPanelImageCropped(makeCropEvent(new Blob(['cropped'], {type: 'image/jpeg'})));

    expect(moduleEditorDataService.buildCroppedPanelFile).toHaveBeenCalledWith(sourceFile, jasmine.any(Blob));
    expect(component.croppedPanelFile$.value).toBe(croppedFile);
    expect(component.croppedPanelPreviewUrl$.value).toBe(previewUrl);
  });

  it('auto-suggests Dark panel type from the cropped image when the user has not overridden it', async () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    moduleEditorDataService.buildCroppedPanelFile.and.returnValue(new File(['cropped'], 'panel-cropped.jpg', {type: 'image/jpeg'}));
    moduleEditorDataService.suggestPanelTypeFromBlob.and.resolveTo(2);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    component.ngOnInit();

    fileDragHostService.files$.next([new File(['panel'], 'panel.jpg', {type: 'image/jpeg'})]);
    await component.onPanelImageCropped(makeCropEvent());
    await Promise.resolve();

    expect(component.panelType.control.value).toEqual({name: 'Dark', value: 2, id: '1'});
  });

  it('raises the visual cue when auto-detection updates the panel type', async () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    moduleEditorDataService.buildCroppedPanelFile.and.returnValue(new File(['cropped'], 'panel-cropped.jpg', {type: 'image/jpeg'}));
    moduleEditorDataService.suggestPanelTypeFromBlob.and.resolveTo(2);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    component.ngOnInit();

    fileDragHostService.files$.next([new File(['panel'], 'panel.jpg', {type: 'image/jpeg'})]);
    await component.onPanelImageCropped(makeCropEvent());
    await Promise.resolve();

    expect(component.panelTypeAutoSelectionCue$.value).toBeTrue();
  });

  it('preserves a manual panel type override after auto-detection', async () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    moduleEditorDataService.buildCroppedPanelFile.and.returnValue(new File(['cropped'], 'panel-cropped.jpg', {type: 'image/jpeg'}));
    moduleEditorDataService.suggestPanelTypeFromBlob.and.resolveTo(2);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    component.ngOnInit();

    fileDragHostService.files$.next([new File(['panel'], 'panel.jpg', {type: 'image/jpeg'})]);
    component.panelType.control.setValue({name: 'Limited edition', value: 4, id: '3'});
    await component.onPanelImageCropped(makeCropEvent());
    await Promise.resolve();

    expect(component.panelType.control.value).toEqual({name: 'Limited edition', value: 4, id: '3'});
  });

  it('ignores late auto-detection results after the user changes panel type manually', async () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    let resolveSuggestion!: (value: number) => void;
    moduleEditorDataService.buildCroppedPanelFile.and.returnValue(new File(['cropped'], 'panel-cropped.jpg', {type: 'image/jpeg'}));
    moduleEditorDataService.suggestPanelTypeFromBlob.and.returnValue(new Promise(resolve => {
      resolveSuggestion = resolve;
    }));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    component.ngOnInit();

    fileDragHostService.files$.next([new File(['panel'], 'panel.jpg', {type: 'image/jpeg'})]);
    await component.onPanelImageCropped(makeCropEvent());

    component.panelType.control.setValue({name: 'Limited edition', value: 4, id: '3'});
    resolveSuggestion(2);
    await Promise.resolve();
    await Promise.resolve();

    expect(component.panelType.control.value).toEqual({name: 'Limited edition', value: 4, id: '3'});
  });

  it('passes the cropped panel file into the existing persist plan', async () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    const sourceFile = new File(['panel'], 'panel.jpg', {type: 'image/jpeg'});
    const croppedFile = new File(['cropped'], 'panel-cropped.jpg', {type: 'image/jpeg'});
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    moduleEditorDataService.buildCroppedPanelFile.and.returnValue(croppedFile);
    moduleEditorDataService.buildPersistPlan.and.returnValue({
      operations: [of(null)],
      savedSections: ['panel']
    });
    component.ngOnInit();

    fileDragHostService.files$.next([sourceFile]);
    await component.onPanelImageCropped(makeCropEvent());

    component.saveAll$.next();

    expect(moduleEditorDataService.buildPersistPlan).toHaveBeenCalledWith(jasmine.objectContaining({
      panelFile: croppedFile
    }));
  });

  it('blocks saving an oversized compressed panel until the user confirms', async () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    const sourceFile = new File(['panel'], 'panel.jpg', {type: 'image/jpeg'});
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    moduleEditorDataService.buildPersistPlan.and.returnValue({
      operations: [of(null)],
      savedSections: ['panel']
    });
    component.ngOnInit();

    fileDragHostService.files$.next([sourceFile]);
    await component.onPanelImageCropped(makeCropEvent(
      new Blob([new Uint8Array(512 * 1024 + 1)], {type: 'image/webp'})
    ));

    expect(component.panelUploadGuardrail$.value?.requiresConfirmation).toBeTrue();
    expect(component.saveFabDisabledReason).toBe('Confirm oversized panel upload');

    component.saveAll$.next();
    expect(moduleEditorDataService.buildPersistPlan).not.toHaveBeenCalled();

    component.confirmPanelUploadGuardrail();
    expect(component.isSaveFabDisabled).toBeFalse();

    component.saveAll$.next();
    expect(moduleEditorDataService.buildPersistPlan).toHaveBeenCalledWith(jasmine.objectContaining({
      panelFile: jasmine.any(File)
    }));
  });

  it('does not allow saving the previous crop while the next crop is still compressing', async () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    const sourceFile = new File(['panel'], 'panel.jpg', {type: 'image/jpeg'});
    const firstFile = new File(['first'], 'panel-first.webp', {type: 'image/webp'});
    const secondFile = new File(['second'], 'panel-second.webp', {type: 'image/webp'});
    let resolveSecondCrop!: (result: {
      file: File;
      compression: {
        blob: Blob;
        widthPx: number;
        heightPx: number;
        attempt: null;
        advisory: ReturnType<typeof buildUploadGuardrailAdvisory>;
      };
    }) => void;
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    moduleEditorDataService.buildGuardedCroppedPanelFile.and.returnValue(Promise.resolve({
      file: firstFile,
      compression: {
        blob: firstFile,
        widthPx: 320,
        heightPx: 640,
        attempt: null,
        advisory: buildUploadGuardrailAdvisory('module-panel', {
          byteSize: firstFile.size,
          widthPx: 320,
          heightPx: 640,
          mimeType: firstFile.type
        })
      }
    }));
    moduleEditorDataService.buildPersistPlan.and.returnValue({
      operations: [of(null)],
      savedSections: ['panel']
    });
    component.ngOnInit();

    fileDragHostService.files$.next([sourceFile]);
    await component.onPanelImageCropped(makeCropEvent());
    expect(component.croppedPanelFile$.value).toBe(firstFile);

    moduleEditorDataService.buildPersistPlan.calls.reset();
    moduleEditorDataService.buildGuardedCroppedPanelFile.and.returnValue(new Promise(resolve => {
      resolveSecondCrop = resolve;
    }));
    const pendingCrop = component.onPanelImageCropped(makeCropEvent(new Blob(['second'], {type: 'image/webp'})));

    expect(component.croppedPanelFile$.value).toBeUndefined();
    expect(component.saveFabDisabledReason).toBe('Adjust panel crop');

    component.saveAll$.next();
    expect(moduleEditorDataService.buildPersistPlan).not.toHaveBeenCalled();

    resolveSecondCrop({
      file: secondFile,
      compression: {
        blob: secondFile,
        widthPx: 320,
        heightPx: 640,
        attempt: null,
        advisory: buildUploadGuardrailAdvisory('module-panel', {
          byteSize: secondFile.size,
          widthPx: 320,
          heightPx: 640,
          mimeType: secondFile.type
        })
      }
    });
    await pendingCrop;

    component.saveAll$.next();
    expect(moduleEditorDataService.buildPersistPlan).toHaveBeenCalledWith(jasmine.objectContaining({
      panelFile: secondFile
    }));
  });

  it('clears the loading state when the cropper reports readiness', () => {
    const {component, fileDragHostService} = makeComponent();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    component.ngOnInit();

    fileDragHostService.files$.next([new File(['panel'], 'panel.jpg', {type: 'image/jpeg'})]);
    expect(component.panelCropLoading$.value).toBeTrue();

    component.onPanelCropperReady();

    expect(component.panelCropLoading$.value).toBeFalse();
  });

  it('stores the current cropper selection for precision nudging', () => {
    const {component} = makeComponent();

    component.onPanelCropperChange({x1: 10, y1: 20, x2: 110, y2: 220});

    expect(component.panelCropPosition).toEqual({x1: 10, y1: 20, x2: 110, y2: 220});
  });

  it('fits the crop selection to the available image area', async () => {
    const {component} = makeComponent();
    component.onPanelCropperReady({width: 320, height: 640});
    component.data = makeDbModule({
      ...component.data,
      hp: 12,
      standard: {id: 0, name: '3U'}
    });
    await component.onPanelImageCropped(makeCropEvent());

    component.fitPanelImage();

    expect(component.panelCropPosition?.x1 ?? 0).toBeCloseTo(8.81889763779526, 6);
    expect(component.panelCropPosition?.y1 ?? 0).toBe(0);
    expect(component.panelCropPosition?.x2 ?? 0).toBeCloseTo(311.18110236220474, 6);
    expect(component.panelCropPosition?.y2 ?? 0).toBe(640);
  });

  it('fills by tightening the crop selection instead of scaling the image', async () => {
    const {component} = makeComponent();
    component.onPanelCropperReady({width: 320, height: 640});
    component.data = makeDbModule({
      ...component.data,
      hp: 12,
      standard: {id: 0, name: '3U'}
    });
    await component.onPanelImageCropped(makeCropEvent());

    component.fillPanelImage();

    expect(component.panelCropPosition?.x1 ?? 0).toBeCloseTo(36.03244094488189, 2);
    expect(component.panelCropPosition?.y1 ?? 0).toBeCloseTo(57.6, 6);
    expect(component.panelCropPosition?.x2 ?? 0).toBeCloseTo(283.9675590551181, 2);
    expect(component.panelCropPosition?.y2 ?? 0).toBeCloseTo(582.4, 6);
  });

  it('clears one-shot crop overrides after the cropper reports a new drag position', async () => {
    const {component} = makeComponent();
    component.onPanelCropperReady({width: 320, height: 640});
    component.data = makeDbModule({
      ...component.data,
      hp: 12,
      standard: {id: 0, name: '3U'}
    });
    await component.onPanelImageCropped(makeCropEvent());

    component.fillPanelImage();
    expect(component.panelCropOverride).toBeDefined();

    component.onPanelCropperChange({x1: 32, y1: 52, x2: 280, y2: 576});

    expect(component.panelCropOverride).toBeUndefined();
    expect(component.panelCropPosition).toEqual({x1: 32, y1: 52, x2: 280, y2: 576});
  });

  it('nudges the crop selection in small precision steps', () => {
    const {component} = makeComponent();
    const keyboardAccess = jasmine.createSpy<ModuleEditorCropperComponent['keyboardAccess']>('keyboardAccess');
    Object.defineProperty(component, 'panelCropper', {value: {keyboardAccess}});
    component.onPanelCropperChange({x1: 10, y1: 20, x2: 110, y2: 220});

    component.nudgePanelCrop('ArrowRight');

    expect(keyboardAccess).toHaveBeenCalled();
    expect(keyboardAccess.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      key: 'ArrowRight'
    }));
  });

  it('resets the cropper position and scale together', () => {
    const {component} = makeComponent();
    const resetCropperPosition =
      jasmine.createSpy<ModuleEditorCropperComponent['resetCropperPosition']>('resetCropperPosition');
    Object.defineProperty(component, 'panelCropper', {value: {resetCropperPosition}});
    component.onPanelCropperChange({x1: 10, y1: 20, x2: 110, y2: 220});

    component.resetPanelCropper();

    expect(component.panelCropPosition).toBeUndefined();
    expect(resetCropperPosition).toHaveBeenCalled();
  });
});
