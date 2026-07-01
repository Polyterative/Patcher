import {
  hasDescriptionText,
  normalizeAnalysisText,
  uniqueByKey
} from '../shared/description-analysis-text.utils';

export interface ClockDivisionFeature {
  label: string;
  ratio: number;
  kind: 'division' | 'multiplication' | 'behavior';
}

const MAX_VISIBLE_CLOCK_FEATURES = 8;

export function extractClockDivisionFeatures(description: string | null | undefined): ClockDivisionFeature[] {
  if (!hasDescriptionText(description)) {
    return [];
  }

  const normalizedDescription = normalizeAnalysisText(description);
  const ratioFeatures = [
    ...extractSlashDivisions(normalizedDescription),
    ...extractWrittenDivisions(normalizedDescription),
    ...extractMultipliers(normalizedDescription)
  ];
  const behaviorFeatures = extractClockBehaviors(normalizedDescription)
    .filter(feature => feature.label !== 'Clock division' || ratioFeatures.length === 0);
  const features = [
    ...ratioFeatures,
    ...behaviorFeatures
  ];

  return uniqueByKey(features, feature => `${ feature.kind }-${ feature.label }-${ feature.ratio }`)
    .slice(0, MAX_VISIBLE_CLOCK_FEATURES);
}

function extractSlashDivisions(description: string): ClockDivisionFeature[] {
  const features: ClockDivisionFeature[] = [];
  const pattern = /(?:^|[\s,(])\/(\d{1,3})(?=$|[\s,.)])/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(description)) !== null) {
    const value = Number.parseInt(match[1], 10);

    if (!Number.isFinite(value) || value < 2) {
      continue;
    }

    features.push({
      label: `/${ value }`,
      ratio: 1 / value,
      kind: 'division'
    });
  }

  return features;
}

function extractWrittenDivisions(description: string): ClockDivisionFeature[] {
  const features: ClockDivisionFeature[] = [];
  const pattern = /\b(?:divide|divides|division|divider)\s+(?:by\s+)?(\d{1,3})\b/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(description)) !== null) {
    const value = Number.parseInt(match[1], 10);

    if (!Number.isFinite(value) || value < 2) {
      continue;
    }

    features.push({
      label: `÷${ value }`,
      ratio: 1 / value,
      kind: 'division'
    });
  }

  return features;
}

function extractMultipliers(description: string): ClockDivisionFeature[] {
  const features: ClockDivisionFeature[] = [];
  const pattern = /(?:^|[\s,(])(?:x|multiply\s+by\s+)(\d{1,2})(?=$|[\s,.)])/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(description)) !== null) {
    const value = Number.parseInt(match[1], 10);

    if (!Number.isFinite(value) || value < 2) {
      continue;
    }

    features.push({
      label: `x${ value }`,
      ratio: value,
      kind: 'multiplication'
    });
  }

  return features;
}

function extractClockBehaviors(description: string): ClockDivisionFeature[] {
  const behaviorPatterns: Array<{pattern: RegExp; label: string}> = [
    {pattern: /\bratchet(?:s|ing)?\b/i, label: 'Ratchet'},
    {pattern: /\bswing\b/i, label: 'Swing'},
    {pattern: /\bshuffle\b/i, label: 'Shuffle'},
    {pattern: /\bclock\s+division(?:s)?\b|\bclock\s+divider\b/i, label: 'Clock division'}
  ];

  return behaviorPatterns
    .filter(behavior => behavior.pattern.test(description))
    .map(behavior => ({
      label: behavior.label,
      ratio: 1,
      kind: 'behavior' as const
    }));
}
