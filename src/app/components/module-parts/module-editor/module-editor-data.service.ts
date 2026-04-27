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
