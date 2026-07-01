export interface FrequencyBand {
  label: string;
  lowHz: number;
  highHz: number;
  centerHz?: number;
}

interface RawBand {
  lowHz: number;
  highHz: number;
  centerHz?: number;
  index: number;
  endIndex: number;
  sentence: string;
  sentenceMatchIndex: number;
}

const MIN_FREQUENCY_HZ = 20;
const MAX_FREQUENCY_HZ = 20000;
const MAX_VISIBLE_BANDS = 8;
const FREQUENCY_UNIT_PATTERN = 'k(?:ilo)?(?:hertz|hz)|hz|hertz';
const FREQUENCY_VALUE_PATTERN = `(?<![\\d.])(\\d+(?:\\.\\d+)?)\\s*(${ FREQUENCY_UNIT_PATTERN })`;
const RANGE_PATTERNS = [
  new RegExp(`(?:between|from)\\s+${ FREQUENCY_VALUE_PATTERN }\\s+(?:and|to)\\s+${ FREQUENCY_VALUE_PATTERN }`, 'gi'),
  new RegExp(`${ FREQUENCY_VALUE_PATTERN }\\s*(?:-|–|—|to|and)\\s*${ FREQUENCY_VALUE_PATTERN }`, 'gi')
];
const FREQUENCY_VALUE_REGEX = new RegExp(FREQUENCY_VALUE_PATTERN, 'gi');
const SINGLE_FREQUENCY_PATTERN = new RegExp(FREQUENCY_VALUE_PATTERN, 'gi');

export function extractFrequencyBands(description: string): FrequencyBand[] {
  if (!description?.trim()) {
    return [];
  }

  const rawBands = extractRawRanges(description);
  const occupiedRanges = rawBands.map(band => [band.index, band.endIndex] as const);
  rawBands.push(...extractCenterFrequencies(description, occupiedRanges));

  return rawBands
    .sort((a, b) => a.index - b.index)
    .filter(band => Number.isFinite(band.lowHz) && Number.isFinite(band.highHz))
    .map((band, index) => ({
      label: inferBandLabel(band.sentence, band.sentenceMatchIndex, index),
      lowHz: clampFrequency(Math.min(band.lowHz, band.highHz)),
      highHz: clampFrequency(Math.max(band.lowHz, band.highHz)),
      centerHz: band.centerHz
    }))
    .filter(band => band.lowHz < band.highHz)
    .slice(0, MAX_VISIBLE_BANDS);
}

function extractRawRanges(description: string): RawBand[] {
  const bands: RawBand[] = [];

  for (const sentence of frequencySentences(description)) {
    for (const rangePattern of RANGE_PATTERNS) {
      rangePattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rangePattern.exec(sentence.text)) !== null) {
        const values = extractFrequencyValues(match[0]);
        const first = values[0];
        const second = values[1];

        if (first === undefined || second === undefined) {
          continue;
        }
        const index = sentence.index + match.index;
        const endIndex = index + match[0].length;

        if (hasOverlappingRange(index, endIndex, bands)) {
          continue;
        }

        bands.push({
          lowHz: first,
          highHz: second,
          index,
          endIndex,
          sentence: sentence.text,
          sentenceMatchIndex: match.index
        });
      }
    }
  }

  return bands;
}

function extractCenterFrequencies(description: string, occupiedRanges: readonly (readonly [number, number])[]): RawBand[] {
  const bands: RawBand[] = [];

  for (const sentence of frequencySentences(description)) {
    SINGLE_FREQUENCY_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = SINGLE_FREQUENCY_PATTERN.exec(sentence.text)) !== null) {
      const absoluteIndex = sentence.index + match.index;

      if (isInsideRanges(absoluteIndex, occupiedRanges)) {
        continue;
      }

      const centerHz = toHz(match[1], match[2]);

      if (centerHz === null) {
        continue;
      }

      bands.push({
        lowHz: centerHz / 2,
        highHz: centerHz * 2,
        centerHz,
        index: absoluteIndex,
        endIndex: absoluteIndex + match[0].length,
        sentence: sentence.text,
        sentenceMatchIndex: match.index
      });
    }
  }

  return bands;
}

function frequencySentences(description: string): Array<{text: string; index: number}> {
  const sentences: Array<{text: string; index: number}> = [];
  let startIndex = 0;

  for (let index = 0; index < description.length; index++) {
    const character = description[index];

    if (!'.!?;'.includes(character) || isDecimalPoint(description, index)) {
      continue;
    }

    pushFrequencySentence(description.slice(startIndex, index + 1), startIndex, sentences);
    startIndex = index + 1;
  }

  pushFrequencySentence(description.slice(startIndex), startIndex, sentences);

  return sentences;
}

function pushFrequencySentence(
  text: string,
  index: number,
  sentences: Array<{text: string; index: number}>
): void {
  const trimmedText = text.trim();

  if (trimmedText && new RegExp(`\\b\\d+(?:\\.\\d+)?\\s*(?:${ FREQUENCY_UNIT_PATTERN })\\b`, 'i').test(trimmedText)) {
    sentences.push({
      text: trimmedText,
      index
    });
  }
}

function isDecimalPoint(text: string, index: number): boolean {
  if (text[index] !== '.') {
    return false;
  }

  const previous = text[index - 1];
  const next = text[index + 1];

  return /\d/.test(previous ?? '') && /\d/.test(next ?? '');
}

function inferBandLabel(sentence: string, matchIndex: number, index: number): string {
  const localLabel = inferLocalBandLabel(sentence, matchIndex);

  if (localLabel) {
    return appendBandShape(sentence, matchIndex, localLabel);
  }

  const namedBands: Array<{pattern: RegExp; label: string; priority: number}> = [
    {pattern: /\bhi[-\s]?mid(?:range)?(?:\s*band)?\b/gi, label: 'Hi-mid', priority: 0},
    {pattern: /\blo[-\s]?mid(?:range)?(?:\s*band)?\b/gi, label: 'Lo-mid', priority: 0},
    {pattern: /\bsub(?:\s*bass)?(?:\s*band)?\b/gi, label: 'Sub', priority: 1},
    {pattern: /\b(low|bass)(?:\s*band)?\b/gi, label: 'Low', priority: 2},
    {pattern: /\bmid(?:range)?(?:\s*band)?\b/gi, label: 'Mid', priority: 2},
    {pattern: /\b(high|treble)(?:\s*band)?\b/gi, label: 'High', priority: 2},
    {pattern: /\bcutoff\b/gi, label: 'Cutoff', priority: 3},
    {pattern: /\bcenter\s*frequency\b|\bcentre\s*frequency\b/gi, label: 'Frequency', priority: 3},
    {pattern: /\bcarrier\b/gi, label: 'Carrier', priority: 3},
    {pattern: /\bmodulator\b/gi, label: 'Modulator', priority: 3}
  ];
  let nearest: {label: string; score: number; matchLength: number} | undefined;

  for (const {pattern, label, priority} of namedBands) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(sentence)) !== null) {
      const labelIndex = match.index;
      const distance = labelIndex <= matchIndex
        ? matchIndex - labelIndex
        : (labelIndex - matchIndex) + 20;
      const score = distance + priority;
      const matchLength = match[0].length;

      if (!nearest || score < nearest.score || (score === nearest.score && matchLength > nearest.matchLength)) {
        nearest = {label, score, matchLength};
      }
    }
  }

  if (!nearest) {
    return `Band ${ index + 1 }`;
  }

  return appendBandShape(sentence, matchIndex, nearest.label);
}

function inferLocalBandLabel(sentence: string, matchIndex: number): string | null {
  const localStart = Math.max(
    sentence.lastIndexOf(',', matchIndex),
    sentence.lastIndexOf(';', matchIndex),
    sentence.lastIndexOf('.', matchIndex)
  ) + 1;
  const localText = sentence.slice(localStart, matchIndex);
  const localPatterns: Array<{pattern: RegExp; label: string}> = [
    {pattern: /\bhi[-\s]?mid(?:range)?(?:\s*band)?\b/i, label: 'Hi-mid'},
    {pattern: /\blo[-\s]?mid(?:range)?(?:\s*band)?\b/i, label: 'Lo-mid'},
    {pattern: /\bsub(?:\s*bass)?(?:\s*band)?\b/i, label: 'Sub'},
    {pattern: /\b(high|treble)(?:\s*band)?\b/i, label: 'High'},
    {pattern: /\b(low|bass)(?:\s*band)?\b/i, label: 'Low'},
    {pattern: /\bmid(?:range)?(?:\s*band)?\b/i, label: 'Mid'},
    {pattern: /\bcutoff\b/i, label: 'Cutoff'},
    {pattern: /\bcenter\s*frequency\b|\bcentre\s*frequency\b/i, label: 'Frequency'},
    {pattern: /\bcarrier\b/i, label: 'Carrier'},
    {pattern: /\bmodulator\b/i, label: 'Modulator'}
  ];

  return localPatterns.find(({pattern}) => pattern.test(localText))?.label ?? null;
}

function appendBandShape(sentence: string, matchIndex: number, label: string): string {
  const nextText = sentence.slice(matchIndex, matchIndex + 40).toLowerCase();
  const shape = ['shelf', 'peak', 'bell', 'notch', 'cut']
    .map(token => {
      const match = new RegExp(`\\b${ token }\\b`, 'i').exec(nextText);
      return match ? {shape: token, index: match.index} : null;
    })
    .filter((match): match is {shape: string; index: number} => match !== null)
    .sort((a, b) => a.index - b.index)[0]?.shape;

  return shape ? `${ label } ${ shape }` : label;
}

function toHz(value: string, unit: string): number | null {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return /^k/i.test(unit) ? parsed * 1000 : parsed;
}

function extractFrequencyValues(text: string): number[] {
  const values: number[] = [];
  FREQUENCY_VALUE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FREQUENCY_VALUE_REGEX.exec(text)) !== null) {
    const value = toHz(match[1], match[2]);

    if (value !== null) {
      values.push(value);
    }
  }

  return values;
}

function clampFrequency(value: number): number {
  return Math.min(MAX_FREQUENCY_HZ, Math.max(MIN_FREQUENCY_HZ, Math.round(value)));
}

function isInsideRanges(index: number, ranges: readonly (readonly [number, number])[]): boolean {
  return ranges.some(([start, end]) => index >= start && index <= end);
}

function hasOverlappingRange(index: number, endIndex: number, bands: readonly RawBand[]): boolean {
  return bands.some(band => index < band.endIndex && endIndex > band.index);
}
