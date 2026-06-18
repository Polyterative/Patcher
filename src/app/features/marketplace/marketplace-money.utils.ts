export const SUPPORTED_MARKETPLACE_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'JPY',
  'CAD',
  'AUD'
] as const;

const INVALID_AMOUNT_DISPLAY = '—';
const DEFAULT_FRACTION_DIGITS = 2;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_SYMBOL_PATTERN = /\p{Sc}/gu;
const NEGATIVE_SIGN_PATTERN = /[-−﹣－]/u;
const ALLOWED_PRICE_INPUT_PATTERN = /^[\d.,'\s]+$/u;

interface ParsedDecimalParts {
  whole: string;
  fraction: string;
}

export function normalizeMarketplaceCurrency(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();

  if (!normalized || !CURRENCY_CODE_PATTERN.test(normalized)) {
    return undefined;
  }

  return normalized;
}

export function getMarketplaceCurrencyFractionDigits(currency: string): number {
  const normalizedCurrency = normalizeMarketplaceCurrency(currency);

  if (!normalizedCurrency || !isIntlCurrencySupported(normalizedCurrency)) {
    return DEFAULT_FRACTION_DIGITS;
  }

  try {
    return new Intl.NumberFormat('en', {
      currency: normalizedCurrency,
      style: 'currency'
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    return DEFAULT_FRACTION_DIGITS;
  }
}

export function parseMarketplacePriceToMinorUnits(
  input: string | number | null | undefined,
  currency: string
): number | undefined {
  const currencyCode = normalizeMarketplaceCurrency(currency);

  if (!currencyCode) {
    return undefined;
  }

  const rawInput = normalizePriceInput(input);

  if (!rawInput) {
    return undefined;
  }

  const fractionDigits = getMarketplaceCurrencyFractionDigits(currencyCode);
  const decimalParts = parseDecimalParts(rawInput, fractionDigits);

  if (!decimalParts || decimalParts.fraction.length > fractionDigits) {
    return undefined;
  }

  return decimalPartsToMinorUnits(decimalParts, fractionDigits);
}

export function formatMarketplaceMinorUnits(
  amountMinor: number | null | undefined,
  currency: string,
  locale?: string
): string {
  const currencyCode = normalizeMarketplaceCurrency(currency);

  if (
    amountMinor === null ||
    amountMinor === undefined ||
    !Number.isFinite(amountMinor) ||
    !Number.isInteger(amountMinor) ||
    amountMinor < 0 ||
    !currencyCode ||
    !isIntlCurrencySupported(currencyCode)
  ) {
    return INVALID_AMOUNT_DISPLAY;
  }

  const fractionDigits = getMarketplaceCurrencyFractionDigits(currencyCode);
  const majorAmount = amountMinor / 10 ** fractionDigits;

  try {
    return new Intl.NumberFormat(locale, {
      currency: currencyCode,
      style: 'currency'
    }).format(majorAmount);
  } catch {
    return INVALID_AMOUNT_DISPLAY;
  }
}

function normalizePriceInput(input: string | number | null | undefined): string | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (typeof input === 'number' && !Number.isFinite(input)) {
    return undefined;
  }

  const rawInput = String(input).trim();

  if (!rawInput || NEGATIVE_SIGN_PATTERN.test(rawInput)) {
    return undefined;
  }

  const withoutCurrencySymbols = rawInput
    .replace(CURRENCY_SYMBOL_PATTERN, '')
    .trim();

  if (!withoutCurrencySymbols || !ALLOWED_PRICE_INPUT_PATTERN.test(withoutCurrencySymbols)) {
    return undefined;
  }

  return withoutCurrencySymbols.replace(/[\s']/gu, '');
}

function parseDecimalParts(input: string, fractionDigits: number): ParsedDecimalParts | undefined {
  if (!input || !/^\d*[.,]?\d*$/u.test(input) && !/^[\d.,]+$/u.test(input)) {
    return undefined;
  }

  const hasDot = input.includes('.');
  const hasComma = input.includes(',');

  if (hasDot && hasComma) {
    return parseMixedSeparatorDecimalParts(input, fractionDigits);
  }

  if (hasDot || hasComma) {
    return parseSingleSeparatorDecimalParts(input, hasDot ? '.' : ',', fractionDigits);
  }

  return /^\d+$/u.test(input) ? {whole: input, fraction: ''} : undefined;
}

function parseMixedSeparatorDecimalParts(input: string, fractionDigits: number): ParsedDecimalParts | undefined {
  const dotIndex = input.lastIndexOf('.');
  const commaIndex = input.lastIndexOf(',');
  const decimalSeparator = dotIndex > commaIndex ? '.' : ',';
  const groupingSeparator = decimalSeparator === '.' ? ',' : '.';
  const decimalIndex = Math.max(dotIndex, commaIndex);
  const wholeWithGrouping = input.slice(0, decimalIndex);
  const fraction = input.slice(decimalIndex + 1);

  if (!fraction || fraction.includes('.') || fraction.includes(',') || fraction.length > fractionDigits) {
    return undefined;
  }

  if (wholeWithGrouping.includes(groupingSeparator) && !isValidGroupedInteger(wholeWithGrouping, groupingSeparator)) {
    return undefined;
  }

  const whole = wholeWithGrouping.replaceAll(groupingSeparator, '');

  if (!/^\d+$/u.test(whole) || !/^\d+$/u.test(fraction)) {
    return undefined;
  }

  return {whole, fraction};
}

function parseSingleSeparatorDecimalParts(
  input: string,
  separator: string,
  fractionDigits: number
): ParsedDecimalParts | undefined {
  const separatorCount = countOccurrences(input, separator);

  if (separatorCount > 1) {
    if (!isValidGroupedInteger(input, separator)) {
      return undefined;
    }

    return {whole: input.replaceAll(separator, ''), fraction: ''};
  }

  const [wholeCandidate, fractionCandidate] = input.split(separator);

  if (fractionCandidate === undefined || fractionCandidate === '') {
    return undefined;
  }

  if (
    fractionDigits > 0 &&
    fractionCandidate.length <= fractionDigits &&
    /^\d*$/u.test(wholeCandidate) &&
    /^\d+$/u.test(fractionCandidate)
  ) {
    return {
      whole: wholeCandidate || '0',
      fraction: fractionCandidate
    };
  }

  if (isValidGroupedInteger(input, separator)) {
    return {whole: input.replaceAll(separator, ''), fraction: ''};
  }

  return undefined;
}

function isValidGroupedInteger(input: string, separator: string): boolean {
  const groups = input.split(separator);

  return groups.length > 1 &&
    /^\d{1,3}$/u.test(groups[0]) &&
    groups.slice(1).every(group => /^\d{3}$/u.test(group));
}

function decimalPartsToMinorUnits(parts: ParsedDecimalParts, fractionDigits: number): number | undefined {
  const whole = trimLeadingZeroes(parts.whole);
  const paddedFraction = parts.fraction.padEnd(fractionDigits, '0');
  const wholeMultiplier = BigInt(10 ** fractionDigits);
  const wholeMinor = BigInt(whole) * wholeMultiplier;
  const fractionMinor = paddedFraction ? BigInt(paddedFraction) : 0n;
  const minorUnits = wholeMinor + fractionMinor;

  if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    return undefined;
  }

  return Number(minorUnits);
}

function trimLeadingZeroes(value: string): string {
  return value.replace(/^0+(?=\d)/u, '') || '0';
}

function countOccurrences(input: string, value: string): number {
  return input.split(value).length - 1;
}

function isIntlCurrencySupported(currency: string): boolean {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'currency') => string[];
  };

  if (!intlWithSupportedValues.supportedValuesOf) {
    return true;
  }

  return intlWithSupportedValues.supportedValuesOf('currency').includes(currency);
}
