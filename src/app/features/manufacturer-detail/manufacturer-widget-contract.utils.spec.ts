import {
  buildManufacturerWidgetEmbedSnippet,
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

  it('returns null when required manufacturer or module identity is missing', () => {
    expect(serializeManufacturerWidgetModuleCard(
      {...manufacturer, id: null},
      publicModule
    )).toBeNull();
    expect(serializeManufacturerWidgetModuleCard(
      {...manufacturer, name: '   '},
      publicModule
    )).toBeNull();
    expect(serializeManufacturerWidgetModuleCard(
      manufacturer,
      {...publicModule, id: null}
    )).toBeNull();
    expect(serializeManufacturerWidgetModuleCard(
      manufacturer,
      {...publicModule, name: ''}
    )).toBeNull();
    expect(serializeManufacturerWidgetModuleCard(
      {} as never,
      publicModule
    )).toBeNull();
  });

  it('returns null for private visibility strings and conflicting public flags', () => {
    expect(serializeManufacturerWidgetModuleCard(
      manufacturer,
      {...publicModule, public: true, visibility: 'private'}
    )).toBeNull();
    expect(serializeManufacturerWidgetModuleCard(
      manufacturer,
      {...publicModule, public: true, is_public: false}
    )).toBeNull();
    expect(serializeManufacturerWidgetModuleCard(manufacturer, {} as never)).toBeNull();
  });

  it('omits negative hp, truncates long descriptions, and dedupes tags case-insensitively', () => {
    const result = serializeManufacturerWidgetModuleCard(
      manufacturer,
      {
        ...publicModule,
        hp: -4,
        description: `${'x'.repeat(200)} <b>tail</b>`,
        tags: [{name: 'Clock'}, {name: 'clock'}, 'CLOCK', {name: 'Modulation'}, null]
      }
    );

    expect(result?.module.hp).toBeUndefined();
    expect(result?.module.shortDescription?.length).toBeLessThanOrEqual(180);
    expect(result?.module.shortDescription).toContain('…');
    expect(result?.module.tags).toEqual(['Clock', 'Modulation']);
    expect(JSON.stringify(result)).not.toContain('<b>');
  });

  it('builds a static display-only embed snippet with no endpoint or private fields', () => {
    const card = serializeManufacturerWidgetModuleCard(manufacturer, publicModule);
    const snippet = buildManufacturerWidgetEmbedSnippet(card);

    expect(snippet).toContain('<blockquote class="patcher-module-card"');
    expect(snippet).toContain('data-manufacturer-id="42"');
    expect(snippet).toContain('data-module-id="77"');
    expect(snippet).toContain('https://patcher.xyz/modules/details/77');
    expect(snippet).toContain('https://patcher.xyz');
    expect(snippet).not.toContain('<script');
    expect(snippet).not.toContain('<iframe');
    expect(snippet).not.toContain('owner@example.com');
  });

  it('returns null for a missing card and escapes html in snippet fields', () => {
    expect(buildManufacturerWidgetEmbedSnippet(null)).toBeNull();
    expect(buildManufacturerWidgetEmbedSnippet(undefined)).toBeNull();

    const snippet = buildManufacturerWidgetEmbedSnippet({
      manufacturer: {
        canonicalUrl: 'https://patcher.xyz/manufacturers/details/1',
        id: '1" onmouseover="alert(1)',
        name: 'Maker <b>& Co</b>'
      },
      module: {
        canonicalUrl: 'https://patcher.xyz/modules/details/10',
        id: '10',
        name: 'Module <script>alert(1)</script>',
        tags: []
      },
      schemaVersion: 1
    });

    expect(snippet).not.toContain('<script>alert(1)</script>');
    expect(snippet).toContain('&lt;script&gt;');
    expect(snippet).toContain('&quot;');
  });
});
