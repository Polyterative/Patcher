import {
  UntypedFormControl
} from '@angular/forms';
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

export interface BuildPersistPlanArgs {
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
