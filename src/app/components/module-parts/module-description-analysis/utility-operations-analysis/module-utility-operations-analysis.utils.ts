import {
  hasDescriptionText,
  normalizeAnalysisText,
  uniqueByKey
} from '../shared/description-analysis-text.utils';

export interface UtilityOperationFeature {
  label: string;
  group: 'logic' | 'math' | 'shape' | 'level';
}

const OPERATION_PATTERNS: Array<{label: string; group: UtilityOperationFeature['group']; patterns: RegExp[]}> = [
  {label: 'AND', group: 'logic', patterns: [/\bAND\b/, /\blogic\s+and\b/i]},
  {label: 'OR', group: 'logic', patterns: [/\bOR\b/, /\blogic\s+or\b/i]},
  {label: 'XOR', group: 'logic', patterns: [/\bXOR\b/, /\bexclusive\s+or\b/i]},
  {label: 'NOT', group: 'logic', patterns: [/\bNOT\b/, /\blogic\s+not\b/i]},
  {label: 'Logic', group: 'logic', patterns: [/\blogic\s+(?:processor|module|section|function|utility)\b/i, /\bgate\s+combiner\b/i]},
  {
    label: 'Sum',
    group: 'math',
    patterns: [
      /\bsumming\s+(?:mixer|stage|node|bus|input|section|utility)\b/i,
      /\b(?:cv|audio|signal|voltage|gate|trigger)\s+(?:mixer|summing|sum|adder)\b/i,
      /\b(?:mixer|adder)\s+(?:utility|module|section|channel|input|output)\b/i,
      /\b(?:sum|sums|add|adds|mixes|mixing)\s+(?:two|three|four|\d+|multiple|several|cv|audio|signals?|voltages?|inputs?|channels?)\b/i
    ]
  },
  {label: 'Min', group: 'math', patterns: [/\bmin\s*\/\s*max\b/i, /\bminimum\s+(?:selector|processor|utility|voltage|signal)\b/i]},
  {label: 'Max', group: 'math', patterns: [/\bmin\s*\/\s*max\b/i, /\bmaximum\s+(?:selector|processor|utility|voltage|signal)\b/i]},
  {label: 'Slew', group: 'shape', patterns: [/\bslew\b|\bglide\b|\blag\b/i]},
  {label: 'S&H', group: 'shape', patterns: [/\bsample\s*(?:and|&)\s*hold\b|\bs&h\b/i]},
  {label: 'Rectify', group: 'shape', patterns: [/\brectif(?:y|ier|ication)\b|\bfull[-\s]?wave\b|\bhalf[-\s]?wave\b/i]},
  {label: 'Attenuate', group: 'level', patterns: [/\battenuat(?:e|or|ion|ing)\b|\battenuvert(?:er|ing)?\b/i]},
  {label: 'Offset', group: 'level', patterns: [/\boffset\b|\bdc\s+offset\b/i]},
  {label: 'Invert', group: 'level', patterns: [/\binvert(?:er|s|ed|ing)?\b|\bpolar(?:ity)?\s+flip\b/i]}
];

export function extractUtilityOperationFeatures(description: string | null | undefined): UtilityOperationFeature[] {
  if (!hasDescriptionText(description)) {
    return [];
  }

  const normalizedDescription = normalizeAnalysisText(description);

  const operations = uniqueByKey(
    OPERATION_PATTERNS
      .filter(operation => operation.patterns.some(pattern => pattern.test(normalizedDescription)))
      .map(operation => ({
        label: operation.label,
        group: operation.group
      })),
    operation => `${ operation.group }-${ operation.label }`
  );

  if (operations.some(operation => operation.group === 'logic' && operation.label !== 'Logic')) {
    return operations.filter(operation => operation.label !== 'Logic');
  }

  return operations;
}
