import {
  hasDescriptionText,
  normalizeAnalysisText,
  uniqueByKey
} from '../shared/description-analysis-text.utils';

export interface WaveformFeature {
  label: string;
  kind: 'sine' | 'triangle' | 'saw' | 'ramp' | 'square' | 'pulse' | 'noise' | 'random' | 'chaos';
}

const WAVEFORM_PATTERNS: Array<{kind: WaveformFeature['kind']; label: string; pattern: RegExp}> = [
  {kind: 'sine', label: 'Sine', pattern: /\bsines?\b|\bsinus(?:oidal)?\b/i},
  {kind: 'triangle', label: 'Triangle', pattern: /\btriangles?\b|\btri\b/i},
  {kind: 'saw', label: 'Saw', pattern: /\bsaw(?:tooth)?s?\b/i},
  {kind: 'ramp', label: 'Ramp', pattern: /\bramps?\b/i},
  {kind: 'square', label: 'Square', pattern: /\bsquares?\b/i},
  {kind: 'pulse', label: 'Pulse', pattern: /\bpulses?\b|\bpwm\b/i},
  {kind: 'noise', label: 'Noise', pattern: /\bnoise\b|\bwhite\s+noise\b|\bpink\s+noise\b/i},
  {kind: 'random', label: 'Random', pattern: /\brandom\b|\bs&h\b|\bsample\s+and\s+hold\b/i},
  {kind: 'chaos', label: 'Chaos', pattern: /\bchaos\b|\bchaotic\b/i}
];

export function extractWaveformFeatures(description: string | null | undefined): WaveformFeature[] {
  if (!hasDescriptionText(description)) {
    return [];
  }

  const normalizedDescription = normalizeAnalysisText(description);

  return uniqueByKey(
    WAVEFORM_PATTERNS
      .filter(waveform => waveform.pattern.test(normalizedDescription))
      .map(waveform => ({
        label: waveform.label,
        kind: waveform.kind
      })),
    waveform => waveform.kind
  );
}
