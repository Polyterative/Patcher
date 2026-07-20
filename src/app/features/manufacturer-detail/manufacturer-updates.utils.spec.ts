import {
  MANUFACTURER_FEATURED_MODULE_LIMIT,
  MANUFACTURER_UPDATE_BODY_MAX_LENGTH,
  MANUFACTURER_UPDATE_TITLE_MAX_LENGTH,
  normalizeFeaturedModuleIds,
  validateManufacturerUpdateDraft
} from './manufacturer-updates.utils';

describe('manufacturer-updates.utils', () => {
  const now = '2026-07-07T12:00:00Z';

  it('normalizes a valid manufacturer update draft with whitelisted fields only', () => {
    const result = validateManufacturerUpdateDraft({
      adminNotes: 'internal only',
      body: '  New firmware and faceplate details are available.  ',
      expiresAt: '2026-08-07T12:00:00Z',
      featuredModuleIds: [' module-1 ', 'module-2'],
      linkedModuleId: ' module-1 ',
      manufacturerId: ' maker-1 ',
      title: '  Summer module update  '
    }, now);

    expect(result).toEqual({
      update: {
        body: 'New firmware and faceplate details are available.',
        expiresAt: '2026-08-07T12:00:00.000Z',
        featuredModuleIds: ['module-1', 'module-2'],
        linkedModuleId: 'module-1',
        manufacturerId: 'maker-1',
        title: 'Summer module update'
      },
      valid: true
    });
    expect('adminNotes' in (result.valid ? result.update : {})).toBeFalse();
  });

  it('rejects blank required fields and overlong title/body values', () => {
    const result = validateManufacturerUpdateDraft({
      body: 'b'.repeat(MANUFACTURER_UPDATE_BODY_MAX_LENGTH + 1),
      manufacturerId: '   ',
      title: ` ${'t'.repeat(MANUFACTURER_UPDATE_TITLE_MAX_LENGTH + 1)} `
    }, now);

    expect(result).toEqual({
      errors: [
        'manufacturer_id_required',
        'title_too_long',
        'body_too_long'
      ],
      valid: false
    });

    expect(validateManufacturerUpdateDraft({
      body: '   ',
      manufacturerId: 'maker-1',
      title: '   '
    }, now)).toEqual({
      errors: ['title_required', 'body_required'],
      valid: false
    });
  });

  it('rejects invalid and non-future expiry values', () => {
    expect(validateManufacturerUpdateDraft({
      body: 'Body',
      expiresAt: 'not a date',
      manufacturerId: 'maker-1',
      title: 'Title'
    }, now)).toEqual({
      errors: ['expires_at_invalid'],
      valid: false
    });

    expect(validateManufacturerUpdateDraft({
      body: 'Body',
      expiresAt: '2026-07-07T12:00:00Z',
      manufacturerId: 'maker-1',
      title: 'Title'
    }, now)).toEqual({
      errors: ['expires_at_must_be_future'],
      valid: false
    });
  });

  it('never throws on malformed draft values', () => {
    const malformedValues = [
      null,
      undefined,
      10,
      'draft',
      [],
      {
        body: false,
        expiresAt: Symbol('expires'),
        featuredModuleIds: [1, null, 'module-1'],
        linkedModuleId: { id: 'module-1' },
        manufacturerId: 42,
        title: ['Title']
      }
    ];

    for (const value of malformedValues) {
      expect(() => validateManufacturerUpdateDraft(value, now)).not.toThrow();
      expect(validateManufacturerUpdateDraft(value, now).valid).toBeFalse();
    }
  });

  it('excludes unknown fields from normalized update output', () => {
    const result = validateManufacturerUpdateDraft({
      body: 'Body',
      internalApprovalState: 'approved',
      manufacturerId: 'maker-1',
      privateOwnerProfileId: 'owner-1',
      title: 'Title'
    }, now);

    expect(result).toEqual({
      update: {
        body: 'Body',
        manufacturerId: 'maker-1',
        title: 'Title'
      },
      valid: true
    });
    expect('internalApprovalState' in (result.valid ? result.update : {})).toBeFalse();
    expect('privateOwnerProfileId' in (result.valid ? result.update : {})).toBeFalse();
  });

  it('trims, dedupes, filters, and caps featured module ids', () => {
    expect(normalizeFeaturedModuleIds([
      ' module-1 ',
      'MODULE-1',
      42,
      null,
      '',
      'module-2',
      'module-3',
      'module-4',
      'module-5',
      'module-6',
      'module-7'
    ])).toEqual([
      'module-1',
      'module-2',
      'module-3',
      'module-4',
      'module-5',
      'module-6'
    ]);
    expect(normalizeFeaturedModuleIds(['a', 'b', 'c', 'd', 'e', 'f', 'g']).length).toBe(MANUFACTURER_FEATURED_MODULE_LIMIT);
    expect(normalizeFeaturedModuleIds({ ids: ['module-1'] })).toEqual([]);
  });
});
