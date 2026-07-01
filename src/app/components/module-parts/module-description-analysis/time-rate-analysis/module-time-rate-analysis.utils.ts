import {
  compactNumber,
  hasDescriptionText,
  nearbyText,
  normalizeAnalysisText,
  uniqueByKey
} from '../shared/description-analysis-text.utils';

export interface TimeRateFeature {
  label: string;
  value: string;
  kind: 'time' | 'rate' | 'tempo' | 'cue';
}

const MAX_VISIBLE_TIME_RATE_FEATURES = 7;
const RATE_CONTEXT_PATTERN = /\b(lfo|rate|speed|clock|tempo|bpm|sync|cycle|oscillat(?:or|ion)|audio[-\s]?rate)\b/i;

export function extractTimeRateFeatures(description: string | null | undefined): TimeRateFeature[] {
  if (!hasDescriptionText(description)) {
    return [];
  }

  const normalizedDescription = normalizeAnalysisText(description);
  const features = [
    ...extractDurations(normalizedDescription),
    ...extractTempo(normalizedDescription),
    ...extractContextualRates(normalizedDescription),
    ...extractRateCues(normalizedDescription)
  ];

  return uniqueByKey(features, feature => `${ feature.kind }-${ feature.label }-${ feature.value }`)
    .slice(0, MAX_VISIBLE_TIME_RATE_FEATURES);
}

function extractDurations(description: string): TimeRateFeature[] {
  const features: TimeRateFeature[] = [];
  const pattern = /\b(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec(?:onds?)?|minutes?|mins?)\b/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(description)) !== null) {
    const value = Number.parseFloat(match[1]);

    if (!Number.isFinite(value)) {
      continue;
    }

    features.push({
      label: inferTimeLabel(description, match.index),
      value: formatDuration(value, match[2]),
      kind: 'time'
    });
  }

  return features;
}

function extractTempo(description: string): TimeRateFeature[] {
  const features: TimeRateFeature[] = [];
  const pattern = /\b(\d+(?:\.\d+)?)\s*bpm\b/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(description)) !== null) {
    const value = Number.parseFloat(match[1]);

    if (!Number.isFinite(value)) {
      continue;
    }

    features.push({
      label: 'Tempo',
      value: `${ compactNumber(value) } BPM`,
      kind: 'tempo'
    });
  }

  return features;
}

function extractContextualRates(description: string): TimeRateFeature[] {
  const features: TimeRateFeature[] = [];
  const pattern = /\b(\d+(?:\.\d+)?)\s*(hz|hertz|khz|kilohertz)\b/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(description)) !== null) {
    const context = nearbyText(description, match.index);

    if (!RATE_CONTEXT_PATTERN.test(context)) {
      continue;
    }

    const value = Number.parseFloat(match[1]);

    if (!Number.isFinite(value)) {
      continue;
    }

    features.push({
      label: inferRateLabel(context),
      value: /^k/i.test(match[2]) ? `${ compactNumber(value) } kHz` : `${ compactNumber(value) } Hz`,
      kind: 'rate'
    });
  }

  return features;
}

function extractRateCues(description: string): TimeRateFeature[] {
  const cues: Array<{pattern: RegExp; label: string; value: string}> = [
    {pattern: /\baudio[-\s]?rate\b/i, label: 'Cue', value: 'Audio-rate'},
    {pattern: /\bclock[-\s]?rate\b/i, label: 'Cue', value: 'Clock-rate'},
    {pattern: /\btempo[-\s]?sync(?:ed)?\b|\bsync(?:ed)?\s+to\s+tempo\b/i, label: 'Cue', value: 'Tempo sync'}
  ];

  return cues
    .filter(cue => cue.pattern.test(description))
    .map(cue => ({
      label: cue.label,
      value: cue.value,
      kind: 'cue' as const
    }));
}

function inferTimeLabel(description: string, index: number): string {
  const context = description.slice(Math.max(0, index - 42), index).toLowerCase();
  const labels = [
    {token: 'attack', label: 'Attack'},
    {token: 'decay', label: 'Decay'},
    {token: 'release', label: 'Release'},
    {token: 'delay', label: 'Delay'}
  ];
  const nearest = labels
    .map(candidate => ({
      ...candidate,
      index: context.lastIndexOf(candidate.token)
    }))
    .filter(candidate => candidate.index >= 0)
    .sort((a, b) => b.index - a.index)[0];

  return nearest?.label ?? 'Time';
}

function inferRateLabel(context: string): string {
  if (/\bclock\b/i.test(context)) {
    return 'Clock';
  }

  if (/\blfo\b/i.test(context)) {
    return 'LFO';
  }

  if (/\baudio[-\s]?rate\b/i.test(context)) {
    return 'Audio';
  }

  return 'Rate';
}

function formatDuration(value: number, unit: string): string {
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit.startsWith('m') && normalizedUnit !== 'ms' && !normalizedUnit.startsWith('milli')) {
    return `${ compactNumber(value) } min`;
  }

  if (normalizedUnit === 'ms' || normalizedUnit.startsWith('milli')) {
    return `${ compactNumber(value) } ms`;
  }

  return `${ compactNumber(value) } s`;
}
