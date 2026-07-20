const DEFAULT_FRACTION_DIGITS = 2;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export function normalizePriceHubCurrency(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && CURRENCY_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function getPriceHubCurrencyFractionDigits(currency: string | null | undefined): number {
  const normalizedCurrency = normalizePriceHubCurrency(currency);

  if (!normalizedCurrency) {
    return DEFAULT_FRACTION_DIGITS;
  }

  try {
    return new Intl.NumberFormat('en', {
      currency: normalizedCurrency,
      style: 'currency',
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    return DEFAULT_FRACTION_DIGITS;
  }
}

export function parsePriceHubDecimalAmountToMinorUnits(
  value: string | number | null | undefined,
  currency: string | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null;
  }

  const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
  const fractionDigits = getPriceHubCurrencyFractionDigits(currency);
  const decimalPattern = fractionDigits === 0
    ? /^\d+$/
    : new RegExp(`^\\d+(?:\\.\\d{1,${fractionDigits}})?$`);

  if (!decimalPattern.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  const paddedFraction = fraction.padEnd(fractionDigits, '0');
  const multiplier = BigInt(10 ** fractionDigits);
  const minorUnits = BigInt(whole) * multiplier + (paddedFraction ? BigInt(paddedFraction) : 0n);

  if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }

  return Number(minorUnits);
}

export function formatPriceHubMinorUnitsAsDecimalString(
  amountMinor: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (
    amountMinor === null ||
    amountMinor === undefined ||
    !Number.isFinite(amountMinor) ||
    !Number.isInteger(amountMinor) ||
    amountMinor < 0
  ) {
    return null;
  }

  const fractionDigits = getPriceHubCurrencyFractionDigits(currency);
  const multiplier = 10 ** fractionDigits;

  if (fractionDigits === 0) {
    return String(amountMinor);
  }

  const whole = Math.trunc(amountMinor / multiplier);
  const fraction = String(amountMinor % multiplier).padStart(fractionDigits, '0');
  return `${whole}.${fraction}`;
}
