import {
  formatMarketplaceMinorUnits,
  parseMarketplacePriceToMinorUnits
} from './marketplace-money.utils';

describe('marketplace-money.utils — edge probing', () => {
  const parse = (input: string | number | null | undefined, currency = 'EUR') =>
    parseMarketplacePriceToMinorUnits(input, currency);

  describe('accepted shapes', () => {
    const cases: [string | number, number][] = [
      ['0', 0],
      ['0.00', 0],
      ['00012', 1200],
      ['1', 100],
      ['1.5', 150],
      ['1,5', 150],
      ['1.05', 105],
      ['.5', 50],
      [',5', 50],
      ['1,234', 123400],
      ['1.234', 123400],
      ['12,345', 1234500],
      ['1,234,567', 123456700],
      ['1.234.567', 123456700],
      ['1,234.56', 123456],
      ['1.234,56', 123456],
      ['1.234.567,89', 123456789],
      ['1,234,567.89', 123456789],
      ["1'234.56", 123456],
      ['1 234,56', 123456],
      ['  19.99  ', 1999],
      ['€19.99', 1999],
      ['19.99 €', 1999],
      ['$ 5', 500],
      [19.99, 1999],
      [0.1, 10],
      [5, 500],
      [1234.5, 123450]
    ];

    for (const [input, expected] of cases) {
      it(`parses ${JSON.stringify(input)} as ${expected}`, () => {
        expect(parse(input)).toBe(expected);
      });
    }
  });

  describe('rejected shapes', () => {
    const cases: (string | number | null | undefined)[] = [
      '', ' ', 'abc', '1e3', '1e-7', '0x10', '1_000', '--1', '-1', '−1', '－1', '(5)',
      '5.', '5,', '.', ',', '..', '1..2', '1,,234', '1.2.3', '1,2,3', '1.23,4', '1,23.4,5',
      '12,34,567', '1,23,456', '1234,567', '1.234.56', '1.234,5,6', '1.234,567',
      '1 2 3a', '١٢٣', '1 000a',
      '<script>', "1'; DROP TABLE", '1/2', '1+1', 'NaN', 'Infinity',
      NaN, Infinity, -Infinity, -0.01, 1e21, 1e-7, 0.1 + 0.2,
      null, undefined
    ];

    for (const input of cases) {
      it(`rejects ${String(input)}`, () => {
        expect(parse(input as string)).withContext(JSON.stringify(input)).toBeUndefined();
      });
    }
  });

  describe('safe-integer ceiling', () => {
    it('accepts the largest representable price and rejects one minor unit above', () => {
      expect(parse('90071992547409.91')).toBe(Number.MAX_SAFE_INTEGER);
      expect(parse('90071992547409.92')).toBeUndefined();
      expect(parse('999999999999999999999')).toBeUndefined();
    });

    it('does not lose precision just below the ceiling', () => {
      expect(Number.isSafeInteger(parse('90071992547409.90') as number)).toBeTrue();
      expect(parse('90071992547409.90')).toBe(9007199254740990);
    });
  });

  describe('currency fraction digits', () => {
    it('JPY accepts only whole units (or grouped thousands)', () => {
      expect(parse('1500', 'JPY')).toBe(1500);
      expect(parse('1,500', 'JPY')).toBe(1500);
      expect(parse('1.500', 'JPY')).toBe(1500);
      expect(parse('1,5', 'JPY')).toBeUndefined();
      expect(parse('1.5', 'JPY')).toBeUndefined();
      expect(parse('15.50', 'JPY')).toBeUndefined();
    });

    it('is case/space insensitive for the currency code and rejects bad codes', () => {
      expect(parse('5', ' eur ')).toBe(500);
      for (const bad of ['', 'EU', 'EURO', '€€€', '12A', 'e r']) {
        expect(parse('5', bad)).withContext(bad).toBeUndefined();
      }
    });

    // Known gap: parse only checks the code's shape, so listings can be saved in a currency that
    // formatMarketplaceMinorUnits then renders as an em dash. Enable once parse/validation reject it.
    xit('rejects well-formed but unsupported currency codes', () => {
      expect(parse('5.25', 'ZZZ')).toBeUndefined();
    });

    it('treats a three-digit trailing group as thousands (ambiguous input is read as grouping)', () => {
      expect(parse('19.999')).toBe(1999900);
    });

    // Known gap: a leading zero group ("0.001") is read as 1,000-grouping and becomes 1.00 EUR.
    xit('rejects a zero-led thousands group', () => {
      expect(parse('0.001')).toBeUndefined();
    });
  });

  describe('format', () => {
    it('rejects negative, fractional, non-finite and nullish minor units', () => {
      for (const bad of [-1, 1.5, NaN, Infinity, null, undefined]) {
        expect(formatMarketplaceMinorUnits(bad as number, 'EUR', 'en')).withContext(String(bad)).toBe('—');
      }
    });

    it('rejects bad or unknown currency codes', () => {
      for (const bad of ['', 'EU', 'ZZZ', '123']) {
        expect(formatMarketplaceMinorUnits(100, bad, 'en')).withContext(bad).toBe('—');
      }
    });

    it('does not throw on a malformed locale', () => {
      expect(() => formatMarketplaceMinorUnits(100, 'EUR', 'not a locale')).not.toThrow();
    });

    it('formats zero and large values', () => {
      expect(formatMarketplaceMinorUnits(0, 'EUR', 'en')).toBe('€0.00');
      expect(formatMarketplaceMinorUnits(123456, 'USD', 'en')).toBe('$1,234.56');
      expect(formatMarketplaceMinorUnits(1500, 'JPY', 'en')).toContain('1,500');
    });
  });

  describe('round trip', () => {
    const amounts = [0, 1, 9, 10, 99, 100, 101, 999, 1000, 99999, 100000, 123456, 1000000, 99999999, 4294967296];

    for (const currency of ['EUR', 'USD', 'GBP', 'JPY']) {
      it(`parse(format(x)) === x for ${currency} in en`, () => {
        for (const minor of amounts) {
          const text = formatMarketplaceMinorUnits(minor, currency, 'en');
          expect(parse(text, currency)).withContext(`${currency} ${minor} -> ${text}`).toBe(minor);
        }
      });
    }

    it('round trips plain decimal strings produced from minor units', () => {
      for (const minor of amounts) {
        const text = `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
        expect(parse(text)).withContext(text).toBe(minor);
      }
    });
  });
});
