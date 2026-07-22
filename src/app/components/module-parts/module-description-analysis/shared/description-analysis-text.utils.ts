export interface TextWindow {
  text: string;
  start: number;
  end: number;
}

export function hasDescriptionText(description: string | null | undefined): description is string {
  return !!description?.trim();
}

export function normalizeAnalysisText(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[×✕]/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sentenceWindows(description: string): TextWindow[] {
  const windows: TextWindow[] = [];
  let start = 0;

  for (let index = 0; index < description.length; index++) {
    const character = description[index];

    if (!'.!?;'.includes(character) || isDecimalPoint(description, index)) {
      continue;
    }

    pushWindow(description, start, index + 1, windows);
    start = index + 1;
  }

  pushWindow(description, start, description.length, windows);

  return windows;
}

export function nearbyText(text: string, index: number, radius = 48): string {
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius)).toLowerCase();
}

export function uniqueByKey<T>(items: readonly T[], keyForItem: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyForItem(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function compactNumber(value: number): string {
  return Number.isInteger(value) ? `${ value }` : `${ Number.parseFloat(value.toFixed(2)) }`;
}

function pushWindow(description: string, start: number, end: number, windows: TextWindow[]): void {
  const text = description.slice(start, end).trim();

  if (!text) {
    return;
  }

  const leadingWhitespace = description.slice(start, end).search(/\S/);
  const adjustedStart = leadingWhitespace >= 0 ? start + leadingWhitespace : start;

  windows.push({
    text,
    start: adjustedStart,
    end
  });
}

export function isDecimalPoint(text: string, index: number): boolean {
  if (text[index] !== '.') {
    return false;
  }

  const previous = text[index - 1];
  const next = text[index + 1];

  return /\d/.test(previous ?? '') && /\d/.test(next ?? '');
}
