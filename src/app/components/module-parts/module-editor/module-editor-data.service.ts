import { Injectable } from '@angular/core';
import {
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn
} from '@angular/forms';
import {
  BehaviorSubject,
  EMPTY,
  from,
  Observable,
  of
} from 'rxjs';
import {
  switchMap,
  withLatestFrom
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';


export interface FormCV {
  id: number;
  name: UntypedFormControl;
  a: UntypedFormControl;
  b: UntypedFormControl;
  isApproved: boolean;
}

export interface CvSectionSummary {
  total: number;
  editable: number;
  locked: number;
}

export interface PendingSaveState {
  ins: CV[];
  outs: CV[];
  shouldSaveInsOuts: boolean;
  shouldSavePower: boolean;
  shouldSavePhysical: boolean;
  shouldSavePanel: boolean;
  hasPendingChanges: boolean;
}

interface PanelAppearanceMetrics {
  averageLuminance: number;
  averageSaturation: number;
  colorfulPixelRatio: number;
}

type DecodedPanelImage = ImageBitmap | HTMLImageElement;

const PANEL_ANALYSIS_MAX_EDGE = 192;
const COLORFUL_PIXEL_SATURATION_THRESHOLD = 0.22;
const SPECIAL_EDITION_COLORFUL_PIXEL_RATIO_THRESHOLD = 0.18;
const SPECIAL_EDITION_AVERAGE_SATURATION_THRESHOLD = 0.16;
const DARK_PANEL_LUMINANCE_THRESHOLD = 0.45;

interface BuildPersistPlanArgs {
  module: DbModule;
  pendingState: PendingSaveState;
  powerPos12: number;
  powerNeg12: number;
  powerPos5: number;
  weight: number | '' | undefined;
  depth: number | '' | undefined;
  panelFile: File | undefined;
  panelTypeValue: {
    name: string;
    value: number | string;
  };
  panelDescription: string;
}

@Injectable()
export class ModuleEditorDataService {
  constructor(private readonly backend: SupabaseService) {}

  getPreferredPanelCropFormat(): 'webp' | 'jpeg' {
    if (typeof document === 'undefined') {
      return 'jpeg';
    }

    const canvas = document.createElement('canvas');
    if (typeof canvas.toDataURL !== 'function') {
      return 'jpeg';
    }

    return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'webp' : 'jpeg';
  }

  async suggestPanelTypeFromBlob(blob: Blob): Promise<number> {
    const imageData = await this.readImageDataFromBlob(blob);
    const metrics = this.measurePanelAppearance(imageData.data);
    return this.classifyPanelType(metrics);
  }

  buildCroppedPanelFile(sourceFile: File, blob: Blob): File {
    const fileType = blob.type || sourceFile.type || 'image/jpeg';
    const extension = this.fileExtensionFromType(fileType) || this.fileExtensionFromName(sourceFile.name) || 'jpg';
    const baseName = this.stripFileExtension(sourceFile.name) || 'module-panel';
    return new File([blob], `${ baseName }-cropped.${ extension }`, {
      type: fileType,
      lastModified: Date.now()
    });
  }

  buildCvSummary(cvs: FormCV[]): CvSectionSummary {
    const editable = cvs.filter(cv => cv.id === 0).length;
    return {
      total: cvs.length,
      editable,
      locked: cvs.length - editable
    };
  }

  createFormCV(
    data: Partial<CV>,
    validatorsName: ValidatorFn | null,
    validatorsNum: ValidatorFn | null
  ): FormCV {
    const formCV: FormCV = {
      name: new UntypedFormControl(data.name || '', validatorsName),
      a: new UntypedFormControl(
        data.min != null ? data.min : 0,
        validatorsNum
      ),
      b: new UntypedFormControl(
        data.max != null ? data.max : 0,
        validatorsNum
      ),
      id: data.id || 0,
      isApproved: data.isApproved || false
    };

    if (formCV.id > 0 && formCV.isApproved) {
      formCV.name.disable();
      formCV.a.disable();
      formCV.b.disable();
    }

    return formCV;
  }

  updateFormGroupAndContainer(
    cvs: FormCV[],
    group: UntypedFormGroup,
    subject: BehaviorSubject<FormCV[]>
  ): void {
    const controlsToRemove = Object.keys(group.controls);
    controlsToRemove.forEach(controlName => {
      group.removeControl(controlName);
    });

    cvs
      .filter(cv => !cv.isApproved)
      .forEach((cv, index) => {
        group.addControl(`name${ index }`, cv.name);
        group.addControl(`a${ index }`, cv.a);
        group.addControl(`b${ index }`, cv.b);
      });

    subject.next(cvs);
  }

  formCVToCV(formCVs: FormCV[]): CV[] {
    return formCVs.map(formCV => ({
      name: formCV.name.value,
      id: formCV.id,
      min: formCV.a.value,
      max: formCV.b.value,
      isApproved: formCV.isApproved || false
    }));
  }

  getPendingSaveState(params: {
    module: DbModule;
    formIns: FormCV[];
    formOuts: FormCV[];
    powerDirty: boolean;
    physicalDirty: boolean;
    panelFileCount: number;
  }): PendingSaveState {
    const ins = this.formCVToCV(params.formIns);
    const outs = this.formCVToCV(params.formOuts);
    const shouldSaveInsOuts = this.hasInsOutsChanges(ins, outs, params.module);
    const shouldSavePower = params.powerDirty;
    const shouldSavePhysical = params.physicalDirty;
    const shouldSavePanel = params.panelFileCount > 0;

    return {
      ins,
      outs,
      shouldSaveInsOuts,
      shouldSavePower,
      shouldSavePhysical,
      shouldSavePanel,
      hasPendingChanges: shouldSaveInsOuts || shouldSavePower || shouldSavePhysical || shouldSavePanel
    };
  }

  buildPersistPlan(args: BuildPersistPlanArgs): {
    operations: Observable<unknown>[];
    savedSections: string[];
  } {
    const operations: Observable<unknown>[] = [];

    if (args.pendingState.shouldSavePower || args.pendingState.shouldSavePhysical) {
      operations.push(this.backend.update.module({
        id: args.module.id,
        ...(args.pendingState.shouldSavePower
          ? {
            powerPos12: args.powerPos12,
            powerNeg12: args.powerNeg12,
            powerPos5: args.powerPos5
          }
          : {}),
        ...(args.pendingState.shouldSavePhysical
          ? {
            weight: args.weight !== '' ? args.weight : undefined,
            depth: args.depth !== '' ? args.depth : undefined
          }
          : {})
      }));
    }

    if (args.pendingState.shouldSavePanel) {
      operations.push(this.savePendingPanel$({
        module: args.module,
        file: args.panelFile,
        panelTypeValue: args.panelTypeValue,
        panelDescription: args.panelDescription
      }));
    }

    if (args.pendingState.shouldSaveInsOuts) {
      operations.push(
        this.backend.update.moduleINsOUTs(
          args.module.id,
          args.pendingState.ins,
          args.pendingState.outs
        )
      );
    }

    const savedSections: string[] = [];
    if (args.pendingState.shouldSavePower || args.pendingState.shouldSavePhysical) {
      savedSections.push('module specs');
    }
    if (args.pendingState.shouldSavePanel) {
      savedSections.push('panel');
    }
    if (args.pendingState.shouldSaveInsOuts) {
      savedSections.push('IN/OUT ports');
    }

    return {operations, savedSections};
  }

  touchModule$(moduleId: number): Observable<unknown> {
    return this.backend.update.module({id: moduleId});
  }

  syncDataSnapshotAfterSave(params: {
    module: DbModule;
    pendingState: PendingSaveState;
    powerPos12: number;
    powerNeg12: number;
    powerPos5: number;
    weight: number | '' | undefined;
    depth: number | '' | undefined;
  }): DbModule {
    return {
      ...params.module,
      ...(params.pendingState.shouldSaveInsOuts
        ? {
          ins: params.pendingState.ins,
          outs: params.pendingState.outs
        }
        : {}),
      ...(params.pendingState.shouldSavePower
        ? {
          powerPos12: params.powerPos12,
          powerNeg12: params.powerNeg12,
          powerPos5: params.powerPos5
        }
        : {}),
      ...(params.pendingState.shouldSavePhysical
        ? {
          weight: params.weight !== '' ? params.weight : undefined,
          depth: params.depth !== '' ? params.depth : undefined
        }
        : {})
    };
  }

  private savePendingPanel$(params: {
    module: DbModule;
    file: File | undefined;
    panelTypeValue: {
      name: string;
      value: number | string;
    };
    panelDescription: string;
  }): Observable<unknown> {
    if (!params.file) {
      return EMPTY;
    }

    return from(params.file.arrayBuffer()).pipe(
      withLatestFrom(of([params.file.name, params.file.type] as const)),
      switchMap(([fileBuffer, [filename, fileType]]) => {
        const extensionFromFilename = filename.includes('.') ? filename.split('.').pop() : '';
        const extensionFromType = (fileType ?? '').split('/').pop();
        const extension = (extensionFromFilename || extensionFromType || 'jpg').toLowerCase();
        const name: string = `${ this.safeString(params.module.name) }-${ this.safeString(params.module.manufacturer.name) }-${ params.panelTypeValue.name }-${ this.safeString(params.module.standard.name) }`;
        const filenameAndExtension: string = `${ name }.${ extension }`;
        return this.backend.storage.uploadModulePanel(fileBuffer, filenameAndExtension, fileType);
      }),
      switchMap(dbFilename =>
        this.backend.add.panel([{
          filename: dbFilename,
          color: +params.panelTypeValue.value,
          description: params.panelDescription,
          moduleid: params.module.id
        }])
      )
    );
  }

  private hasInsOutsChanges(ins: CV[], outs: CV[], module: DbModule): boolean {
    const existingIns = module?.ins ?? [];
    const existingOuts = module?.outs ?? [];
    return !this.areCvListsEqual(ins, existingIns) || !this.areCvListsEqual(outs, existingOuts);
  }

  private areCvListsEqual(a: CV[], b: CV[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((cv, i) => {
      const left = this.toComparableCv(cv);
      const right = this.toComparableCv(b[i]);
      return left.id === right.id
        && left.name === right.name
        && left.min === right.min
        && left.max === right.max
        && left.isApproved === right.isApproved;
    });
  }

  private toComparableCv(cv: CV): Required<Pick<CV, 'id' | 'name' | 'min' | 'max' | 'isApproved'>> {
    return {
      id: cv?.id ?? 0,
      name: (cv?.name ?? '').trim(),
      min: cv?.min ?? 0,
      max: cv?.max ?? 0,
      isApproved: cv?.isApproved ?? false
    };
  }

  private safeString(str: string | undefined): string {
    return (str || '').replace(/[^a-z0-9]/gi, '_');
  }

  private async readImageDataFromBlob(blob: Blob): Promise<ImageData> {
    const image = await this.decodePanelImage(blob);
    const canvas = document.createElement('canvas');
    const dimensions = this.getPanelAnalysisDimensions(image.width, image.height);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');

    if (!context) {
      this.releaseDecodedPanelImage(image);
      throw new Error('Could not prepare panel image analysis.');
    }

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    this.releaseDecodedPanelImage(image);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  private measurePanelAppearance(data: Uint8ClampedArray): PanelAppearanceMetrics {
    let totalLuminance = 0;
    let totalSaturation = 0;
    let colorfulPixels = 0;
    let opaquePixels = 0;

    for (let i = 0; i < data.length; i += 16) {
      const alpha = data[i + 3] / 255;
      if (alpha < 0.5) {
        continue;
      }

      const red = data[i] / 255;
      const green = data[i + 1] / 255;
      const blue = data[i + 2] / 255;
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
      const saturation = max === 0 ? 0 : (max - min) / max;

      totalLuminance += luminance;
      totalSaturation += saturation;
      if (saturation > COLORFUL_PIXEL_SATURATION_THRESHOLD) {
        colorfulPixels++;
      }
      opaquePixels++;
    }

    if (opaquePixels === 0) {
      return {
        averageLuminance: 1,
        averageSaturation: 0,
        colorfulPixelRatio: 0
      };
    }

    return {
      averageLuminance: totalLuminance / opaquePixels,
      averageSaturation: totalSaturation / opaquePixels,
      colorfulPixelRatio: colorfulPixels / opaquePixels
    };
  }

  private classifyPanelType(metrics: PanelAppearanceMetrics): number {
    if (
      metrics.colorfulPixelRatio > SPECIAL_EDITION_COLORFUL_PIXEL_RATIO_THRESHOLD
      || metrics.averageSaturation > SPECIAL_EDITION_AVERAGE_SATURATION_THRESHOLD
    ) {
      return 3;
    }

    return metrics.averageLuminance < DARK_PANEL_LUMINANCE_THRESHOLD ? 2 : 1;
  }

  private async decodePanelImage(blob: Blob): Promise<DecodedPanelImage> {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(blob);
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
      return await this.loadImageElement(objectUrl);
    } catch {
      URL.revokeObjectURL(objectUrl);
      throw new Error('Could not decode panel image locally.');
    }
  }

  private loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error('Could not decode panel image locally.'));
      };
      image.src = objectUrl;
    });
  }

  private releaseDecodedPanelImage(image: DecodedPanelImage): void {
    if ('close' in image && typeof image.close === 'function') {
      image.close();
    }
  }

  private getPanelAnalysisDimensions(width: number, height: number): {width: number; height: number} {
    const maxEdge = Math.max(width, height);
    if (maxEdge <= PANEL_ANALYSIS_MAX_EDGE) {
      return {width, height};
    }

    const scale = PANEL_ANALYSIS_MAX_EDGE / maxEdge;
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  private fileExtensionFromName(filename: string | undefined): string {
    if (!filename || !filename.includes('.')) {
      return '';
    }
    return filename.split('.').pop()?.toLowerCase() ?? '';
  }

  private stripFileExtension(filename: string | undefined): string {
    if (!filename) {
      return '';
    }
    return filename.replace(/\.[^.]+$/, '');
  }

  private fileExtensionFromType(fileType: string | undefined): string {
    const normalizedType = (fileType || '').toLowerCase();
    if (!normalizedType) {
      return '';
    }
    if (normalizedType === 'image/jpeg') {
      return 'jpg';
    }
    return normalizedType.split('/').pop() ?? '';
  }
}
