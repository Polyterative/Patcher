import type { SignalFocusArea } from './rack-signal-analysis.utils';


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

export interface RackAnalysisLegendItem {
  label: string;
  swatchClass: string;
}

export interface RackSignalFocusOption {
  value: SignalFocusArea;
  label: string;
}

export const RACK_LAYOUT_ANALYSIS_LEGEND_ITEMS: ReadonlyArray<RackAnalysisLegendItem> = [
  {label: 'Same HP', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--layoutExact'},
  {label: 'Smaller combo', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--layoutCombo'},
];

export const RACK_SIGNAL_ANALYSIS_LEGEND_ITEMS: ReadonlyArray<RackAnalysisLegendItem> = [
  {label: 'Audio', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalAudio'},
  {label: 'Pitch / V-Oct', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalPitch'},
  {label: 'Clock / Gate', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalClock'},
  {label: 'Modulation', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalModulation'},
  {label: 'Other', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalOther'},
];

export const RACK_SIGNAL_FOCUS_OPTIONS: ReadonlyArray<RackSignalFocusOption> = [
  {value: 'voices', label: 'Voices'},
  {value: 'tone', label: 'Tone shaping'},
  {value: 'mixing', label: 'Mixing'},
  {value: 'modulation', label: 'Modulation'},
  {value: 'clock', label: 'Clock'},
];

export const RACK_ANALYSIS_PANEL_COPY = {
  power: {
    description: 'Hover a row for rail totals, or hover a module for its HP and power draw.',
    detail: 'Heat colors are relative to the rack, and tighten to the hovered row when you focus one.'
  },
  function: {
    description: 'Colors show each module\'s primary role so you can read the rack\'s functional spread by both count and HP.',
    fullCoverage: 'All current modules map to a tracked function role.'
  },
  layout: {
    description: 'Hover a module to find layout-compatible swaps. Use Same HP to pin direct matches, or Combos to cycle through smaller modules that add up to the same width.',
    remix: 'Remix rearranges placed modules by HP while keeping 3U, Intellijel 1U, and Pulp Logic 1U rows separate.',
    detail: 'Hover a row to preview overflow, spare HP, and mixed-format blockers. Green means direct swap; blue means a fitting combination.'
  },
  signal: {
    description: 'Hover a module to inspect its inputs, outputs, tags, and the most relevant destinations it could plausibly feed.',
    detail: 'Signal auto-picks a focused destination intent from the hovered module, and you can override it below.'
  }
} as const;
