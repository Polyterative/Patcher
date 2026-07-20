import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import type {
  CropperPosition,
  Dimensions,
  ImageCroppedEvent
} from 'ngx-image-cropper';
import { BehaviorSubject } from 'rxjs';
import { DbModule } from 'src/app/models/module';
import {
  ModulePanelUploadMimeType
} from 'src/app/shared-interproject/upload-guardrails/browser-image-compression';
import { UploadGuardrailAdvisory } from 'src/app/shared-interproject/upload-guardrails/upload-guardrails';
import { getModulePanelAspectRatio } from '../get-module-height-for-standard.pipe';
import { ModuleEditorCropperComponent } from './module-editor-cropper.component';
import { ModuleEditorDataService } from './module-editor-data.service';
import {
  buildFittedPanelCropPosition,
  PANEL_CROP_FILL_SCALE,
  PANEL_TYPE_OPTIONS,
  PanelCropOutputFormat,
  scalePanelCropPosition
} from './module-editor.types';

@Injectable()
export class ModuleEditorPanelStateService {
  readonly panelCropOutputFormat: PanelCropOutputFormat;
  readonly panelCropOutputQuality = 95;
  readonly selectedPanelSourceFile$ = new BehaviorSubject<File | undefined>(undefined);
  readonly selectedPanelSourcePreviewUrl$ = new BehaviorSubject<string | null>(null);
  readonly croppedPanelFile$ = new BehaviorSubject<File | undefined>(undefined);
  readonly croppedPanelPreviewUrl$ = new BehaviorSubject<string | null>(null);
  readonly panelUploadGuardrail$ = new BehaviorSubject<UploadGuardrailAdvisory | null>(null);
  readonly panelUploadGuardrailConfirmed$ = new BehaviorSubject<boolean>(false);
  readonly panelCropLoading$ = new BehaviorSubject<boolean>(false);
  readonly panelCropLoadFailed$ = new BehaviorSubject<boolean>(false);
  readonly panelCropPosition$ = new BehaviorSubject<CropperPosition | undefined>(undefined);
  readonly panelTypeAutoSelectionCue$ = new BehaviorSubject<boolean>(false);

  private panelTypeAutoSelectionCueTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private panelCropperMaxBounds?: CropperPosition;
  private pendingPanelCropOverride?: CropperPosition;
  private panelTypeAutoSelectionEnabled = true;
  private suppressPanelTypeManualOverride = false;
  private panelTypeSuggestionRequestId = 0;
  private panelCropFileRequestId = 0;
  private activePanelSourcePreviewUrl: string | null = null;
  private activeCroppedPanelPreviewUrl: string | null = null;

  constructor(private readonly moduleEditorDataService: ModuleEditorDataService) {
    this.panelCropOutputFormat = this.moduleEditorDataService.getPreferredPanelCropFormat();
  }

  get panelCropOutputMimeType(): ModulePanelUploadMimeType {
    return this.panelCropOutputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
  }

  get panelCropPosition(): CropperPosition | undefined {
    return this.panelCropPosition$.value;
  }

  get panelCropOverride(): CropperPosition | undefined {
    return this.pendingPanelCropOverride;
  }

  getAspectRatio(module: DbModule): number {
    return getModulePanelAspectRatio(module);
  }

  handlePanelTypeControlChange(): void {
    if (this.selectedPanelSourceFile$.value && !this.suppressPanelTypeManualOverride) {
      this.panelTypeAutoSelectionEnabled = false;
    }
  }

  handleSelectedFile(file: File | undefined): void {
    if (!file) {
      this.resetPanelCropState();
      return;
    }

    this.selectedPanelSourceFile$.next(file);
    this.croppedPanelFile$.next(undefined);
    this.panelUploadGuardrail$.next(null);
    this.panelUploadGuardrailConfirmed$.next(false);
    this.panelTypeAutoSelectionEnabled = true;
    this.panelTypeSuggestionRequestId++;
    this.panelCropFileRequestId++;
    this.panelCropLoadFailed$.next(false);
    this.panelCropLoading$.next(true);
    this.replacePanelSourcePreviewUrl(this.tryCreateObjectUrl(file));
    this.replaceCroppedPanelPreviewUrl(null);
  }

  async onPanelImageCropped(event: ImageCroppedEvent, panelTypeControl: UntypedFormControl): Promise<void> {
    const sourceFile = this.selectedPanelSourceFile$.value;
    if (!sourceFile || !event.blob) {
      this.croppedPanelFile$.next(undefined);
      this.panelUploadGuardrail$.next(null);
      this.panelUploadGuardrailConfirmed$.next(false);
      this.replaceCroppedPanelPreviewUrl(null);
      return;
    }

    const requestId = ++this.panelCropFileRequestId;
    this.croppedPanelFile$.next(undefined);
    this.panelUploadGuardrail$.next(null);
    this.panelUploadGuardrailConfirmed$.next(false);
    try {
      const result = await this.moduleEditorDataService.buildGuardedCroppedPanelFile(
        sourceFile,
        event.blob,
        this.panelCropOutputMimeType
      );
      if (requestId !== this.panelCropFileRequestId) {
        return;
      }

      this.croppedPanelFile$.next(result.file);
      this.panelUploadGuardrail$.next(result.compression.advisory);
      this.panelCropLoadFailed$.next(false);
      this.panelCropLoading$.next(false);
      this.replaceCroppedPanelPreviewUrl(event.objectUrl ?? this.tryCreateObjectUrl(event.blob));
      if (this.panelTypeAutoSelectionEnabled) {
        void this.autoSelectPanelType(event.blob, panelTypeControl);
      }
    } catch (error) {
      if (requestId !== this.panelCropFileRequestId) {
        return;
      }
      console.error('Panel upload guardrail preparation failed:', error);
      this.croppedPanelFile$.next(undefined);
      this.panelUploadGuardrail$.next(null);
      this.panelUploadGuardrailConfirmed$.next(false);
      this.panelCropLoading$.next(false);
      this.panelCropLoadFailed$.next(true);
      this.replaceCroppedPanelPreviewUrl(null);
    }
  }

  confirmPanelUploadGuardrail(): void {
    if (this.panelUploadGuardrail$.value?.requiresConfirmation) {
      this.panelUploadGuardrailConfirmed$.next(true);
    }
  }

  onPanelImageLoaded(): void {
    this.panelCropLoadFailed$.next(false);
  }

  onPanelCropperReady(dimensions?: Dimensions): void {
    if (dimensions) {
      this.panelCropperMaxBounds = {
        x1: 0,
        y1: 0,
        x2: dimensions.width,
        y2: dimensions.height
      };
    }
    this.panelCropLoading$.next(false);
  }

  onPanelCropperChange(position: CropperPosition): void {
    this.panelCropPosition$.next({...position});
    this.pendingPanelCropOverride = undefined;
  }

  onPanelImageLoadFailed(): void {
    this.croppedPanelFile$.next(undefined);
    this.panelCropLoading$.next(false);
    this.panelCropLoadFailed$.next(true);
    this.replacePanelSourcePreviewUrl(null);
    this.replaceCroppedPanelPreviewUrl(null);
  }

  fitPanelImage(panelCropper: ModuleEditorCropperComponent | undefined, aspectRatio: number): void {
    if (panelCropper) {
      this.pendingPanelCropOverride = undefined;
      panelCropper.resetCropperPosition();
      return;
    }

    if (!this.panelCropperMaxBounds) {
      return;
    }

    this.applyPanelCropPreset(this.buildFittedPanelCropPosition(this.panelCropperMaxBounds, aspectRatio));
  }

  fillPanelImage(panelCropper: ModuleEditorCropperComponent | undefined, aspectRatio: number): void {
    const maxBounds = this.panelCropperMaxBounds;
    if (!maxBounds) {
      return;
    }

    if (panelCropper) {
      this.pendingPanelCropOverride = undefined;
      panelCropper.resetCropperPosition();
    }

    const basePosition = this.panelCropPosition$.value ?? this.buildFittedPanelCropPosition(maxBounds, aspectRatio);
    this.applyPanelCropPreset(
      scalePanelCropPosition(basePosition, PANEL_CROP_FILL_SCALE, maxBounds, aspectRatio)
    );
  }

  resetPanelCropper(panelCropper: ModuleEditorCropperComponent | undefined): void {
    this.pendingPanelCropOverride = undefined;
    this.panelCropPosition$.next(undefined);
    panelCropper?.resetCropperPosition();
  }

  nudgePanelCrop(
    panelCropper: ModuleEditorCropperComponent | undefined,
    direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  ): void {
    if (!this.panelCropPosition$.value || !panelCropper) {
      return;
    }
    panelCropper.keyboardAccess(this.buildCropperKeyboardEvent(direction));
  }

  resetPanelCropState(): void {
    this.selectedPanelSourceFile$.next(undefined);
    this.replacePanelSourcePreviewUrl(null);
    this.croppedPanelFile$.next(undefined);
    this.panelTypeSuggestionRequestId++;
    this.panelCropFileRequestId++;
    this.panelTypeAutoSelectionEnabled = true;
    this.panelCropperMaxBounds = undefined;
    this.pendingPanelCropOverride = undefined;
    this.panelCropPosition$.next(undefined);
    this.panelUploadGuardrail$.next(null);
    this.panelUploadGuardrailConfirmed$.next(false);
    this.panelCropLoading$.next(false);
    this.panelCropLoadFailed$.next(false);
    this.replaceCroppedPanelPreviewUrl(null);
  }

  dispose(): void {
    if (this.panelTypeAutoSelectionCueTimeoutId) {
      clearTimeout(this.panelTypeAutoSelectionCueTimeoutId);
      this.panelTypeAutoSelectionCueTimeoutId = null;
    }
    this.resetPanelCropState();
  }

  private replacePanelSourcePreviewUrl(nextUrl: string | null): void {
    if (this.activePanelSourcePreviewUrl && this.activePanelSourcePreviewUrl !== nextUrl) {
      URL.revokeObjectURL(this.activePanelSourcePreviewUrl);
    }

    this.activePanelSourcePreviewUrl = nextUrl;
    this.selectedPanelSourcePreviewUrl$.next(nextUrl);
  }

  private replaceCroppedPanelPreviewUrl(nextUrl: string | null): void {
    if (this.activeCroppedPanelPreviewUrl && this.activeCroppedPanelPreviewUrl !== nextUrl) {
      URL.revokeObjectURL(this.activeCroppedPanelPreviewUrl);
    }

    this.activeCroppedPanelPreviewUrl = nextUrl;
    this.croppedPanelPreviewUrl$.next(nextUrl);
  }

  private tryCreateObjectUrl(file: Blob | undefined): string | null {
    if (!(file instanceof Blob)) {
      return null;
    }
    return URL.createObjectURL(file);
  }

  private applyPanelCropPreset(position: CropperPosition): void {
    const nextPosition = {...position};
    this.pendingPanelCropOverride = nextPosition;
    this.panelCropPosition$.next(nextPosition);
  }

  private buildFittedPanelCropPosition(imagePosition: CropperPosition, aspectRatio: number): CropperPosition {
    return buildFittedPanelCropPosition(imagePosition, aspectRatio);
  }

  private async autoSelectPanelType(blob: Blob, panelTypeControl: UntypedFormControl): Promise<void> {
    try {
      const requestId = ++this.panelTypeSuggestionRequestId;
      const suggestedValue = await this.moduleEditorDataService.suggestPanelTypeFromBlob(blob);

      if (!this.panelTypeAutoSelectionEnabled || requestId !== this.panelTypeSuggestionRequestId) {
        return;
      }

      const nextOption = PANEL_TYPE_OPTIONS.find(option => option.value === suggestedValue);
      if (!nextOption || panelTypeControl.value?.value === nextOption.value) {
        return;
      }

      this.suppressPanelTypeManualOverride = true;
      panelTypeControl.patchValue(nextOption);
      this.suppressPanelTypeManualOverride = false;
      this.triggerPanelTypeAutoSelectionCue();
    } catch (error) {
      console.error('Panel appearance analysis failed:', error);
      this.suppressPanelTypeManualOverride = false;
    }
  }

  private triggerPanelTypeAutoSelectionCue(): void {
    this.panelTypeAutoSelectionCue$.next(false);

    if (this.panelTypeAutoSelectionCueTimeoutId) {
      clearTimeout(this.panelTypeAutoSelectionCueTimeoutId);
    }

    this.panelTypeAutoSelectionCue$.next(true);
    this.panelTypeAutoSelectionCueTimeoutId = setTimeout(() => {
      this.panelTypeAutoSelectionCue$.next(false);
      this.panelTypeAutoSelectionCueTimeoutId = null;
    }, 900);
  }

  private buildCropperKeyboardEvent(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): KeyboardEvent {
    return {
      key,
      shiftKey: false,
      altKey: false,
      preventDefault: () => undefined,
      stopPropagation: () => undefined
    } as KeyboardEvent;
  }
}
