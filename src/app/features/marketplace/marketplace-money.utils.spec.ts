import {
  formatMarketplaceMinorUnits,
  getMarketplaceCurrencyFractionDigits,
  normalizeMarketplaceCurrency,
  parseMarketplacePriceToMinorUnits,
  SUPPORTED_MARKETPLACE_CURRENCIES
} from './marketplace-money.utils';

describe('marketplace-money.utils', () => {
  it('exposes common MVP currency suggestions', () => {
    expect(SUPPORTED_MARKETPLACE_CURRENCIES).toEqual([
      'EUR',
      'USD',
      'GBP',
      'CHF',
      'JPY',
      'CAD',
      'AUD'
    ]);
  });

  it('normalizes three-letter currency codes', () => {
    expect(normalizeMarketplaceCurrency(' eur ')).toBe('EUR');
    expect(normalizeMarketplaceCurrency('usd')).toBe('USD');
  });

  it('returns undefined for blank or malformed currency codes', () => {
    expect(normalizeMarketplaceCurrency('')).toBeUndefined();
    expect(normalizeMarketplaceCurrency('  ')).toBeUndefined();
    expect(normalizeMarketplaceCurrency(null)).toBeUndefined();
    expect(normalizeMarketplaceCurrency(undefined)).toBeUndefined();
    expect(normalizeMarketplaceCurrency('EU')).toBeUndefined();
    expect(normalizeMarketplaceCurrency('EURO')).toBeUndefined();
    expect(normalizeMarketplaceCurrency('12€')).toBeUndefined();
  });

  it('resolves currency fraction digits with a fallback', () => {
    expect(getMarketplaceCurrencyFractionDigits('EUR')).toBe(2);
    expect(getMarketplaceCurrencyFractionDigits('JPY')).toBe(0);
    expect(getMarketplaceCurrencyFractionDigits('not-a-code')).toBe(2);
    expect(getMarketplaceCurrencyFractionDigits('ZZZ')).toBe(2);
  });

  it('parses EUR and USD decimal values into integer minor units', () => {
    expect(parseMarketplacePriceToMinorUnits('123', 'EUR')).toBe(12300);
    expect(parseMarketplacePriceToMinorUnits('123.45', 'EUR')).toBe(12345);
    expect(parseMarketplacePriceToMinorUnits(123.4, 'USD')).toBe(12340);
  });

  it('parses comma decimals', () => {
    expect(parseMarketplacePriceToMinorUnits('123,45', 'EUR')).toBe(12345);
    expect(parseMarketplacePriceToMinorUnits('0,5', 'EUR')).toBe(50);
  });

  it('parses thousands separators', () => {
    expect(parseMarketplacePriceToMinorUnits('1 234,56', 'EUR')).toBe(123456);
    expect(parseMarketplacePriceToMinorUnits('1,234', 'EUR')).toBe(123400);
    expect(parseMarketplacePriceToMinorUnits('1.234', 'EUR')).toBe(123400);
    expect(parseMarketplacePriceToMinorUnits('1,234.56', 'USD')).toBe(123456);
    expect(parseMarketplacePriceToMinorUnits('1.234,56', 'EUR')).toBe(123456);
  });

  it('parses currency symbols and spacing', () => {
    expect(parseMarketplacePriceToMinorUnits('€ 12.34', 'EUR')).toBe(1234);
    expect(parseMarketplacePriceToMinorUnits('  $ 1,234.56 ', 'USD')).toBe(123456);
  });

  it('rejects values with too many decimals for the currency', () => {
    expect(parseMarketplacePriceToMinorUnits('12.3456', 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits('12,3456', 'EUR')).toBeUndefined();
  });

  it('rejects invalid, negative, non-finite, and malformed inputs', () => {
    expect(parseMarketplacePriceToMinorUnits('', 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits('  ', 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits(null, 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits(undefined, 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits('-12.34', 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits(Number.NaN, 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits(Number.POSITIVE_INFINITY, 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits('12.34.56', 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits('12,34,56', 'EUR')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits('EUR 12.34', 'EUR')).toBeUndefined();
  });

  it('supports JPY zero-decimal parsing', () => {
    expect(parseMarketplacePriceToMinorUnits('123', 'JPY')).toBe(123);
    expect(parseMarketplacePriceToMinorUnits('1,234', 'JPY')).toBe(1234);
    expect(parseMarketplacePriceToMinorUnits('123.45', 'JPY')).toBeUndefined();
    expect(parseMarketplacePriceToMinorUnits('123,0', 'JPY')).toBeUndefined();
  });

  it('formats integer minor units for display', () => {
    expect(formatMarketplaceMinorUnits(12345, 'EUR', 'en-US')).toBe('€123.45');
    expect(formatMarketplaceMinorUnits(12345, 'USD', 'en-US')).toBe('$123.45');
    expect(formatMarketplaceMinorUnits(123, 'JPY', 'en-US')).toBe('¥123');
  });

  it('returns an em dash for invalid display input', () => {
    expect(formatMarketplaceMinorUnits(null, 'EUR', 'en-US')).toBe('—');
    expect(formatMarketplaceMinorUnits(undefined, 'EUR', 'en-US')).toBe('—');
    expect(formatMarketplaceMinorUnits(Number.NaN, 'EUR', 'en-US')).toBe('—');
    expect(formatMarketplaceMinorUnits(Number.POSITIVE_INFINITY, 'EUR', 'en-US')).toBe('—');
    expect(formatMarketplaceMinorUnits(12.5, 'EUR', 'en-US')).toBe('—');
    expect(formatMarketplaceMinorUnits(-1, 'EUR', 'en-US')).toBe('—');
    expect(formatMarketplaceMinorUnits(123, 'EURO', 'en-US')).toBe('—');
    expect(formatMarketplaceMinorUnits(123, 'ZZZ', 'en-US')).toBe('—');
  });
});
