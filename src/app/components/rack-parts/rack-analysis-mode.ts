export const RACK_ANALYSIS_MODES = {
  off: 'off',
  power: 'power',
  function: 'function'
} as const;

export type RackAnalysisMode = typeof RACK_ANALYSIS_MODES[keyof typeof RACK_ANALYSIS_MODES];

export interface RackAnalysisModeOption {
  mode: RackAnalysisMode;
  label: string;
}

export const RACK_ANALYSIS_MODE_OPTIONS: ReadonlyArray<RackAnalysisModeOption> = [
  {mode: RACK_ANALYSIS_MODES.off, label: 'Off'},
  {mode: RACK_ANALYSIS_MODES.power, label: 'Power'},
  {mode: RACK_ANALYSIS_MODES.function, label: 'Function'}
];
