import {
  ManufacturerWidgetManufacturerInput,
  ManufacturerWidgetModuleInput,
  serializeManufacturerWidgetModuleCard
} from './manufacturer-widget-contract.utils';

describe('manufacturer-widget-contract.utils', () => {
  const manufacturer: ManufacturerWidgetManufacturerInput = {
    id: 42,
    name: '  ALM / Busy Circuits  ',
    logo: 'alm.svg',
    websiteURL: 'https://busycircuits.com',
  };

  const publicModule: ManufacturerWidgetModuleInput = {
    id: 77,
    public_id: 'pam-pro-workout',
    name: ' Pamela’s Pro Workout ',
    hp: 8,
    description: '  Clocked modulation <strong>source</strong> for Eurorack. ',
    public: true,
    standard: { id: 0 },
    tags: [
      { tag: { name: 'Clock' } },
      { name: 'Modulation' },
      'clock',
      null,
    ],
    panels: [{ filename: 'pam-pro-workout-black.png' }],
  };

  it('serializes only the whitelisted public manufacturer and module card fields', () => {
    const privatePayload = {
      adminUser: 'owner-user-id',
      email: 'owner@example.com',
      analytics: { views: 1000 },
      store_url: 'https://retailer.invalid/product',
      token: 'secret-token',
      userOwnership: 'HAS',
    } satisfies Record<string, unknown>;

    const result = serializeManufacturerWidgetModuleCard(
      { ...manufacturer, ...privatePayload },
      { ...publicModule, ...privatePayload }
    );

    expect(result).toEqual({
      schemaVersion: 1,
      manufacturer: {
        id: '42',
        name: 'ALM / Busy Circuits',
        logoFilename: 'alm.svg',
        canonicalUrl: 'https://patcher.xyz/manufacturers/details/42',
      },
      module: {
        id: '77',
        publicId: 'pam-pro-workout',
        name: 'Pamela’s Pro Workout',
        hp: 8,
        shortDescription: 'Clocked modulation source for Eurorack.',
        standard: 'Eurorack 3U',
        tags: ['Clock', 'Modulation'],
        panelImageFilename: 'pam-pro-workout-black.png',
        canonicalUrl: 'https://patcher.xyz/modules/details/77',
      },
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('owner-user-id');
    expect(serialized).not.toContain('owner@example.com');
    expect(serialized).not.toContain('retailer.invalid');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('HAS');
  });

  it('returns null for private modules', () => {
    expect(serializeManufacturerWidgetModuleCard(manufacturer, {
      ...publicModule,
      public: false,
    })).toBeNull();
  });

  it('returns null when public visibility is not explicit', () => {
    const { public: _publicFlag, ...moduleWithoutPublicFlag } = publicModule;

    expect(serializeManufacturerWidgetModuleCard(manufacturer, moduleWithoutPublicFlag)).toBeNull();
  });

  it('supports URL logo and panel image fields without exposing filename duplicates', () => {
    const result = serializeManufacturerWidgetModuleCard(
      {
        id: 'makenoise',
        name: 'Make Noise',
        logoUrl: 'https://assets.patcher.xyz/make-noise.svg',
      },
      {
        ...publicModule,
        id: 99,
        public_id: null,
        name: 'Maths',
        standard: 'Eurorack 3U',
        panels: [{ imageUrl: 'https://assets.patcher.xyz/maths-panel.png' }],
        is_public: true,
      }
    );

    expect(result?.manufacturer).toEqual({
      id: 'makenoise',
      name: 'Make Noise',
      logoUrl: 'https://assets.patcher.xyz/make-noise.svg',
      canonicalUrl: 'https://patcher.xyz/manufacturers/details/makenoise',
    });
    expect(result?.module.id).toBe('99');
    expect(result?.module.canonicalUrl).toBe('https://patcher.xyz/modules/details/99');
    expect(result?.module.panelImageUrl).toBe('https://assets.patcher.xyz/maths-panel.png');
    expect(result?.module.panelImageFilename).toBeUndefined();
  });
});
