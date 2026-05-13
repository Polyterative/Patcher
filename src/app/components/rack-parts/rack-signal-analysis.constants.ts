import { SignalDestinationTier, SignalTypeFamily } from './rack-signal-analysis.models';

export const SIGNAL_FAMILY_ORDER: SignalTypeFamily[] = ['audio', 'pitch', 'clock', 'modulation', 'other'];

export const SIGNAL_FAMILY_LABELS: Record<SignalTypeFamily, string> = {
  audio: 'Audio',
  pitch: 'Pitch / V-Oct',
  clock: 'Clock / Gate',
  modulation: 'Modulation',
  other: 'Other',
};

export const SIGNAL_TIER_ORDER: SignalDestinationTier[] = ['natural', 'exploratory'];

export const SIGNAL_TIER_LABELS: Record<SignalDestinationTier, string> = {
  natural: 'Best matches',
  exploratory: 'More possible routes',
};

export const DEFAULT_SIGNAL_MAX_MATCHES = 8;

export const TIMING_DESTINATION_PATTERN = /\bclock\b|\bsequencer\b|\bdivider\b|\bmultiplier\b|\blogic\b|\breset\b|\brun\b|\bsync\b/;
export const PITCH_CONTROL_DESTINATION_PATTERN = /\bquantizer\b|\bsequencer\b|\bkeyboard\b|\bkey\b|\barp(?:eggiator)?\b|\bpitch\b/;

export const SIGNAL_KEYWORD_PATTERNS: Record<SignalTypeFamily, RegExp[]> = {
  audio: [
    /\baudio\b/,
    /\bmain\b/,
    /\bmix\b/,
    /\bstereo\b/,
    /\bmono\b/,
    /\bleft\b/,
    /\bright\b/,
    /\breturn\b/,
    /\bsend\b/,
    /\bfilter\b/,
    /\bvca\b/,
  ],
  pitch: [
    /\bv\/?oct\b/,
    /\b1v\/?oct\b/,
    /\bpitch\b/,
    /\bkey\b/,
    /\bkeyboard\b/,
    /\btracking\b/,
  ],
  clock: [
    /\bclock\b/,
    /\bclk\b/,
    /\bgate\b/,
    /\btrig(?:ger)?\b/,
    /\breset\b/,
    /\brun\b/,
    /\bsync\b/,
    /\bpulse\b/,
  ],
  modulation: [
    /\bcv\b/,
    /\bmod\b/,
    /\bfm\b/,
    /\benv\b/,
    /\benvelope\b/,
    /\blfo\b/,
    /\brand(?:om)?\b/,
    /\bslew\b/,
    /\bcutoff\b/,
    /\blevel\b/,
    /\bdepth\b/,
    /\bamt\b/,
    /\bpwm\b/,
  ],
  other: [],
};

export const SIGNAL_FAMILY_TAG_PATTERNS: Record<Exclude<SignalTypeFamily, 'other'>, RegExp[]> = {
  audio: [/\bfilter\b/, /\bvca\b/, /\bmixer\b/, /\beffect\b/, /\bdelay\b/, /\breverb\b/, /\boutput\b/, /\bvoice\b/],
  pitch: [/\bvco\b/, /\bosc\b/, /\bvoice\b/, /\bquantizer\b/, /\bsequencer\b/, /\bpitch\b/],
  clock: [/\bclock\b/, /\bgate\b/, /\btrigger\b/, /\btrig\b/, /\bsequencer\b/, /\bdivider\b/, /\blogic\b/, /\benvelope\b/],
  modulation: [/\blfo\b/, /\benvelope\b/, /\bfunction\b/, /\bmod\b/, /\bcv\b/, /\butility\b/, /\brandom\b/],
};

export const GENERIC_SIGNAL_TOKENS = new Set([
  'in',
  'out',
  'input',
  'output',
  'sig',
  'signal',
  'main',
  'send',
  'return',
  'left',
  'right',
  'mono',
  'stereo',
  'cv',
]);
