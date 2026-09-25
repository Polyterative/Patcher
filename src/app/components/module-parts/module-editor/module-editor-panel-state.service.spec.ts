import { UntypedFormControl } from '@angular/forms';
import type { ImageCroppedEvent } from 'ngx-image-cropper';
import { DbModule } from 'src/app/models/module';
import { buildUploadGuardrailAdvisory } from 'src/app/shared-interproject/upload-guardrails/upload-guardrails';
import { ModuleEditorCropperComponent } from './module-editor-cropper.component';
import { ModuleEditorDataService } from './module-editor-data.service';
import { ModuleEditorPanelStateService } from './module-editor-panel-state.service';
import { PANEL_TYPE_OPTIONS } from './module-editor.types';

const ASPECT_12HP_3U = 12 / 25.4;
const ASPECT_14HP_3U = 14 / 25.4;

function makeDataService(format: 'webp' | 'jpeg' = 'webp'): ModuleEditorDataService {
  return {
    getPreferredPanelCropFormat: () => format
  } as unknown as ModuleEditorDataService;
}

function makeService(): ModuleEditorPanelStateService {
  return new ModuleEditorPanelStateService(makeDataService());
}

function makeCropperDouble(): ModuleEditorCropperComponent & {
  resetCropperPosition: jasmine.Spy<ModuleEditorCropperComponent['resetCropperPosition']>;
  keyboardAccess: jasmine.Spy<ModuleEditorCropperComponent['keyboardAccess']>;
} {
  return {
    resetCropperPosition: jasmine.createSpy<ModuleEditorCropperComponent['resetCropperPosition']>('resetCropperPosition'),
    keyboardAccess: jasmine.createSpy<ModuleEditorCropperComponent['keyboardAccess']>('keyboardAccess')
  } as unknown as ModuleEditorCropperComponent & {
    resetCropperPosition: jasmine.Spy<ModuleEditorCropperComponent['resetCropperPosition']>;
    keyboardAccess: jasmine.Spy<ModuleEditorCropperComponent['keyboardAccess']>;
  };
}

function makeFile(name = 'panel.jpg'): File {
  return new File(['panel-bytes'], name, {type: 'image/jpeg'});
}

describe('ModuleEditorPanelStateService panel crop modes', () => {
  beforeEach(() => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-panel');
    spyOn(URL, 'revokeObjectURL');
  });

  it('derives the panel aspect ratio from hp and standard', () => {
    const service = makeService();
    const module = {hp: 14, standard: {id: 0, name: '3U'}} as DbModule;

    expect(service.getAspectRatio(module)).toBeCloseTo(ASPECT_14HP_3U, 10);
  });

  it('fits to the maximal centered box when no live cropper exists', () => {
    const service = makeService();
    service.onPanelCropperReady({width: 320, height: 640});

    service.fitPanelImage(undefined, ASPECT_12HP_3U);

    expect(service.panelCropOverride?.x1 ?? 0).toBeCloseTo(8.81889763779526, 6);
    expect(service.panelCropOverride?.y1 ?? 0).toBe(0);
    expect(service.panelCropOverride?.x2 ?? 0).toBeCloseTo(311.18110236220474, 6);
    expect(service.panelCropOverride?.y2 ?? 0).toBe(640);
    expect(service.panelCropPosition).toEqual(service.panelCropOverride);
  });

  it('returns the full frame when fitting a perfect-ratio image', () => {
    const service = makeService();
    service.onPanelCropperReady({width: 1400, height: 2540});

    service.fitPanelImage(undefined, ASPECT_14HP_3U);

    expect(service.panelCropOverride?.x1 ?? -1).toBeCloseTo(0, 6);
    expect(service.panelCropOverride?.y1 ?? -1).toBeCloseTo(0, 6);
    expect(service.panelCropOverride?.x2 ?? -1).toBeCloseTo(1400, 6);
    expect(service.panelCropOverride?.y2 ?? -1).toBeCloseTo(2540, 6);
  });

  it('delegates Fit to the live cropper reset and clears the one-shot override', () => {
    const service = makeService();
    const cropper = makeCropperDouble();
    service.onPanelCropperReady({width: 320, height: 640});
    service.fitPanelImage(undefined, ASPECT_12HP_3U);
    expect(service.panelCropOverride).toBeDefined();

    service.fitPanelImage(cropper, ASPECT_12HP_3U);

    expect(cropper.resetCropperPosition).toHaveBeenCalledTimes(1);
    expect(service.panelCropOverride).toBeUndefined();
  });

  it('does nothing on Fit before the cropper reports bounds', () => {
    const service = makeService();

    service.fitPanelImage(undefined, ASPECT_12HP_3U);

    expect(service.panelCropOverride).toBeUndefined();
    expect(service.panelCropPosition).toBeUndefined();
  });

  it('keeps the fitted box on Fill when it already fills the frame', () => {
    const service = makeService();
    service.onPanelCropperReady({width: 320, height: 640});

    service.fillPanelImage(ASPECT_12HP_3U);
    const afterFirst = {...(service.panelCropPosition as {x1: number; y1: number; x2: number; y2: number})};
    service.fillPanelImage(ASPECT_12HP_3U);

    // Fill converges on the maximal fitted box: repeated clicks are a no-op.
    expect(service.panelCropPosition?.x1 ?? 0).toBeCloseTo(8.81889763779526, 6);
    expect(service.panelCropPosition?.y1 ?? 0).toBe(0);
    expect(service.panelCropPosition?.x2 ?? 0).toBeCloseTo(311.18110236220474, 6);
    expect(service.panelCropPosition?.y2 ?? 0).toBe(640);
    expect(service.panelCropPosition).toEqual(afterFirst);
    expect(service.panelCropOverride).toEqual(service.panelCropPosition);
  });

  it('grows a smaller selection toward the frame on Fill', () => {
    const service = makeService();
    service.onPanelCropperReady({width: 400, height: 400});
    service.onPanelCropperChange({x1: 50, y1: 50, x2: 350, y2: 350});

    service.fillPanelImage(1.0);

    // 300-unit box grown by 1.22 around its center lands on (17,17,383,383).
    expect(service.panelCropPosition?.x1 ?? 0).toBeCloseTo(17, 6);
    expect(service.panelCropPosition?.y1 ?? 0).toBeCloseTo(17, 6);
    expect(service.panelCropPosition?.x2 ?? 0).toBeCloseTo(383, 6);
    expect(service.panelCropPosition?.y2 ?? 0).toBeCloseTo(383, 6);
  });

  it('does nothing on Fill before the cropper reports bounds', () => {
    const service = makeService();

    service.fillPanelImage(ASPECT_12HP_3U);

    expect(service.panelCropOverride).toBeUndefined();
    expect(service.panelCropPosition).toBeUndefined();
  });

  it('clears the selection and delegates Reset to the live cropper', () => {
    const service = makeService();
    const cropper = makeCropperDouble();
    service.onPanelCropperReady({width: 320, height: 640});
    service.fillPanelImage(ASPECT_12HP_3U);
    expect(service.panelCropPosition).toBeDefined();

    service.resetPanelCropper(cropper);

    expect(service.panelCropPosition).toBeUndefined();
    expect(service.panelCropOverride).toBeUndefined();
    expect(cropper.resetCropperPosition).toHaveBeenCalledTimes(1);
  });

  it('stores a copy of the reported cropper position and clears the override', () => {
    const service = makeService();
    service.onPanelCropperReady({width: 320, height: 640});
    service.fillPanelImage(ASPECT_12HP_3U);
    expect(service.panelCropOverride).toBeDefined();

    const reported = {x1: 32, y1: 52, x2: 280, y2: 576};
    service.onPanelCropperChange(reported);
    reported.x1 = 999;

    expect(service.panelCropPosition).toEqual({x1: 32, y1: 52, x2: 280, y2: 576});
    expect(service.panelCropOverride).toBeUndefined();
  });

  it('clears the loading flag when the cropper reports readiness', () => {
    const service = makeService();
    service.handleSelectedFile(makeFile());
    expect(service.panelCropLoading$.value).toBeTrue();

    service.onPanelCropperReady({width: 320, height: 640});

    expect(service.panelCropLoading$.value).toBeFalse();
  });

  it('drops stale crop state when a new source file is selected', () => {
    const service = makeService();
    service.onPanelCropperReady({width: 320, height: 640});
    service.onPanelCropperChange({x1: 50, y1: 50, x2: 350, y2: 350});
    service.fillPanelImage(1.0);
    expect(service.panelCropPosition).toBeDefined();
    expect(service.panelCropOverride).toBeDefined();

    service.handleSelectedFile(makeFile('second.jpg'));

    expect(service.panelCropPosition).toBeUndefined();
    expect(service.panelCropOverride).toBeUndefined();
    // Stale max bounds are gone too: Fit is a no-op until the new image is ready.
    service.fitPanelImage(undefined, 1.0);
    expect(service.panelCropPosition).toBeUndefined();

    service.onPanelCropperReady({width: 400, height: 400});
    service.fitPanelImage(undefined, 1.0);
    expect(service.panelCropPosition).toEqual({x1: 0, y1: 0, x2: 400, y2: 400});
  });

  it('resets everything when the selection is cleared', () => {
    const service = makeService();
    service.handleSelectedFile(makeFile());
    service.onPanelCropperReady({width: 320, height: 640});
    service.onPanelCropperChange({x1: 10, y1: 10, x2: 100, y2: 100});

    service.handleSelectedFile(undefined);

    expect(service.selectedPanelSourceFile$.value).toBeUndefined();
    expect(service.panelCropPosition).toBeUndefined();
    expect(service.panelCropOverride).toBeUndefined();
    expect(service.panelCropLoading$.value).toBeFalse();
  });

  it('ignores nudge requests without a selection or without a cropper', () => {
    const service = makeService();
    const cropper = makeCropperDouble();

    service.nudgePanelCrop(cropper, 'ArrowRight');
    service.onPanelCropperReady({width: 320, height: 640});
    service.onPanelCropperChange({x1: 10, y1: 20, x2: 110, y2: 220});
    service.nudgePanelCrop(undefined, 'ArrowRight');

    expect(cropper.keyboardAccess).not.toHaveBeenCalled();
  });

  it('forwards nudge requests to the live cropper', () => {
    const service = makeService();
    const cropper = makeCropperDouble();
    service.onPanelCropperChange({x1: 10, y1: 20, x2: 110, y2: 220});

    service.nudgePanelCrop(cropper, 'ArrowRight');

    expect(cropper.keyboardAccess).toHaveBeenCalledTimes(1);
    expect(cropper.keyboardAccess.calls.mostRecent().args[0])
      .toEqual(jasmine.objectContaining({key: 'ArrowRight'}));
  });
});

type GuardedCroppedPanelFile = Awaited<ReturnType<ModuleEditorDataService['buildGuardedCroppedPanelFile']>>;

function makeGuardedResult(file: File): GuardedCroppedPanelFile {
  const blob = new Blob(['cropped'], {type: 'image/webp'});
  return {
    file,
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
  };
}

function makeCropDataService(
  guardedImpl: (sourceFile: File, blob: Blob) => Promise<GuardedCroppedPanelFile>
): {
  dataService: ModuleEditorDataService;
  buildGuardedCroppedPanelFile: jasmine.Spy<ModuleEditorDataService['buildGuardedCroppedPanelFile']>;
  suggestPanelTypeFromBlob: jasmine.Spy<ModuleEditorDataService['suggestPanelTypeFromBlob']>;
} {
  const buildGuardedCroppedPanelFile =
    jasmine.createSpy<ModuleEditorDataService['buildGuardedCroppedPanelFile']>('buildGuardedCroppedPanelFile')
      .and.callFake(guardedImpl);
  const suggestPanelTypeFromBlob =
    jasmine.createSpy<ModuleEditorDataService['suggestPanelTypeFromBlob']>('suggestPanelTypeFromBlob')
      .and.resolveTo(1);
  const dataService = {
    getPreferredPanelCropFormat: () => 'webp',
    buildGuardedCroppedPanelFile,
    suggestPanelTypeFromBlob
  } as unknown as ModuleEditorDataService;
  return {dataService, buildGuardedCroppedPanelFile, suggestPanelTypeFromBlob};
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

describe('ModuleEditorPanelStateService crop lifecycle and teardown', () => {
  beforeEach(() => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-panel');
    spyOn(URL, 'revokeObjectURL');
  });

  it('maps the crop output format to the matching upload mime type', () => {
    expect(new ModuleEditorPanelStateService(makeDataService('webp')).panelCropOutputMimeType)
      .toBe('image/webp');
    expect(new ModuleEditorPanelStateService(makeDataService('jpeg')).panelCropOutputMimeType)
      .toBe('image/jpeg');
  });

  it('clears crop output without backend work when no source file is selected', async () => {
    const {dataService, buildGuardedCroppedPanelFile} =
      makeCropDataService(sourceFile => Promise.resolve(makeGuardedResult(sourceFile)));
    const service = new ModuleEditorPanelStateService(dataService);

    await service.onPanelImageCropped(makeCropEvent(), new UntypedFormControl(PANEL_TYPE_OPTIONS[0]));

    expect(buildGuardedCroppedPanelFile).not.toHaveBeenCalled();
    expect(service.croppedPanelFile$.value).toBeUndefined();
    expect(service.panelUploadGuardrail$.value).toBeNull();
    expect(service.panelUploadGuardrailConfirmed$.value).toBeFalse();
    expect(service.croppedPanelPreviewUrl$.value).toBeNull();
  });

  it('stores the guarded crop output and preview on success', async () => {
    const croppedFile = new File(['cropped'], 'panel-cropped.webp', {type: 'image/webp'});
    const {dataService} =
      makeCropDataService(() => Promise.resolve(makeGuardedResult(croppedFile)));
    const service = new ModuleEditorPanelStateService(dataService);
    service.handleSelectedFile(makeFile());
    expect(service.panelCropLoading$.value).toBeTrue();

    await service.onPanelImageCropped(makeCropEvent(), new UntypedFormControl(PANEL_TYPE_OPTIONS[0]));

    expect(service.croppedPanelFile$.value).toBe(croppedFile);
    expect(service.croppedPanelPreviewUrl$.value).toBe('blob:panel-preview');
    expect(service.panelCropLoading$.value).toBeFalse();
    expect(service.panelCropLoadFailed$.value).toBeFalse();
  });

  it('flags load failure and clears the crop when guardrail preparation rejects', async () => {
    const {dataService} =
      makeCropDataService(() => Promise.reject(new Error('compress boom')));
    const service = new ModuleEditorPanelStateService(dataService);
    service.handleSelectedFile(makeFile());
    spyOn(console, 'error');

    await service.onPanelImageCropped(makeCropEvent(), new UntypedFormControl(PANEL_TYPE_OPTIONS[0]));

    expect(service.croppedPanelFile$.value).toBeUndefined();
    expect(service.panelUploadGuardrail$.value).toBeNull();
    expect(service.panelCropLoading$.value).toBeFalse();
    expect(service.panelCropLoadFailed$.value).toBeTrue();
    expect(service.croppedPanelPreviewUrl$.value).toBeNull();
  });

  it('only confirms guardrailed uploads that require confirmation', () => {
    const service = makeService();
    service.panelUploadGuardrail$.next(buildUploadGuardrailAdvisory('module-panel', {
      byteSize: 1024,
      widthPx: 320,
      heightPx: 640,
      mimeType: 'image/webp'
    }));

    service.confirmPanelUploadGuardrail();

    expect(service.panelUploadGuardrailConfirmed$.value).toBeFalse();

    service.panelUploadGuardrail$.next(buildUploadGuardrailAdvisory('module-panel', {
      byteSize: 600 * 1024,
      widthPx: 320,
      heightPx: 640,
      mimeType: 'image/webp'
    }));

    service.confirmPanelUploadGuardrail();

    expect(service.panelUploadGuardrailConfirmed$.value).toBeTrue();
  });

  it('clears previews and flags when the source image fails to load, then recovers', () => {
    const service = makeService();
    service.handleSelectedFile(makeFile());
    expect(service.selectedPanelSourcePreviewUrl$.value).toBe('blob:mock-panel');

    service.onPanelImageLoadFailed();

    expect(service.panelCropLoading$.value).toBeFalse();
    expect(service.panelCropLoadFailed$.value).toBeTrue();
    expect(service.selectedPanelSourcePreviewUrl$.value).toBeNull();
    expect(service.croppedPanelPreviewUrl$.value).toBeNull();

    service.onPanelImageLoaded();

    expect(service.panelCropLoadFailed$.value).toBeFalse();
  });

  it('resets the full crop state on dispose and tolerates repeated disposal', () => {
    const service = makeService();
    service.handleSelectedFile(makeFile());
    service.onPanelCropperReady({width: 320, height: 640});
    service.onPanelCropperChange({x1: 10, y1: 10, x2: 100, y2: 100});

    service.dispose();
    service.dispose();

    expect(service.selectedPanelSourceFile$.value).toBeUndefined();
    expect(service.panelCropPosition).toBeUndefined();
    expect(service.panelCropOverride).toBeUndefined();
    expect(service.panelUploadGuardrail$.value).toBeNull();
    expect(service.panelCropLoading$.value).toBeFalse();
    expect(service.panelCropLoadFailed$.value).toBeFalse();
  });

  it('ignores auto-detection after a manual panel type change', async () => {
    const {dataService, suggestPanelTypeFromBlob} = makeCropDataService(sourceFile =>
      Promise.resolve(makeGuardedResult(sourceFile)));
    suggestPanelTypeFromBlob.and.resolveTo(2);
    const service = new ModuleEditorPanelStateService(dataService);
    const panelTypeControl = new UntypedFormControl(PANEL_TYPE_OPTIONS[0]);
    service.handleSelectedFile(makeFile());
    service.handlePanelTypeControlChange();

    await service.onPanelImageCropped(makeCropEvent(), panelTypeControl);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(panelTypeControl.value).toEqual(PANEL_TYPE_OPTIONS[0]);
    expect(service.panelTypeAutoSelectionCue$.value).toBeFalse();
  });
});
