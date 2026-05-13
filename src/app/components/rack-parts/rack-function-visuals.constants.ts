import { FunctionAnalysisLegendItem } from './rack-function-visuals.models';

export const FUNCTION_ANALYSIS_LEGEND: ReadonlyArray<FunctionAnalysisLegendItem> = [
  {label: 'Voices', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--voices'},
  {label: 'Modulation', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--modulation'},
  {label: 'Utilities', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--utilities'},
  {label: 'Timing', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--timing'},
  {label: 'Tone shaping', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--tone'},
];
