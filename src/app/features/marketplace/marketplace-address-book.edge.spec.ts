import {
  buildMarketplaceAddressChipLabel,
  buildMarketplaceAddressChipOptions,
  buildMarketplaceAddressPrivateSummary,
  buildMarketplaceShippingAddressTransactionSnapshot,
  normalizeMarketplaceAddressCountryCode,
  normalizeMarketplaceDefaultAddressSelection,
  normalizeMarketplaceShippingAddressSaveDraft,
  orderMarketplaceAddressChipsDefaultFirst,
  validateMarketplaceShippingAddressDraft
} from './marketplace-address-book.utils';

const full = {
  label: 'Home',
  recipientName: 'Ada Lovelace',
  line1: '1 Analytical St',
  city: 'London',
  postalCode: 'N1 9GU',
  countryCode: 'gb'
};

describe('marketplace address book — edge probing', () => {
  describe('country code', () => {
    it('accepts only two ASCII letters after trim/upper-casing', () => {
      expect(normalizeMarketplaceAddressCountryCode(' it ')).toBe('IT');
      for (const bad of ['', ' ', 'I', 'ITA', 'I1', '1T', 'İT', 'ＩＴ', 'I T', 'IT\n1', null, undefined]) {
        expect(normalizeMarketplaceAddressCountryCode(bad as string)).withContext(String(bad)).toBeUndefined();
      }
    });

    // Known quirk: toUpperCase() expands some non-ASCII letters before the A-Z check
    // ('ß' -> 'SS', 'ıt' -> 'IT'), so they are accepted as country codes.
    xit('rejects non-ASCII letters that upper-case into ASCII', () => {
      for (const bad of ['ß', 'ıt']) {
        expect(normalizeMarketplaceAddressCountryCode(bad)).withContext(bad).toBeUndefined();
      }
    });

    it('does not accept non-string input at runtime', () => {
      for (const bad of [12, {}, [], true]) {
        expect(() => normalizeMarketplaceAddressCountryCode(bad as never)).toThrow();
      }
    });
  });

  describe('validation', () => {
    it('whitespace-only required fields count as missing', () => {
      const result = validateMarketplaceShippingAddressDraft({label: ' ', recipientName: '\t', line1: '\n', city: '  ', countryCode: ' '});
      expect(Object.keys(result.errors).sort()).toEqual(['city', 'countryCode', 'label', 'line1', 'recipientName']);
      expect(result.valid).toBeFalse();
    });

    it('non-string field values are treated as missing, not as a crash', () => {
      const result = validateMarketplaceShippingAddressDraft({label: 5, recipientName: {}, line1: [], city: true, countryCode: 7} as never);
      expect(result.valid).toBeFalse();
      expect(Object.keys(result.errors).length).toBe(5);
    });

    it('a malformed but present country reports the format error, not "Required"', () => {
      const result = validateMarketplaceShippingAddressDraft({...full, countryCode: 'GBR'});
      expect(result.errors.countryCode).toBe('Use a two-letter country code');
    });

    it('postal code and phone never block validation', () => {
      expect(validateMarketplaceShippingAddressDraft({...full, postalCode: null, phone: null}).valid).toBeTrue();
    });
  });

  describe('save draft', () => {
    it('trims, uppercases the country, nulls blank optionals and never carries phone or id', () => {
      const normalized = normalizeMarketplaceShippingAddressSaveDraft({
        ...full,
        label: '  Home  ',
        line2: '   ',
        region: null,
        postalCode: '  ',
        phone: '+44 20 7946 0000',
        id: 'abc',
        isDefault: true
      } as never);
      expect(normalized).toEqual({
        label: 'Home', recipientName: 'Ada Lovelace', line1: '1 Analytical St', line2: null, city: 'London',
        region: null, postalCode: null, countryCode: 'GB', isDefault: true
      });
      expect(Object.keys(normalized!)).not.toContain('phone');
      expect(Object.keys(normalized!)).not.toContain('id');
    });

    it('isDefault is true only for the literal boolean true', () => {
      for (const value of ['true', 1, 'yes', null, undefined, {}]) {
        expect(normalizeMarketplaceShippingAddressSaveDraft({...full, isDefault: value as never})!.isDefault)
          .withContext(String(value)).toBeFalse();
      }
    });

    it('returns null when any required field is missing or the country is invalid', () => {
      for (const field of ['label', 'recipientName', 'line1', 'city', 'countryCode'] as const) {
        expect(normalizeMarketplaceShippingAddressSaveDraft({...full, [field]: ''})).withContext(field).toBeNull();
      }
      expect(normalizeMarketplaceShippingAddressSaveDraft({...full, countryCode: 'ZZZ'})).toBeNull();
    });
  });

  describe('transaction snapshot', () => {
    it('requires a postal code even though validation treats it as optional', () => {
      expect(validateMarketplaceShippingAddressDraft({...full, postalCode: undefined}).valid).toBeTrue();
      expect(buildMarketplaceShippingAddressTransactionSnapshot({...full, postalCode: undefined})).toBeNull();
      expect(buildMarketplaceShippingAddressTransactionSnapshot({...full, postalCode: '   '})).toBeNull();
    });

    it('private summary never includes street, name, postal code or phone', () => {
      const snapshot = buildMarketplaceShippingAddressTransactionSnapshot({...full, phone: '+44 1'})!;
      expect(snapshot.privateSummary).toBe('London, GB');
      for (const secret of ['Analytical', 'Ada', 'N1 9GU', '+44']) {
        expect(snapshot.privateSummary).not.toContain(secret);
      }
    });

    it('is a detached copy of primitives only', () => {
      const draft = {...full, line2: 'Flat 2'};
      const snapshot = buildMarketplaceShippingAddressTransactionSnapshot(draft)!;
      draft.line1 = 'changed';
      expect(snapshot.line1).toBe('1 Analytical St');
      expect(Object.values(snapshot).every(v => typeof v === 'string')).toBeTrue();
    });
  });

  describe('private summary and chip labels', () => {
    it('falls back through city, country and a generic label', () => {
      expect(buildMarketplaceAddressPrivateSummary({city: 'Rome', countryCode: 'it'})).toBe('Rome, IT');
      expect(buildMarketplaceAddressPrivateSummary({city: 'Rome', countryCode: 'ITA'})).toBe('Rome');
      expect(buildMarketplaceAddressPrivateSummary({city: ' ', countryCode: 'it'})).toBe('IT');
      expect(buildMarketplaceAddressPrivateSummary({city: null, countryCode: null})).toBe('Private address');
    });

    it('chip label combines label and destination, else whichever exists, else a generic name', () => {
      expect(buildMarketplaceAddressChipLabel({label: 'Home', city: 'Rome', countryCode: 'IT'})).toBe('Home · Rome, IT');
      expect(buildMarketplaceAddressChipLabel({label: 'Home'})).toBe('Home');
      expect(buildMarketplaceAddressChipLabel({city: 'Rome', countryCode: 'IT'})).toBe('Rome, IT');
      expect(buildMarketplaceAddressChipLabel({})).toBe('Saved address');
    });
  });

  describe('chip options', () => {
    const address = (id: string, over: Record<string, unknown> = {}) => ({id, ...full, ...over});

    it('marks invalid addresses disabled with a reason and still lists them', () => {
      const options = buildMarketplaceAddressChipOptions([address('a'), address('b', {line1: ''})]);
      expect(options.map(o => o.disabled)).toEqual([false, true]);
      expect(options[1].disabledReason).toBe('Address is incomplete');
      expect(options[0].disabledReason).toBeUndefined();
    });

    it('selection matches by id only and tolerates null/undefined/unknown ids', () => {
      for (const selected of [null, undefined, 'zzz', '']) {
        expect(buildMarketplaceAddressChipOptions([address('a')], selected).some(o => o.isSelected)).withContext(String(selected)).toBeFalse();
      }
      expect(buildMarketplaceAddressChipOptions([address('a'), address('b')], 'b').map(o => o.isSelected)).toEqual([false, true]);
    });

    it('handles empty lists', () => {
      expect(buildMarketplaceAddressChipOptions([])).toEqual([]);
    });
  });

  describe('ordering and default selection', () => {
    it('default-first ordering is stable and does not mutate the input', () => {
      const input: {n: number; isDefault?: boolean}[] = [{n: 1}, {n: 2, isDefault: true}, {n: 3}, {n: 4, isDefault: true}];
      const snapshot = JSON.stringify(input);
      expect(orderMarketplaceAddressChipsDefaultFirst(input).map(a => a.n)).toEqual([2, 4, 1, 3]);
      expect(JSON.stringify(input)).toBe(snapshot);
    });

    it('selection produces exactly one default and never mutates inputs', () => {
      const input: {id: string; isDefault?: boolean}[] = [{id: 'a', isDefault: true}, {id: 'b'}, {id: 'c', isDefault: true}];
      const snapshot = JSON.stringify(input);
      const result = normalizeMarketplaceDefaultAddressSelection(input, 'b');
      expect(result.map(a => a.isDefault)).toEqual([false, true, false]);
      expect(JSON.stringify(input)).toBe(snapshot);
    });

    it('an unknown selected id falls back to the first existing default, then to index 0', () => {
      expect(normalizeMarketplaceDefaultAddressSelection<{id: string; isDefault?: boolean}>([{id: 'a'}, {id: 'b', isDefault: true}], 'nope').map(a => a.isDefault)).toEqual([false, true]);
      expect(normalizeMarketplaceDefaultAddressSelection<{id: string; isDefault?: boolean}>([{id: 'a'}, {id: 'b'}], 'nope').map(a => a.isDefault)).toEqual([true, false]);
    });

    it('collapses multiple defaults to exactly one even with no selection', () => {
      const result = normalizeMarketplaceDefaultAddressSelection<{id: string; isDefault?: boolean}>([{id: 'a', isDefault: true}, {id: 'b', isDefault: true}]);
      expect(result.filter(a => a.isDefault).length).toBe(1);
      expect(result[0].isDefault).toBeTrue();
    });

    it('returns an empty list for no addresses', () => {
      expect(normalizeMarketplaceDefaultAddressSelection([], 'a')).toEqual([]);
    });
  });
});
