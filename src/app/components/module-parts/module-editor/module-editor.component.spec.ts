import {
  UntypedFormBuilder,
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { MODULE_FORMAT_GEOMETRY } from '../module-format-geometry.constants';
import { FormCV } from './module-editor-data.service';
import { ModuleEditorComponent } from './module-editor.component';

function makeComponent(preferredPanelCropFormat: 'webp' | 'jpeg' = 'webp') {
  const dataService = {
    moduleEditorHasPendingChanges$: new BehaviorSubject<boolean>(false),
    updateSingleModuleData$: new Subject<number>()
  };
  const fileDragHostService = {
    files$: new BehaviorSubject<File[]>([]),
    removeAllFiles$: {emit: jasmine.createSpy('removeAllFiles.emit')}
  };
  const moduleEditorDataService = {
    buildCvSummary: jasmine.createSpy('buildCvSummary').and.returnValue({total: 0, editable: 0, locked: 0}),
    createFormCV: jasmine.createSpy('createFormCV'),
    updateFormGroupAndContainer: jasmine.createSpy('updateFormGroupAndContainer'),
    buildPersistPlan: jasmine.createSpy('buildPersistPlan').and.returnValue({operations: [], savedSections: []}),
    buildCroppedPanelFile: jasmine.createSpy('buildCroppedPanelFile'),
    getPreferredPanelCropFormat: jasmine.createSpy('getPreferredPanelCropFormat').and.returnValue(preferredPanelCropFormat),
    suggestPanelTypeFromBlob: jasmine.createSpy('suggestPanelTypeFromBlob').and.resolveTo(1),
    touchModule$: jasmine.createSpy('touchModule$').and.returnValue(of(null)),
    syncDataSnapshotAfterSave: jasmine.createSpy('syncDataSnapshotAfterSave').and.callFake(({module}: any) => module),
    getPendingSaveState: jasmine.createSpy('getPendingSaveState').and.callFake(({powerDirty, panelFileCount}: any) => ({
      ins: [],
      outs: [],
      shouldSaveInsOuts: false,
      shouldSavePower: powerDirty,
      shouldSavePhysical: false,
      shouldSavePanel: panelFileCount > 0,
      hasPendingChanges: powerDirty || panelFileCount > 0
    }))
  };

  const component = new ModuleEditorComponent(
    new UntypedFormBuilder(),
    dataService as any,
    {open: jasmine.createSpy('open')} as any,
    fileDragHostService as any,
    moduleEditorDataService as any
  );

  component.data = {
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
    depth: null,
    weight: null,
    public: true,
    manufacturer: {id: 1, name: 'Test Manufacturer'},
    manufacturerId: 1,
    standard: {id: 1, name: '3U'},
    tags: [],
    panels: [],
    description: '',
    created: '',
    updated: ''
  } as any;

  return {component, moduleEditorDataService, fileDragHostService};
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
    moduleEditorDataService.getPendingSaveState.and.callFake(({powerDirty, physicalDirty}: any) => ({
      ins: [],
      outs: [],
      shouldSaveInsOuts: false,
      shouldSavePower: powerDirty,
      shouldSavePhysical: physicalDirty,
      shouldSavePanel: false,
      hasPendingChanges: powerDirty || physicalDirty
    }));
    component.ngOnInit();

    component.depth.control.setValue(-1);
    component.formGroupPhysical.markAsDirty();

    expect(component.saveFabDisabledReason).toBe('Fix Depth (mm)');
  });

  it('reports duplicate panel type explicitly', () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    moduleEditorDataService.getPendingSaveState.and.returnValue({
      ins: [],
      outs: [],
      shouldSaveInsOuts: false,
      shouldSavePower: false,
      shouldSavePhysical: false,
      shouldSavePanel: true,
      hasPendingChanges: true
    });
    component.ngOnInit();

    fileDragHostService.files$.next([{} as File]);
    component.panelTypeAlreadyExists$.next(true);
    component.duplicatePanelTypeName$.next('Light');

    expect(component.saveFabDisabledReason).toBe('Duplicate panel type: Light');
  });

  it('pinpoints the invalid port row and field', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.INs$.next([
      makeDraftCv({
        name: new UntypedFormControl('', Validators.required)
      })
    ]);
    component.formGroupA.addControl('name0', component.INs$.value[0].name);

    const feedback = (component as any).getValidationFeedback({
      ins: [],
      outs: [],
      shouldSaveInsOuts: true,
      shouldSavePower: false,
      shouldSavePhysical: false,
      shouldSavePanel: false,
      hasPendingChanges: true
    });

    expect(feedback.disabledReason).toBe('Fix Input 1 name');
    expect(feedback.errorMessage).toBe('Port fields need attention: Input 1 name.');
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
      component.data = {
        ...component.data,
        hp: 12,
        standard: {id: testCase.id, name: testCase.name}
      } as any;

      expect(component.panelCropAspectRatio).toBeCloseTo(12 / testCase.expectedHeightRem, 6);
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

  it('stores the locally cropped file and preview', () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    const sourceFile = new File(['panel'], 'panel.jpg', {type: 'image/jpeg'});
    const croppedFile = new File(['cropped'], 'panel-cropped.jpg', {type: 'image/jpeg'});
    const previewUrl = 'blob:panel-preview';
    spyOn(URL, 'createObjectURL').and.returnValue('blob:source-panel');
    moduleEditorDataService.buildCroppedPanelFile.and.returnValue(croppedFile);
    component.ngOnInit();

    fileDragHostService.files$.next([sourceFile]);
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: previewUrl,
      width: 320,
      height: 640,
      cropperPosition: {x1: 0, y1: 0, x2: 320, y2: 640},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });

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
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: 'blob:panel-preview',
      width: 320,
      height: 640,
      cropperPosition: {x1: 0, y1: 0, x2: 320, y2: 640},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });
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
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: 'blob:panel-preview',
      width: 320,
      height: 640,
      cropperPosition: {x1: 0, y1: 0, x2: 320, y2: 640},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });
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
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: 'blob:panel-preview',
      width: 320,
      height: 640,
      cropperPosition: {x1: 0, y1: 0, x2: 320, y2: 640},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });
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
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: 'blob:panel-preview',
      width: 320,
      height: 640,
      cropperPosition: {x1: 0, y1: 0, x2: 320, y2: 640},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });

    component.panelType.control.setValue({name: 'Limited edition', value: 4, id: '3'});
    resolveSuggestion(2);
    await Promise.resolve();
    await Promise.resolve();

    expect(component.panelType.control.value).toEqual({name: 'Limited edition', value: 4, id: '3'});
  });

  it('passes the cropped panel file into the existing persist plan', () => {
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
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: 'blob:panel-preview',
      width: 320,
      height: 640,
      cropperPosition: {x1: 0, y1: 0, x2: 320, y2: 640},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });

    component.saveAll$.next();

    expect(moduleEditorDataService.buildPersistPlan).toHaveBeenCalledWith(jasmine.objectContaining({
      panelFile: croppedFile
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

  it('fits the crop selection to the available image area', () => {
    const {component} = makeComponent();
    component.onPanelCropperReady({width: 320, height: 640});
    component.data = {
      ...component.data,
      hp: 12,
      standard: {id: 0, name: '3U'}
    } as any;
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: 'blob:panel-preview',
      width: 320,
      height: 640,
      cropperPosition: {x1: 40, y1: 40, x2: 160, y2: 300},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });

    component.fitPanelImage();

    expect(component.panelCropPosition?.x1 ?? 0).toBeCloseTo(8.81889763779526, 6);
    expect(component.panelCropPosition?.y1 ?? 0).toBe(0);
    expect(component.panelCropPosition?.x2 ?? 0).toBeCloseTo(311.18110236220474, 6);
    expect(component.panelCropPosition?.y2 ?? 0).toBe(640);
  });

  it('fills by tightening the crop selection instead of scaling the image', () => {
    const {component} = makeComponent();
    component.onPanelCropperReady({width: 320, height: 640});
    component.data = {
      ...component.data,
      hp: 12,
      standard: {id: 0, name: '3U'}
    } as any;
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: 'blob:panel-preview',
      width: 320,
      height: 640,
      cropperPosition: {x1: 10, y1: 20, x2: 310, y2: 620},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });

    component.fillPanelImage();

    expect(component.panelCropPosition?.x1 ?? 0).toBeCloseTo(36.03244094488189, 2);
    expect(component.panelCropPosition?.y1 ?? 0).toBeCloseTo(57.6, 6);
    expect(component.panelCropPosition?.x2 ?? 0).toBeCloseTo(283.9675590551181, 2);
    expect(component.panelCropPosition?.y2 ?? 0).toBeCloseTo(582.4, 6);
  });

  it('clears one-shot crop overrides after the cropper reports a new drag position', () => {
    const {component} = makeComponent();
    component.onPanelCropperReady({width: 320, height: 640});
    component.data = {
      ...component.data,
      hp: 12,
      standard: {id: 0, name: '3U'}
    } as any;
    component.onPanelImageCropped({
      blob: new Blob(['cropped'], {type: 'image/jpeg'}),
      objectUrl: 'blob:panel-preview',
      width: 320,
      height: 640,
      cropperPosition: {x1: 10, y1: 20, x2: 310, y2: 620},
      imagePosition: {x1: 0, y1: 0, x2: 320, y2: 640}
    });

    component.fillPanelImage();
    expect(component.panelCropOverride).toBeDefined();

    component.onPanelCropperChange({x1: 32, y1: 52, x2: 280, y2: 576});

    expect(component.panelCropOverride).toBeUndefined();
    expect(component.panelCropPosition).toEqual({x1: 32, y1: 52, x2: 280, y2: 576});
  });

  it('nudges the crop selection in small precision steps', () => {
    const {component} = makeComponent();
    const keyboardAccess = jasmine.createSpy('keyboardAccess');
    (component as any).panelCropper = {keyboardAccess};
    component.onPanelCropperChange({x1: 10, y1: 20, x2: 110, y2: 220});

    component.nudgePanelCrop('ArrowRight');

    expect(keyboardAccess).toHaveBeenCalled();
    expect(keyboardAccess.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      key: 'ArrowRight'
    }));
  });

  it('resets the cropper position and scale together', () => {
    const {component} = makeComponent();
    const resetCropperPosition = jasmine.createSpy('resetCropperPosition');
    (component as any).panelCropper = {resetCropperPosition};
    component.onPanelCropperChange({x1: 10, y1: 20, x2: 110, y2: 220});

    component.resetPanelCropper();

    expect(component.panelCropPosition).toBeUndefined();
    expect(resetCropperPosition).toHaveBeenCalled();
  });
});
