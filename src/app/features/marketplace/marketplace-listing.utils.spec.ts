import {
  getMarketplaceDuplicateListingWarning,
  MARKETPLACE_LISTING_MEDIA_ALLOWED_URL_PREFIXES,
  MARKETPLACE_LISTING_MEDIA_IMAGE_MIME_TYPES,
  MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT,
  MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES,
  MARKETPLACE_LISTING_MEDIA_OUTPUT_MAX_HEIGHT,
  MARKETPLACE_LISTING_MEDIA_OUTPUT_MAX_WIDTH,
  MARKETPLACE_LISTING_CONDITIONS,
  MARKETPLACE_LISTING_STATUSES,
  normalizeMarketplaceListingMediaDrafts,
  normalizeMarketplaceListingShippingOptions,
  type MarketplaceDuplicateListingCandidate,
  type MarketplaceListingDraft,
  type MarketplaceListingMediaDraft,
  validateAndNormalizeMarketplaceListingDraft
} from './marketplace-listing.utils';

describe('marketplace-listing.utils', () => {
  it('exposes MVP listing statuses and conditions', () => {
    expect(MARKETPLACE_LISTING_STATUSES).toEqual([
      'draft',
      'active',
      'paused',
      'reserved',
      'closed_sold',
      'closed_unsold',
      'expired'
    ]);
    expect(MARKETPLACE_LISTING_CONDITIONS).toEqual([
      'new',
      'excellent',
      'good',
      'fair',
      'for_parts'
    ]);
  });

  it('exposes image-only listing media guardrails for future upload flows', () => {
    expect(MARKETPLACE_LISTING_MEDIA_IMAGE_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp'
    ]);
    expect(MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT).toBe(8);
    expect(MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(MARKETPLACE_LISTING_MEDIA_OUTPUT_MAX_WIDTH).toBe(2048);
    expect(MARKETPLACE_LISTING_MEDIA_OUTPUT_MAX_HEIGHT).toBe(2048);
    expect(MARKETPLACE_LISTING_MEDIA_ALLOWED_URL_PREFIXES).toEqual(['https://images.patcher.xyz/']);
  });

  it('normalizes a valid listing draft for future persistence', () => {
    const result = validateAndNormalizeMarketplaceListingDraft({
      askingPrice: '1 234,50',
      askingPriceCurrency: ' eur ',
      condition: 'excellent',
      description: '  Recently serviced.  ',
      externalLink: ' https://example.com/listing ',
      moduleId: ' module-1 ',
      openToOffers: true,
      shippingNotes: ' Ships insured. ',
      sellerProfileId: ' profile-1 ',
      shippingOptions: [' Pickup ', 'Courier'],
      shipsFromCountry: ' de ',
      titleOverride: '  Mutable Instruments Plaits  '
    });

    expect(result).toEqual({
      errors: {},
      listing: {
        askingPriceAmountMinor: 123450,
        askingPriceCurrency: 'EUR',
        condition: 'excellent',
        description: 'Recently serviced.',
        externalLink: 'https://example.com/listing',
        moduleId: 'module-1',
        openToOffers: true,
        shippingNotes: 'Ships insured.',
        sellerProfileId: 'profile-1',
        shippingOptions: ['Pickup', 'Courier'],
        shipsFromCountry: 'DE',
        status: 'draft',
        titleOverride: 'Mutable Instruments Plaits'
      },
      valid: true
    });
  });

  it('reports invalid required fields and malformed listing values', () => {
    const result = validateAndNormalizeMarketplaceListingDraft({
      askingPrice: '12.345',
      askingPriceCurrency: 'EURO',
      condition: 'mint',
      description: 'x'.repeat(5001),
      externalLink: 'ftp://example.com/listing',
      moduleId: ' ',
      sellerProfileId: null,
      shippingNotes: 'x'.repeat(501),
      shippingOptions: 'pickup',
      shipsFromCountry: 'Germany',
      status: 'published',
      titleOverride: 'x'.repeat(121)
    } as unknown as MarketplaceListingDraft);

    expect(result.valid).toBeFalse();
    expect(result.errors).toEqual({
      askingPrice: 'Enter a valid asking price',
      askingPriceCurrency: 'Use a three-letter currency code',
      condition: 'Choose a supported listing condition',
      description: 'Use 5000 characters or fewer',
      externalLink: 'Use an http(s) URL',
      moduleId: 'Required',
      sellerProfileId: 'Required',
      shippingNotes: 'Use 500 characters or fewer',
      shippingOptions: 'Use a list of shipping options',
      shipsFromCountry: 'Use a two-letter country code',
      status: 'Choose a supported listing status',
      titleOverride: 'Use 120 characters or fewer'
    });
  });

  it('uses the money util for JPY zero-decimal price parsing', () => {
    const result = validateAndNormalizeMarketplaceListingDraft({
      askingPrice: '1,234',
      askingPriceCurrency: 'jpy',
      condition: 'good',
      moduleId: 'module-1',
      sellerProfileId: 'profile-1',
      shipsFromCountry: 'JP'
    });

    expect(result.valid).toBeTrue();
    if (result.valid) {
      expect(result.listing.askingPriceAmountMinor).toBe(1234);
      expect(result.listing.askingPriceCurrency).toBe('JPY');
    }

    expect(validateAndNormalizeMarketplaceListingDraft({
      askingPrice: '123.45',
      askingPriceCurrency: 'JPY',
      condition: 'good',
      moduleId: 'module-1',
      sellerProfileId: 'profile-1',
      shipsFromCountry: 'JP'
    }).valid).toBeFalse();
  });

  it('does not throw when optional fields are malformed', () => {
    expect(() => validateAndNormalizeMarketplaceListingDraft({
      askingPrice: '12.00',
      askingPriceCurrency: 'EUR',
      condition: 'fair',
      description: { unsafe: true },
      externalLink: ['https://example.com'],
      moduleId: 'module-1',
      sellerProfileId: 'profile-1',
      shippingOptions: [{ label: 'Pickup' }],
      shipsFromCountry: 'IT',
      titleOverride: 123
    } as unknown as MarketplaceListingDraft)).not.toThrow();
  });

  it('does not throw when required fields have unknown malformed values', () => {
    const malformedResult = validateAndNormalizeMarketplaceListingDraft({
      askingPrice: { amount: 12 },
      askingPriceCurrency: { code: 'EUR' },
      condition: ['good'],
      moduleId: ['module-1'],
      sellerProfileId: { id: 'profile-1' },
      shipsFromCountry: 123,
      status: { value: 'draft' }
    } as unknown as MarketplaceListingDraft);

    expect(malformedResult.valid).toBeFalse();
    expect(malformedResult.errors).toEqual(jasmine.objectContaining({
      status: 'Choose a supported listing status'
    }));

    expect(validateAndNormalizeMarketplaceListingDraft(null).valid).toBeFalse();
  });

  it('excludes unknown and private fields from normalized output', () => {
    const result = validateAndNormalizeMarketplaceListingDraft({
      askingPrice: '10',
      askingPriceCurrency: 'USD',
      condition: 'new',
      createdAt: '2026-07-07T12:00:00Z',
      moduleId: 'module-1',
      privateNote: 'do not serialize',
      sellerProfileId: 'profile-1',
      shipsFromCountry: 'US',
      updatedAt: '2026-07-07T12:05:00Z'
    } as MarketplaceListingDraft & Record<string, unknown>);

    expect(result.valid).toBeTrue();
    if (result.valid) {
      expect(result.listing).toEqual({
        askingPriceAmountMinor: 1000,
        askingPriceCurrency: 'USD',
        condition: 'new',
        moduleId: 'module-1',
        openToOffers: false,
        sellerProfileId: 'profile-1',
        shippingOptions: [],
        shipsFromCountry: 'US',
        status: 'draft'
      });
      expect(result.listing).not.toEqual(jasmine.objectContaining({
        createdAt: jasmine.anything(),
        privateNote: jasmine.anything(),
        updatedAt: jasmine.anything()
      }));
    }
  });

  it('dedupes and trims shipping options', () => {
    expect(normalizeMarketplaceListingShippingOptions([
      ' Pickup ',
      'pickup',
      'Courier',
      '',
      '  ',
      null,
      'COURIER',
      'Local meetup'
    ])).toEqual(['Pickup', 'Courier', 'Local meetup']);
  });

  it('normalizes image media drafts into stable dense positions', () => {
    const result = normalizeMarketplaceListingMediaDrafts([
      {
        filename: ' rear.webp ',
        kind: 'image',
        mimeType: ' IMAGE/WEBP ',
        position: 2,
        sizeBytes: 1024
      },
      {
        filename: 'front.jpg',
        id: ' media-1 ',
        mimeType: 'image/jpeg',
        position: 0,
        url: ' https://images.patcher.xyz/marketplace-listings/front.jpg '
      },
      {
        filename: 'side.png',
        mimeType: 'image/png',
        position: 1
      }
    ]);

    expect(result).toEqual({
      errors: [],
      media: [
        {
          filename: 'front.jpg',
          id: 'media-1',
          kind: 'image',
          mimeType: 'image/jpeg',
          position: 0,
          url: 'https://images.patcher.xyz/marketplace-listings/front.jpg'
        },
        {
          filename: 'side.png',
          kind: 'image',
          mimeType: 'image/png',
          position: 1
        },
        {
          filename: 'rear.webp',
          kind: 'image',
          mimeType: 'image/webp',
          position: 2,
          sizeBytes: 1024
        }
      ],
      warnings: []
    });
  });

  it('dedupes media drafts by safe id, url, or filename before enforcing the image cap', () => {
    const result = normalizeMarketplaceListingMediaDrafts([
      {
        filename: 'one.jpg',
        id: 'media-1',
        mimeType: 'image/jpeg',
        position: 0
      },
      {
        filename: 'duplicate-id.jpg',
        id: 'media-1',
        mimeType: 'image/jpeg',
        position: 1
      },
      {
        filename: 'ONE.JPG',
        id: 'media-2',
        mimeType: 'image/jpeg',
        position: 2
      },
      ...Array.from({length: MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT}, (_, index) => ({
        filename: `extra-${index}.webp`,
        mimeType: 'image/webp',
        position: index + 3
      }))
    ]);

    expect(result.errors).toEqual([]);
    expect(result.media.length).toBe(MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT);
    expect(result.media.map((media) => media.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(result.media.map((media) => media.filename)).toEqual([
      'one.jpg',
      'ONE.JPG',
      'extra-0.webp',
      'extra-1.webp',
      'extra-2.webp',
      'extra-3.webp',
      'extra-4.webp',
      'extra-5.webp'
    ]);
    expect(result.warnings).toEqual(jasmine.arrayContaining([
      {
        index: 1,
        message: 'Ignoring duplicate media draft'
      },
      {
        index: 10,
        message: 'Ignoring media beyond the 8 image limit'
      }
    ]));
  });

  it('rejects non-image media and unsafe storage/private path inputs without throwing', () => {
    expect(() => normalizeMarketplaceListingMediaDrafts([
      null,
      {
        blob: new Blob(),
        exif: { gps: 'hidden' },
        filename: 'storage/listing/front.jpg',
        kind: 'video',
        mimeType: 'video/mp4',
        ownerId: 'seller-1',
        position: 'later',
        sizeBytes: MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES + 1,
        storagePath: 'seller-1/listing/front.jpg',
        url: 'https://third-party.example/front.jpg'
      }
    ] as unknown as MarketplaceListingMediaDraft[])).not.toThrow();

    const result = normalizeMarketplaceListingMediaDrafts([
      null,
      {
        blob: new Blob(),
        exif: { gps: 'hidden' },
        filename: 'storage/listing/front.jpg',
        kind: 'video',
        mimeType: 'video/mp4',
        ownerId: 'seller-1',
        position: 'later',
        sizeBytes: MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES + 1,
        storagePath: 'seller-1/listing/front.jpg',
        url: 'https://third-party.example/front.jpg'
      }
    ] as unknown as MarketplaceListingMediaDraft[]);

    expect(result.media).toEqual([]);
    expect(result.errors).toEqual(jasmine.arrayContaining([
      {
        index: 0,
        message: 'Use a media object'
      },
      {
        field: 'kind',
        index: 1,
        message: 'Only image media is supported'
      },
      {
        field: 'mimeType',
        index: 1,
        message: 'Use JPEG, PNG, or WebP image media'
      },
      {
        field: 'url',
        index: 1,
        message: 'Use a Patcher image proxy media URL'
      },
      {
        field: 'filename',
        index: 1,
        message: 'Use a filename without path segments'
      },
      {
        field: 'sizeBytes',
        index: 1,
        message: `Use an image smaller than ${MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES} bytes`
      }
    ]));
    expect(result.warnings).toEqual([{
      field: 'position',
      index: 1,
      message: 'Ignoring malformed media position'
    }]);
  });

  it('excludes unknown and private media fields from normalized media output', () => {
    const result = normalizeMarketplaceListingMediaDrafts([
      {
        blob: new Blob(),
        exif: { gps: 'hidden' },
        filename: 'front.jpg',
        mimeType: 'image/jpeg',
        ownerId: 'seller-1',
        storagePath: 'seller-1/listing/front.jpg'
      } as MarketplaceListingMediaDraft & Record<string, unknown>
    ]);

    expect(result).toEqual({
      errors: [],
      media: [{
        filename: 'front.jpg',
        kind: 'image',
        mimeType: 'image/jpeg',
        position: 0
      }],
      warnings: []
    });
    expect(result.media[0]).not.toEqual(jasmine.objectContaining({
      blob: jasmine.anything(),
      exif: jasmine.anything(),
      ownerId: jasmine.anything(),
      storagePath: jasmine.anything()
    }));
  });

  it('returns errors instead of throwing on malformed media input containers', () => {
    expect(normalizeMarketplaceListingMediaDrafts(null)).toEqual({
      errors: [],
      media: [],
      warnings: []
    });
    expect(normalizeMarketplaceListingMediaDrafts({ filename: 'front.jpg' } as unknown as MarketplaceListingMediaDraft[]))
      .toEqual({
        errors: [{
          index: -1,
          message: 'Use a list of media drafts'
        }],
        media: [],
        warnings: []
      });
  });

  it('preserves supported non-draft statuses for future lifecycle contracts', () => {
    const result = validateAndNormalizeMarketplaceListingDraft({
      askingPrice: '10',
      askingPriceCurrency: 'USD',
      condition: 'good',
      moduleId: 'module-1',
      sellerProfileId: 'profile-1',
      shipsFromCountry: 'US',
      status: 'paused'
    });

    expect(result.valid).toBeTrue();
    if (result.valid) {
      expect(result.listing.status).toBe('paused');
    }
  });

  it('returns a private-safe warning for an active duplicate listing', () => {
    const result = getMarketplaceDuplicateListingWarning([
      {
        id: ' listing-1 ',
        moduleId: 'module-1',
        publicId: ' public-listing-1 ',
        sellerProfileId: 'seller-1',
        status: 'active',
        titleOverride: '  Plaits  '
      }
    ], {
      moduleId: 'module-1',
      sellerProfileId: 'seller-1'
    });

    expect(result).toEqual({
      hasDuplicate: true,
      listing: {
        id: 'listing-1',
        publicId: 'public-listing-1',
        status: 'active',
        titleOverride: 'Plaits'
      },
      message: 'This seller already has an open listing for this module.',
      moduleId: 'module-1'
    });
  });

  it('ignores closed and expired listings when checking duplicates', () => {
    const listings: MarketplaceDuplicateListingCandidate[] = [
      {
        moduleId: 'module-1',
        sellerProfileId: 'seller-1',
        status: 'closed_sold'
      },
      {
        moduleId: 'module-1',
        sellerProfileId: 'seller-1',
        status: 'closed_unsold'
      },
      {
        moduleId: 'module-1',
        sellerProfileId: 'seller-1',
        status: 'expired'
      }
    ];

    expect(getMarketplaceDuplicateListingWarning(listings, {
      moduleId: 'module-1',
      sellerProfileId: 'seller-1'
    })).toEqual({hasDuplicate: false});
  });

  it('normalizes draft module and seller ids before matching duplicates', () => {
    const result = getMarketplaceDuplicateListingWarning([
      {
        moduleId: 'module-1',
        sellerProfileId: 'seller-1',
        status: 'draft'
      }
    ], {
      moduleId: ' module-1 ',
      sellerProfileId: ' seller-1 '
    });

    expect(result).toEqual({
      hasDuplicate: true,
      listing: {
        status: 'draft'
      },
      message: 'This seller already has an open listing for this module.',
      moduleId: 'module-1'
    });
  });

  it('scopes duplicate warnings to the same seller', () => {
    expect(getMarketplaceDuplicateListingWarning([
      {
        moduleId: 'module-1',
        sellerProfileId: 'seller-2',
        status: 'reserved'
      }
    ], {
      moduleId: 'module-1',
      sellerProfileId: 'seller-1'
    })).toEqual({hasDuplicate: false});

    expect(getMarketplaceDuplicateListingWarning([
      {
        moduleId: 'module-1',
        sellerProfileId: 'seller-1',
        status: 'reserved'
      }
    ], {
      moduleId: 'module-1',
      sellerProfileId: 'seller-1'
    })).toEqual(jasmine.objectContaining({
      hasDuplicate: true,
      listing: {
        status: 'reserved'
      }
    }));
  });

  it('excludes seller private fields from duplicate warnings', () => {
    const result = getMarketplaceDuplicateListingWarning([
      {
        moduleId: 'module-1',
        privateSellerEmail: 'seller@example.com',
        sellerAddress: 'Hidden address',
        sellerProfileId: 'seller-1',
        sellerProfileInternalNote: 'private',
        status: 'paused'
      } as MarketplaceDuplicateListingCandidate & Record<string, unknown>
    ], {
      moduleId: 'module-1',
      sellerProfileId: 'seller-1'
    });

    expect(result.hasDuplicate).toBeTrue();
    expect(result).not.toEqual(jasmine.objectContaining({
      privateSellerEmail: jasmine.anything(),
      sellerAddress: jasmine.anything(),
      sellerProfileId: jasmine.anything(),
      sellerProfileInternalNote: jasmine.anything()
    }));
    if (result.hasDuplicate) {
      expect(result.listing).toEqual({
        status: 'paused'
      });
      expect(result.listing).not.toEqual(jasmine.objectContaining({
        privateSellerEmail: jasmine.anything(),
        sellerAddress: jasmine.anything(),
        sellerProfileId: jasmine.anything(),
        sellerProfileInternalNote: jasmine.anything()
      }));
    }
  });
});
