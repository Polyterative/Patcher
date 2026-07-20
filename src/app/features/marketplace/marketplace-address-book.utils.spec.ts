import {
  buildMarketplaceAddressChipLabel,
  buildMarketplaceAddressChipOptions,
  buildMarketplaceAddressPrivateSummary,
  buildMarketplaceShippingAddressTransactionSnapshot,
  normalizeMarketplaceAddressCountryCode,
  normalizeMarketplaceDefaultAddressSelection,
  orderMarketplaceAddressChipsDefaultFirst,
  type MarketplaceAddressChipPickerAddress,
  type MarketplaceShippingAddressDraft,
  validateMarketplaceShippingAddressDraft
} from './marketplace-address-book.utils';

describe('marketplace-address-book.utils', () => {
  it('normalizes ISO alpha-2 shaped country codes', () => {
    expect(normalizeMarketplaceAddressCountryCode(' it ')).toBe('IT');
    expect(normalizeMarketplaceAddressCountryCode('USA')).toBeUndefined();
    expect(normalizeMarketplaceAddressCountryCode('1T')).toBeUndefined();
    expect(normalizeMarketplaceAddressCountryCode(null)).toBeUndefined();
  });

  it('validates required private address fields while keeping postal code and phone optional', () => {
    const result = validateMarketplaceShippingAddressDraft({
      label: 'Home',
      recipientName: 'Ada Lovelace',
      line1: 'Via Roma 1',
      city: 'Milan',
      countryCode: 'it',
      phone: null
    });

    expect(result.valid).toBeTrue();
    expect(result.errors).toEqual({});
  });

  it('reports missing required fields and malformed countries', () => {
    const result = validateMarketplaceShippingAddressDraft({
      label: ' ',
      recipientName: '',
      line1: null,
      city: undefined,
      postalCode: ' ',
      countryCode: 'Italy'
    });

    expect(result.valid).toBeFalse();
    expect(result.errors).toEqual({
      city: 'Required',
      countryCode: 'Use a two-letter country code',
      label: 'Required',
      line1: 'Required',
      recipientName: 'Required'
    });
  });

  it('builds private destination summaries without exposing street data', () => {
    expect(buildMarketplaceAddressPrivateSummary({city: ' Milan ', countryCode: 'it'})).toBe('Milan, IT');
    expect(buildMarketplaceAddressPrivateSummary({city: null, countryCode: 'gb'})).toBe('GB');
    expect(buildMarketplaceAddressPrivateSummary({city: '', countryCode: ''})).toBe('Private address');
  });

  it('builds privacy-safe address chip labels from label and broad destination only', () => {
    const chipLabel = buildMarketplaceAddressChipLabel({
      city: ' Milan ',
      countryCode: 'it',
      label: ' Home ',
      line1: 'Via Roma 1',
      phone: '+39 02 1234',
      postalCode: '20100',
      recipientName: 'Ada Lovelace'
    } as MarketplaceShippingAddressDraft);

    expect(chipLabel).toBe('Home · Milan, IT');
    expect(chipLabel).not.toContain('Ada Lovelace');
    expect(chipLabel).not.toContain('Via Roma 1');
    expect(chipLabel).not.toContain('20100');
    expect(chipLabel).not.toContain('+39');
  });

  it('falls back to private-safe address chip labels when label or location is missing', () => {
    expect(buildMarketplaceAddressChipLabel({city: 'Paris', countryCode: 'fr', label: ''})).toBe('Paris, FR');
    expect(buildMarketplaceAddressChipLabel({city: null, countryCode: null, label: 'Studio'})).toBe('Studio');
    expect(buildMarketplaceAddressChipLabel({city: ' ', countryCode: ' ', label: ' '})).toBe('Saved address');
  });

  it('builds a private transaction snapshot from whitelisted shipping fields', () => {
    const snapshot = buildMarketplaceShippingAddressTransactionSnapshot({
      label: 'Home',
      recipientName: 'Ada Lovelace',
      line1: 'Via Roma 1',
      line2: 'Apartment 4',
      city: 'Milan',
      region: 'Lombardy',
      postalCode: '20100',
      countryCode: 'IT',
      phone: '+39 02 1234'
    });

    expect(snapshot).toEqual({
      city: 'Milan',
      countryCode: 'IT',
      line1: 'Via Roma 1',
      line2: 'Apartment 4',
      phone: '+39 02 1234',
      postalCode: '20100',
      privateSummary: 'Milan, IT',
      recipientName: 'Ada Lovelace',
      region: 'Lombardy'
    });
  });

  it('trims snapshot text, normalizes country, and omits blank optional phone data', () => {
    const snapshot = buildMarketplaceShippingAddressTransactionSnapshot({
      label: ' Studio ',
      recipientName: ' Grace Hopper ',
      line1: ' 1 Compiler Way ',
      line2: '  ',
      city: ' London ',
      region: '  ',
      postalCode: ' SW1A 1AA ',
      countryCode: ' gb ',
      phone: '   '
    });

    expect(snapshot).toEqual({
      city: 'London',
      countryCode: 'GB',
      line1: '1 Compiler Way',
      postalCode: 'SW1A 1AA',
      privateSummary: 'London, GB',
      recipientName: 'Grace Hopper'
    });
  });

  it('returns null for invalid address drafts before snapshotting', () => {
    expect(buildMarketplaceShippingAddressTransactionSnapshot({
      label: 'Home',
      recipientName: 'Ada Lovelace',
      line1: 'Via Roma 1',
      city: 'Milan',
      postalCode: '20100',
      countryCode: 'Italy'
    })).toBeNull();

    expect(buildMarketplaceShippingAddressTransactionSnapshot({
      label: '',
      recipientName: 'Ada Lovelace',
      line1: 'Via Roma 1',
      city: 'Milan',
      postalCode: '20100',
      countryCode: 'IT'
    })).toBeNull();
  });

  it('ignores malformed optional snapshot fields instead of throwing', () => {
    const snapshot = buildMarketplaceShippingAddressTransactionSnapshot({
      label: 'Home',
      recipientName: 'Ada Lovelace',
      line1: 'Via Roma 1',
      line2: { unsafe: true },
      city: 'Milan',
      region: 123,
      postalCode: '20100',
      countryCode: 'IT',
      phone: ['+39 02 1234']
    } as unknown as MarketplaceShippingAddressDraft);

    expect(snapshot).toEqual({
      city: 'Milan',
      countryCode: 'IT',
      line1: 'Via Roma 1',
      postalCode: '20100',
      privateSummary: 'Milan, IT',
      recipientName: 'Ada Lovelace'
    });
  });

  it('excludes live-row-only and unknown fields from transaction snapshots', () => {
    const draft = {
      createdAt: '2026-07-07T12:00:00Z',
      id: 'address-row-1',
      isDefault: true,
      label: 'Home',
      line1: 'Via Roma 1',
      ownerProfileId: 'profile-1',
      profileid: 'profile-1',
      recipientName: 'Ada Lovelace',
      secretInstruction: 'do not serialize',
      updatedAt: '2026-07-07T12:05:00Z',
      city: 'Milan',
      postalCode: '20100',
      countryCode: 'IT'
    } as MarketplaceShippingAddressDraft & Record<string, unknown>;

    const snapshot = buildMarketplaceShippingAddressTransactionSnapshot(draft);

    expect(snapshot).toEqual({
      city: 'Milan',
      countryCode: 'IT',
      line1: 'Via Roma 1',
      postalCode: '20100',
      privateSummary: 'Milan, IT',
      recipientName: 'Ada Lovelace'
    });
    expect(snapshot).not.toEqual(jasmine.objectContaining({
      createdAt: jasmine.anything(),
      id: jasmine.anything(),
      isDefault: jasmine.anything(),
      label: jasmine.anything(),
      ownerProfileId: jasmine.anything(),
      profileid: jasmine.anything(),
      secretInstruction: jasmine.anything(),
      updatedAt: jasmine.anything()
    }));
  });

  it('copies primitive snapshot values so later draft edits cannot mutate it', () => {
    const draft: MarketplaceShippingAddressDraft = {
      label: 'Home',
      recipientName: 'Ada Lovelace',
      line1: 'Via Roma 1',
      city: 'Milan',
      postalCode: '20100',
      countryCode: 'IT',
      phone: '+39 02 1234'
    };
    const snapshot = buildMarketplaceShippingAddressTransactionSnapshot(draft);

    draft.recipientName = 'Grace Hopper';
    draft.line1 = '1 Compiler Way';
    draft.city = 'London';
    draft.countryCode = 'GB';
    draft.phone = '+44 20 1234';

    expect(snapshot).toEqual({
      city: 'Milan',
      countryCode: 'IT',
      line1: 'Via Roma 1',
      phone: '+39 02 1234',
      postalCode: '20100',
      privateSummary: 'Milan, IT',
      recipientName: 'Ada Lovelace'
    });
  });

  it('orders address chip options default-first while preserving non-default order', () => {
    const ordered = orderMarketplaceAddressChipsDefaultFirst([
      {id: 'studio', isDefault: false},
      {id: 'home', isDefault: true},
      {id: 'tour', isDefault: false},
      {id: 'office', isDefault: true}
    ]);

    expect(ordered.map(address => address.id)).toEqual(['home', 'office', 'studio', 'tour']);
  });

  it('marks selected, default, and disabled invalid address chip option state', () => {
    const options = buildMarketplaceAddressChipOptions([
      createChipAddress({
        id: 'home',
        isDefault: true,
        label: 'Home'
      }),
      createChipAddress({
        city: '',
        id: 'broken',
        label: 'Broken'
      })
    ], 'broken');

    expect(options).toEqual([
      jasmine.objectContaining({
        chipLabel: 'Home · Milan, IT',
        disabled: false,
        id: 'home',
        isDefault: true,
        isSelected: false,
        privateSummary: 'Milan, IT'
      }),
      jasmine.objectContaining({
        chipLabel: 'Broken · IT',
        disabled: true,
        disabledReason: 'Address is incomplete',
        id: 'broken',
        isDefault: false,
        isSelected: true,
        privateSummary: 'IT'
      })
    ]);
  });

  it('excludes unknown and sensitive address fields from address chip options', () => {
    const [option] = buildMarketplaceAddressChipOptions([
      {
        ...createChipAddress({
          id: 'home',
          label: 'Home'
        }),
        createdAt: '2026-07-07T12:00:00Z',
        ownerProfileId: 'profile-1',
        secretInstruction: 'leave by the gate',
        updatedAt: '2026-07-07T12:05:00Z'
      } as MarketplaceAddressChipPickerAddress & Record<string, unknown>
    ], 'home');

    expect(option).toEqual({
      chipLabel: 'Home · Milan, IT',
      disabled: false,
      id: 'home',
      isDefault: false,
      isSelected: true,
      privateSummary: 'Milan, IT'
    });
    expect(option).not.toEqual(jasmine.objectContaining({
      createdAt: jasmine.anything(),
      line1: jasmine.anything(),
      ownerProfileId: jasmine.anything(),
      phone: jasmine.anything(),
      postalCode: jasmine.anything(),
      recipientName: jasmine.anything(),
      secretInstruction: jasmine.anything(),
      updatedAt: jasmine.anything()
    }));
  });

  it('ensures exactly one default address when a selected address becomes default', () => {
    const normalized = normalizeMarketplaceDefaultAddressSelection([
      {id: 'home', isDefault: true, label: 'Home'},
      {id: 'studio', isDefault: true, label: 'Studio'},
      {id: 'tour', isDefault: false, label: 'Tour'}
    ], 'tour');

    expect(normalized.map(address => address.isDefault)).toEqual([false, false, true]);
    expect(normalized.filter(address => address.isDefault).length).toBe(1);
  });

  it('falls back to one local default for non-empty lists', () => {
    const normalized = normalizeMarketplaceDefaultAddressSelection<{id: string; isDefault: boolean}>([
      {id: 'home', isDefault: false},
      {id: 'studio', isDefault: false}
    ], 'missing');

    expect(normalized.map(address => address.isDefault)).toEqual([true, false]);
  });
});

function createChipAddress(
  overrides: Partial<MarketplaceAddressChipPickerAddress> = {}
): MarketplaceAddressChipPickerAddress {
  return {
    city: 'Milan',
    countryCode: 'IT',
    id: 'address-1',
    label: 'Address',
    line1: 'Via Roma 1',
    postalCode: '20100',
    recipientName: 'Ada Lovelace',
    ...overrides
  };
}
