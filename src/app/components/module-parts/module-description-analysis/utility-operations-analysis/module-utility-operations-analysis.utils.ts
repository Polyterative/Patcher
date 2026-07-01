import {
  hasDescriptionText,
  normalizeAnalysisText,
  uniqueByKey
} from '../shared/description-analysis-text.utils';

export interface UtilityOperationFeature {
  label: string;
  group: 'logic' | 'math' | 'shape' | 'level';
}

const OPERATION_PATTERNS: Array<{label: string; group: UtilityOperationFeature['group']; pattern: RegExp}> = [
  {label: 'AND', group: 'logic', pattern: /(?:\bAND\b)|(?:\b[Ll]ogic\s+[Aa]nd\b)/},
  {label: 'OR', group: 'logic', pattern: /(?:\bOR\b)|(?:\b[Ll]ogic\s+[Oo]r\b)/},
  {label: 'XOR', group: 'logic', pattern: /(?:\bXOR\b)|(?:\b[Ee]xclusive\s+[Oo]r\b)/},
  {label: 'NOT', group: 'logic', pattern: /(?:\bNOT\b)|(?:\b[Ll]ogic\s+[Nn]ot\b)/},
  {label: 'Logic', group: 'logic', pattern: /\blogic\b|\bgate\s+combiner\b/i},
  {label: 'Sum', group: 'math', pattern: /\bsum(?:ming)?\b|\bmix(?:er|ing)?\b|\badd(?:er|ing)?\b/i},
  {label: 'Min', group: 'math', pattern: /\bmin(?:imum)?\b/i},
  {label: 'Max', group: 'math', pattern: /\bmax(?:imum)?\b/i},
  {label: 'Slew', group: 'shape', pattern: /\bslew\b|\bglide\b|\blag\b/i},
  {label: 'S&H', group: 'shape', pattern: /\bsample\s*(?:and|&)\s*hold\b|\bs&h\b/i},
  {label: 'Rectify', group: 'shape', pattern: /\brectif(?:y|ier|ication)\b|\bfull[-\s]?wave\b|\bhalf[-\s]?wave\b/i},
  {label: 'Attenuate', group: 'level', pattern: /\battenuat(?:e|or|ion|ing)\b|\battenuvert(?:er|ing)?\b/i},
  {label: 'Offset', group: 'level', pattern: /\boffset\b|\bdc\s+offset\b/i},
  {label: 'Invert', group: 'level', pattern: /\binvert(?:er|s|ed|ing)?\b|\bpolar(?:ity)?\s+flip\b/i}
];

export function extractUtilityOperationFeatures(description: string | null | undefined): UtilityOperationFeature[] {
  if (!hasDescriptionText(description)) {
    return [];
  }

  const normalizedDescription = normalizeAnalysisText(description);

  const operations = uniqueByKey(
    OPERATION_PATTERNS
      .filter(operation => operation.pattern.test(normalizedDescription))
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
