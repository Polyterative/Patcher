import {
  clampNumber,
  compactNumber,
  hasDescriptionText,
  nearbyText,
  normalizeAnalysisText,
  uniqueByKey
} from '../shared/description-analysis-text.utils';

export interface VoltageFeature {
  label: string;
  lowV: number;
  highV: number;
  kind: 'range' | 'marker' | 'tracking';
}

const MAX_VISIBLE_VOLTAGE_FEATURES = 6;
const VOLTAGE_VALUE_PATTERN = '([+-]?\\d+(?:\\.\\d+)?)\\s*(?:v|volts?)\\b';
const VOLTAGE_MARKER_CONTEXT_PATTERN = /\b(gate|trigger|trig|level)\b/i;

export function extractVoltageFeatures(description: string | null | undefined): VoltageFeature[] {
  if (!hasDescriptionText(description)) {
    return [];
  }

  const normalizedDescription = normalizeAnalysisText(description);
  const features = [
    ...extractBipolarShorthand(normalizedDescription),
    ...extractVoltageRanges(normalizedDescription),
    ...extractTracking(normalizedDescription),
    ...extractContextualMarkers(normalizedDescription)
  ];

  return uniqueByKey(features, feature => `${ feature.kind }-${ feature.label }-${ feature.lowV }-${ feature.highV }`)
    .slice(0, MAX_VISIBLE_VOLTAGE_FEATURES);
}

export function voltagePosition(value: number): number {
  return ((clampNumber(value, -10, 10) + 10) / 20) * 100;
}

export function formatVoltage(value: number): string {
  if (value > 0) {
    return `+${ compactNumber(value) }V`;
  }

  return `${ compactNumber(value) }V`;
}

function extractBipolarShorthand(description: string): VoltageFeature[] {
  const features: VoltageFeature[] = [];
  const pattern = /(?:±|\+\/-|plus\s*\/\s*minus)\s*(\d+(?:\.\d+)?)\s*(?:v|volts?)\b/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(description)) !== null) {
    const magnitude = Number.parseFloat(match[1]);

    if (!Number.isFinite(magnitude)) {
      continue;
    }

    features.push({
      label: `±${ compactNumber(magnitude) }V`,
      lowV: -magnitude,
      highV: magnitude,
      kind: 'range'
    });
  }

  return features;
}

function extractVoltageRanges(description: string): VoltageFeature[] {
  const features: VoltageFeature[] = [];
  const rangePattern = /([+-]?\d+(?:\.\d+)?)\s*(?:v|volts?)?\s*(?:-|to|through|and)\s*([+-]?\d+(?:\.\d+)?)\s*(?:v|volts?)\b/gi;
  let match: RegExpExecArray | null;

  while ((match = rangePattern.exec(description)) !== null) {
    const first = Number.parseFloat(match[1]);
    const second = Number.parseFloat(match[2]);

    if (!Number.isFinite(first) || !Number.isFinite(second)) {
      continue;
    }

    features.push({
      label: `${ formatVoltage(first) }–${ formatVoltage(second) }`,
      lowV: Math.min(first, second),
      highV: Math.max(first, second),
      kind: 'range'
    });
  }

  return features;
}

function extractTracking(description: string): VoltageFeature[] {
  const features: VoltageFeature[] = [];
  const trackingPattern = /\b(\d+(?:\.\d+)?)\s*v\s*\/\s*oct(?:ave)?\b/gi;
  let match: RegExpExecArray | null;

  while ((match = trackingPattern.exec(description)) !== null) {
    const volts = Number.parseFloat(match[1]);

    if (!Number.isFinite(volts)) {
      continue;
    }

    features.push({
      label: `${ compactNumber(volts) }V/oct`,
      lowV: volts,
      highV: volts,
      kind: 'tracking'
    });
  }

  return features;
}

function extractContextualMarkers(description: string): VoltageFeature[] {
  const features: VoltageFeature[] = [];
  const valuePattern = new RegExp(VOLTAGE_VALUE_PATTERN, 'gi');
  let match: RegExpExecArray | null;

  while ((match = valuePattern.exec(description)) !== null) {
    const value = Number.parseFloat(match[1]);

    if (!Number.isFinite(value)) {
      continue;
    }

    if (isTrackingValue(description, match.index, match[0]) || isBipolarShorthandValue(description, match.index)) {
      continue;
    }

    const context = nearbyText(description, match.index);

    if (!VOLTAGE_MARKER_CONTEXT_PATTERN.test(context)) {
      continue;
    }

    features.push({
      label: inferMarkerLabel(description, match.index, value),
      lowV: value,
      highV: value,
      kind: 'marker'
    });
  }

  return features;
}

function inferMarkerLabel(description: string, index: number, value: number): string {
  const contextStart = Math.max(0, index - 42);
  const context = description.slice(contextStart, Math.min(description.length, index + 42)).toLowerCase();
  const relativeIndex = index - contextStart;
  const gateDistance = nearestCueDistance(context, relativeIndex, /\bgate\b/g);
  const triggerDistance = nearestCueDistance(context, relativeIndex, /\btrig(?:ger)?\b/g);

  if (gateDistance !== null && (triggerDistance === null || gateDistance <= triggerDistance)) {
    return `Gate ${ formatVoltage(value) }`;
  }

  if (triggerDistance !== null) {
    return `Trig ${ formatVoltage(value) }`;
  }

  return formatVoltage(value);
}

function nearestCueDistance(context: string, index: number, pattern: RegExp): number | null {
  let nearestDistance: number | null = null;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(context)) !== null) {
    const distance = Math.abs(match.index - index);

    if (nearestDistance === null || distance < nearestDistance) {
      nearestDistance = distance;
    }
  }

  return nearestDistance;
}

function isTrackingValue(description: string, index: number, matchText: string): boolean {
  return /^\/\s*oct/i.test(description.slice(index + matchText.length, index + matchText.length + 8));
}

function isBipolarShorthandValue(description: string, index: number): boolean {
  return /(?:±|\+\/-|plus\s*\/\s*minus)\s*$/i.test(description.slice(Math.max(0, index - 20), index));
}
