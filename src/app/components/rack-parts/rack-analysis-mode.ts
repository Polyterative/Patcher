export const RACK_ANALYSIS_MODES = {
  off: 'off',
  power: 'power',
  function: 'function',
  layout: 'layout',
  signal: 'signal'
} as const;

export type RackAnalysisMode = typeof RACK_ANALYSIS_MODES[keyof typeof RACK_ANALYSIS_MODES];

export const RACK_LAYOUT_HOVER_MODES = {
  sameHp: 'sameHp',
  combinations: 'combinations'
} as const;

export type RackLayoutHoverMode = typeof RACK_LAYOUT_HOVER_MODES[keyof typeof RACK_LAYOUT_HOVER_MODES];

export interface RackAnalysisModeOption {
  mode: RackAnalysisMode;
  label: string;
}

export const RACK_ANALYSIS_MODE_OPTIONS: ReadonlyArray<RackAnalysisModeOption> = [
  {mode: RACK_ANALYSIS_MODES.off, label: 'Off'},
  {mode: RACK_ANALYSIS_MODES.power, label: 'Power'},
  {mode: RACK_ANALYSIS_MODES.function, label: 'Function'},
  {mode: RACK_ANALYSIS_MODES.layout, label: 'Layout'}
];

export interface RackLayoutHoverModeOption {
  mode: RackLayoutHoverMode;
  label: string;
}

export const RACK_LAYOUT_HOVER_MODE_OPTIONS: ReadonlyArray<RackLayoutHoverModeOption> = [
  {mode: RACK_LAYOUT_HOVER_MODES.sameHp, label: 'Same HP'},
  {mode: RACK_LAYOUT_HOVER_MODES.combinations, label: 'Combos'}
];
