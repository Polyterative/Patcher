// export class FormElementModels {
// }

export interface IFormLineSetup {
  hideRequired: boolean;
  floatLabel: 'auto' | 'always' | 'never';
}

export enum FormTypes {
  TEXT          = 'text',
  MULTI_TEXT    = 'multi_text',
  TIME          = 'time',
  NUMBER        = 'number',
  AREA          = 'area',
  DATE          = 'date',
  SELECT        = 'select',
  MULTISELECT   = 'multiselect',
  AUTOCOMPLETE  = 'autocomplete',
  MULTICOMPLETE = 'multicomplete'
}

export enum MatFormAppearences {
  LEGACY   = 'legacy',
  STANDARD = 'standard',
  FILL     = 'fill',
  OUTLINE  = 'outline'
}

export interface ISelectable {
  id: number;
  name: string;
}
