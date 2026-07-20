import {
  FormControl,
  FormGroup,
  UntypedFormControl,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import {
  Observable
} from 'rxjs';
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator
} from 'unique-names-generator';
import { MinimalModule } from 'src/app/models/module';
import {
  CustomValidators,
  FormTypes
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { STANDARDS } from 'src/app/components/rack-parts/module-collection-analysis.service';
import {
  ModularGridMatchedModule,
  ModularGridMatchPreview,
  ModularGridParseResult
} from './modulargrid-import/modulargrid-import.types';

export interface RackCreatorManualFormValue {
  name: unknown;
  hp: unknown;
  rows: unknown;
}

export interface ModuleCatalogueState {
  modules: MinimalModule[];
  ready: boolean;
  error: string | null;
}

export type AmbiguousResolutionState = 'resolved' | 'skip';

export interface RackCreatorFields {
  hp: IMatFormEntityConfig;
  name: IMatFormEntityConfig;
  rows: IMatFormEntityConfig;
  public: {
    code: string;
    control: FormControl<boolean>;
  };
}

export const RACK_NAME_MAX_LENGTH = 32;
export const RACK_CREATOR_MANUAL_DIALOG_WIDTH = 'min(30rem, calc(100vw - 2rem))';
export const RACK_CREATOR_IMPORT_DIALOG_WIDTH = 'min(52rem, calc(100vw - 2rem))';

export function createRackCreatorFields(): RackCreatorFields {
  return {
    hp: {
      label: 'HP (per row)',
      code: 'hp',
      flex: '6rem',
      control: new UntypedFormControl('84', Validators.compose([
        Validators.required,
        Validators.min(2),
        Validators.max(216),
        CustomValidators.onlyIntegers
      ])),
      type: FormTypes.NUMBER,
      hint: 'Range: 2-216 HP',
      iconL1: 'straighten',
      ergonomics: {
        enterkeyhint: 'next'
      }
    },
    rows: {
      label: 'Vertical rows amount',
      code: 'rows',
      flex: '6rem',
      control: new UntypedFormControl('2', Validators.compose([
        Validators.required,
        Validators.min(1),
        Validators.max(16),
        CustomValidators.onlyIntegers
      ])),
      type: FormTypes.NUMBER,
      hint: 'Range: 1-16 rows',
      iconL1: 'view_comfy',
      ergonomics: {
        enterkeyhint: 'done'
      }
    },
    name: {
      label: 'Name',
      code: 'name',
      flex: '6rem',
      control: new UntypedFormControl(generateRackName(), Validators.compose([
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(RACK_NAME_MAX_LENGTH)
      ])),
      type: FormTypes.TEXT,
      iconL1: 'label',
      ergonomics: {
        autofocus: true,
        enterkeyhint: 'next'
      }
    },
    public: {
      code: 'public',
      control: new FormControl<boolean>(true, { nonNullable: true })
    }
  };
}

export function createRackCreatorFormGroup(fields: RackCreatorFields): FormGroup {
  return new UntypedFormGroup({
    [fields.hp.code]: fields.hp.control,
    [fields.name.code]: fields.name.control,
    [fields.rows.code]: fields.rows.control,
    [fields.public.code]: fields.public.control
  });
}

export function emptyModularGridParseResult(): ModularGridParseResult {
  return {
    status: 'empty',
    modules: [],
    warnings: []
  };
}

export function filterLargeFormatModules(
  modules: Array<MinimalModule | null | undefined> | null | undefined
): MinimalModule[] {
  return (modules || []).filter((module): module is MinimalModule => {
    if (!module) {
      return false;
    }

    const standardId = module.standard?.id ?? STANDARDS.EURORACK_3U.id;
    return standardId !== STANDARDS.INTELLIJEL_1U.id
      && standardId !== STANDARDS.PULPLOGIC_1U.id;
  });
}

export function readRackCreatorManualFormValue(fields: RackCreatorFields): RackCreatorManualFormValue {
  return {
    name: fields.name.control.value,
    hp: fields.hp.control.value,
    rows: fields.rows.control.value
  };
}

export function restoreRackCreatorManualFormValue(
  fields: RackCreatorFields,
  value: RackCreatorManualFormValue
): void {
  fields.name.control.setValue(value.name);
  fields.hp.control.setValue(value.hp);
  fields.rows.control.setValue(value.rows);
}

export function importedRackName(name: string | undefined, fallbackName: unknown): string {
  return (name ?? `${ fallbackName ?? '' }`).slice(0, RACK_NAME_MAX_LENGTH);
}

export function isAmbiguousCandidateSelected(
  selections: Record<string, number | null>,
  sourceKey: string,
  moduleId: number | null
): boolean {
  if (moduleId === null && !(sourceKey in selections)) {
    return true;
  }

  return selections[sourceKey] === moduleId;
}

export function ambiguousResolutionState(
  selections: Record<string, number | null>,
  sourceKey: string
): AmbiguousResolutionState {
  const selection = selections[sourceKey];
  return selection === undefined || selection === null ? 'skip' : 'resolved';
}

export function moduleManufacturerName(module: MinimalModule | null | undefined): string {
  const name = module?.manufacturer?.name?.trim();
  return name || 'Unknown manufacturer';
}

export function matchedPreviewModules(preview: ModularGridMatchPreview): ModularGridMatchedModule[] {
  return [
    ...preview.confident,
    ...preview.likely
  ].slice(0, 8);
}

export function missingModulesText(preview: ModularGridMatchPreview): string {
  const rows = preview.unmatched.map(match =>
    `- ${ match.source.name } (${ match.source.inferredHp } HP, row ${ match.source.row }, column ${ match.source.col })`
  );

  return [
    `Missing ModularGrid modules for "${ preview.rack.name }":`,
    ...rows
  ].join('\n');
}

export function readModularGridFileText$(file: File): Observable<string> {
  return new Observable<string>(observer => {
    const reader = new FileReader();
    reader.onload = () => {
      observer.next(typeof reader.result === 'string' ? reader.result : '');
      observer.complete();
    };
    reader.onerror = () => {
      observer.error(reader.error ?? new Error('Could not read ModularGrid export file.'));
    };
    reader.readAsText(file);

    return () => reader.readyState === FileReader.LOADING ? reader.abort() : undefined;
  });
}

function generateRackName(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: ' ',
    style: 'capital',
    length: 2
  });
}
