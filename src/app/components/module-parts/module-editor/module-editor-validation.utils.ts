import { UntypedFormGroup } from '@angular/forms';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import {
  FormCV,
  PendingSaveState
} from './module-editor-data.service';
import { ValidationFeedback } from './module-editor.types';

export interface SaveFabState {
  disabled: boolean;
  label: string;
  icon: string;
  ariaLabel: string;
  disabledReason: string;
}

export interface ModuleEditorValidationContext {
  pendingState: PendingSaveState;
  formGroupA: UntypedFormGroup;
  formGroupB: UntypedFormGroup;
  formGroupPower: UntypedFormGroup;
  formGroupPhysical: UntypedFormGroup;
  formIns: FormCV[];
  formOuts: FormCV[];
  panelFields: IMatFormEntityConfig[];
  powerFields: IMatFormEntityConfig[];
  physicalFields: IMatFormEntityConfig[];
  panelTypeAlreadyExists: boolean;
  duplicatePanelTypeName: string;
  panelCropLoadFailed: boolean;
  croppedPanelFile: File | undefined;
  panelUploadGuardrailRequiresConfirmation: boolean;
  panelUploadGuardrailConfirmed: boolean;
  panelSaveBlocked: boolean;
}

export function buildSaveFabState(
  saveInProgress: boolean,
  saveJustCompleted: boolean,
  pendingState: PendingSaveState,
  validationFeedback: ValidationFeedback
): SaveFabState {
  if (saveInProgress) {
    return {disabled: true, label: 'Saving...', icon: 'sync', ariaLabel: 'Saving module editor changes', disabledReason: 'Save in progress'};
  }
  if (saveJustCompleted) {
    return {disabled: false, label: 'Saved', icon: 'check', ariaLabel: 'Changes saved', disabledReason: ''};
  }

  if (validationFeedback.disabledReason) {
    return {disabled: true, label: 'Save', icon: 'save', ariaLabel: `Save disabled: ${ validationFeedback.disabledReason }`, disabledReason: validationFeedback.disabledReason};
  }
  if (!pendingState.hasPendingChanges) {
    return {disabled: true, label: 'No changes', icon: 'save', ariaLabel: 'No pending changes', disabledReason: 'No pending changes'};
  }
  return {disabled: false, label: 'Save', icon: 'save', ariaLabel: 'Save all pending module editor changes', disabledReason: ''};
}

export function getModuleEditorValidationFeedback(context: ModuleEditorValidationContext): ValidationFeedback {
  if (context.pendingState.shouldSaveInsOuts && (!context.formGroupA.valid || !context.formGroupB.valid)) {
    const invalidPorts = [
      ...describeInvalidCvRows(context.formIns, 'Input'),
      ...describeInvalidCvRows(context.formOuts, 'Output')
    ];
    if (invalidPorts.length > 0) {
      return {
        disabledReason: `Fix ${ invalidPorts.join(', ') }`,
        errorMessage: `Port fields need attention: ${ invalidPorts.join(', ') }.`
      };
    }
  }
  if (context.pendingState.shouldSavePower && !context.formGroupPower.valid) {
    const invalidPowerFields = getInvalidFieldLabels(context.powerFields);
    return {
      disabledReason: `Fix ${ invalidPowerFields.join(', ') }`,
      errorMessage: `Power fields need attention: ${ invalidPowerFields.join(', ') }.`
    };
  }
  if (context.pendingState.shouldSavePhysical && !context.formGroupPhysical.valid) {
    const invalidPhysicalFields = getInvalidFieldLabels(context.physicalFields);
    return {
      disabledReason: `Fix ${ invalidPhysicalFields.join(', ') }`,
      errorMessage: `Physical fields need attention: ${ invalidPhysicalFields.join(', ') }.`
    };
  }
  if (context.pendingState.shouldSavePanel && context.panelSaveBlocked) {
    if (context.panelTypeAlreadyExists) {
      const duplicateName = context.duplicatePanelTypeName || 'selected';
      return {
        disabledReason: `Duplicate panel type: ${ duplicateName }`,
        errorMessage: `This module already has a "${ duplicateName }" panel.`
      };
    }
    if (context.panelCropLoadFailed) {
      return {
        disabledReason: 'Reload panel image',
        errorMessage: 'The selected panel image could not be opened locally.'
      };
    }
    if (!context.croppedPanelFile) {
      return {
        disabledReason: 'Adjust panel crop',
        errorMessage: 'Adjust the local panel crop before saving.'
      };
    }
    if (context.panelUploadGuardrailRequiresConfirmation && !context.panelUploadGuardrailConfirmed) {
      return {
        disabledReason: 'Confirm oversized panel upload',
        errorMessage: 'Confirm the compressed panel image should be saved even though it is still over the target.'
      };
    }

    const invalidPanelFields = getInvalidFieldLabels(context.panelFields);
    return {
      disabledReason: `Fix ${ invalidPanelFields.join(', ') }`,
      errorMessage: `Panel fields need attention: ${ invalidPanelFields.join(', ') }.`
    };
  }
  return {disabledReason: '', errorMessage: ''};
}

function getInvalidFieldLabels(fields: IMatFormEntityConfig[]): string[] {
  return fields
    .filter(field => field.control.invalid)
    .map(field => field.label);
}

function describeInvalidCvRows(cvs: FormCV[], labelPrefix: 'Input' | 'Output'): string[] {
  return cvs.flatMap((cv, index) => {
    const invalidLabels: string[] = [];
    if (cv.name.invalid) {
      invalidLabels.push(`${ labelPrefix } ${ index + 1 } name`);
    }
    if (cv.a.invalid) {
      invalidLabels.push(`${ labelPrefix } ${ index + 1 } min V`);
    }
    if (cv.b.invalid) {
      invalidLabels.push(`${ labelPrefix } ${ index + 1 } max V`);
    }
    return invalidLabels;
  });
}
