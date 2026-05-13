import { RackedModule } from 'src/app/models/module';

export type SignalTypeFamily = 'audio' | 'pitch' | 'clock' | 'modulation' | 'other';
export type SignalDestinationConfidence = 'likely' | 'potential';
export type SignalDestinationTier = 'natural' | 'exploratory';
export type SignalFocusArea = 'voices' | 'tone' | 'mixing' | 'modulation' | 'clock';

export interface SignalAnalysisOptions {
  focusArea?: SignalFocusArea;
  maxMatches?: number;
}

export interface SignalDestinationMatch {
  destination: RackedModule;
  family: SignalTypeFamily;
  familyLabel: string;
  score: number;
  confidence: SignalDestinationConfidence;
  tier: SignalDestinationTier;
  reasonLabel: string;
  destinationRoleLabel: string;
  matchedOutputNames: string[];
  matchedInputNames: string[];
}

export interface SignalDestinationGroup {
  family: SignalTypeFamily;
  label: string;
  matches: SignalDestinationMatch[];
}

export interface SignalDestinationTierGroup {
  tier: SignalDestinationTier;
  label: string;
  groups: SignalDestinationGroup[];
}

export interface SignalModuleAnalysis {
  inputNames: string[];
  outputNames: string[];
  tagNames: string[];
  destinationMatches: SignalDestinationMatch[];
  destinationTierGroups: SignalDestinationTierGroup[];
  totalDestinations: number;
  hiddenDestinationCount: number;
}
