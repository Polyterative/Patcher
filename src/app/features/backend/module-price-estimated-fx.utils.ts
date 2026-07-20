// Approximate frontend-only rates for relative sorting/summary, not settlement.
export const ESTIMATED_MODULE_PRICE_CURRENCY_TO_EUR_RATE: Readonly<Record<string, number>> = {
  AUD: 0.61,
  CAD: 0.68,
  CHF: 1.07,
  EUR: 1,
  GBP: 1.17,
  JPY: 0.0062,
  NOK: 0.085,
  USD: 0.92
};

const DEFAULT_FRACTION_DIGITS = 2;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export function normalizeEstimatedModulePriceToEurMinor(
  priceAmountMinor: number | null | undefined,
  currency: string | null | undefined
): number | null {
  const normalizedCurrency = currency?.trim().toUpperCase();
  if (
    priceAmountMinor === null ||
    priceAmountMinor === undefined ||
    !normalizedCurrency
  ) {
    return null;
  }

  const eurRate = ESTIMATED_MODULE_PRICE_CURRENCY_TO_EUR_RATE[normalizedCurrency];
  if (eurRate === undefined) {
    return null;
  }

  const fractionDigits = getEstimatedModulePriceCurrencyFractionDigits(normalizedCurrency);
  const sourceMajorAmount = priceAmountMinor / 10 ** fractionDigits;
  return Math.round(sourceMajorAmount * eurRate * 100);
}

export function formatEstimatedModulePriceMinorUnits(
  priceAmountMinor: number | null | undefined,
  currency: string | null | undefined,
  locale?: string
): string | null {
  const normalizedCurrency = currency?.trim().toUpperCase();
  if (
    priceAmountMinor === null ||
    priceAmountMinor === undefined ||
    !Number.isFinite(priceAmountMinor) ||
    !Number.isInteger(priceAmountMinor) ||
    priceAmountMinor < 0 ||
    !normalizedCurrency ||
    !CURRENCY_CODE_PATTERN.test(normalizedCurrency)
  ) {
    return null;
  }

  const fractionDigits = getEstimatedModulePriceCurrencyFractionDigits(normalizedCurrency);
  const sourceMajorAmount = priceAmountMinor / 10 ** fractionDigits;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'narrowSymbol'
    }).format(sourceMajorAmount);
  } catch {
    return null;
  }
}

export function getEstimatedModulePriceCurrencyFractionDigits(currency: string): number {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!CURRENCY_CODE_PATTERN.test(normalizedCurrency)) {
    return DEFAULT_FRACTION_DIGITS;
  }

  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: normalizedCurrency
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    return DEFAULT_FRACTION_DIGITS;
  }
}
