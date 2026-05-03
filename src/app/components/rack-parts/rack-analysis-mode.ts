export const RACK_ANALYSIS_MODES = {
  off: 'off',
  power: 'power',
  function: 'function'
} as const;

export type RackAnalysisMode = typeof RACK_ANALYSIS_MODES[keyof typeof RACK_ANALYSIS_MODES];
