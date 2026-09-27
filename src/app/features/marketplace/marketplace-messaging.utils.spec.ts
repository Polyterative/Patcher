import {
  buildMarketplaceMessageThreadPreview,
  detectMarketplaceMessageContentFlags,
  sortMarketplaceMessageThreadPreviews,
  type MarketplaceMessageDraft,
  validateAndNormalizeMarketplaceMessageDraft
} from './marketplace-messaging.utils';

describe('marketplace-messaging.utils', () => {
  it('normalizes valid text message drafts with whitelisted fields only', () => {
    const result = validateAndNormalizeMarketplaceMessageDraft({
      body: '  Hello from the buyer.  ',
      createdAt: '2026-07-07T13:25:00Z',
      kind: 'text',
      senderProfileId: ' buyer-1 ',
      transactionId: ' transaction-1 ',
      unsafe: {doNotCopy: true}
    } as MarketplaceMessageDraft & Record<string, unknown>);

    expect(result.valid).toBeTrue();
    if (result.valid) {
      expect(result.message).toEqual({
        body: 'Hello from the buyer.',
        hasStructuredPayload: false,
        kind: 'text',
        senderProfileId: 'buyer-1',
        transactionId: 'transaction-1'
      });
      expect(result.message).not.toEqual(jasmine.objectContaining({
        createdAt: jasmine.anything(),
        unsafe: jasmine.anything()
      }));
    }
  });

  it('requires nonblank transaction, sender, supported kind, and text body', () => {
    const result = validateAndNormalizeMarketplaceMessageDraft({
      body: ' ',
      kind: 'text',
      senderProfileId: '',
      transactionId: ' '
    });

    expect(result).toEqual({
      errors: {
        body: 'Required',
        senderProfileId: 'Required',
        transactionId: 'Required'
      },
      flags: [],
      valid: false
    });

    expect(validateAndNormalizeMarketplaceMessageDraft({
      body: 'Hello',
      kind: 'voice_note' as never,
      senderProfileId: 'profile-1',
      transactionId: 'transaction-1'
    })).toEqual({
      errors: {
        kind: 'Use a supported message kind'
      },
      flags: [],
      valid: false
    });
  });

  it('enforces the local text length limit', () => {
    const result = validateAndNormalizeMarketplaceMessageDraft({
      body: 'x'.repeat(2001),
      kind: 'text',
      senderProfileId: 'profile-1',
      transactionId: 'transaction-1'
    });

    expect(result).toEqual({
      errors: {
        body: 'Use 2000 characters or fewer'
      },
      flags: [],
      valid: false
    });
  });

  it('rejects structured payloads on text messages', () => {
    const result = validateAndNormalizeMarketplaceMessageDraft({
      body: 'Plain text only.',
      kind: 'text',
      senderProfileId: 'profile-1',
      structuredPayload: {offer: 100},
      transactionId: 'transaction-1'
    });

    expect(result).toEqual({
      errors: {
        structuredPayload: 'Text messages cannot include structured payloads'
      },
      flags: [],
      valid: false
    });
  });

  it('keeps structured and status payloads as a boolean without copying unknown objects', () => {
    const structuredPayload = {amountMinor: 12000, privateNote: {nested: true}};
    const result = validateAndNormalizeMarketplaceMessageDraft({
      body: '  Seller sent a counter offer.  ',
      kind: 'structured_offer',
      senderProfileId: 'seller-1',
      structuredPayload,
      transactionId: 'transaction-1'
    });

    expect(result.valid).toBeTrue();
    if (result.valid) {
      expect(result.message).toEqual({
        body: 'Seller sent a counter offer.',
        hasStructuredPayload: true,
        kind: 'structured_offer',
        senderProfileId: 'seller-1',
        transactionId: 'transaction-1'
      });
      expect(result.message).not.toEqual(jasmine.objectContaining({
        structuredPayload: jasmine.anything()
      }));
    }

    const statusResult = validateAndNormalizeMarketplaceMessageDraft({
      kind: 'status_notice',
      senderProfileId: 'seller-1',
      transactionId: 'transaction-1'
    });

    expect(statusResult.valid).toBeTrue();
    if (statusResult.valid) {
      expect(statusResult.message).toEqual({
        hasStructuredPayload: false,
        kind: 'status_notice',
        senderProfileId: 'seller-1',
        transactionId: 'transaction-1'
      });
    }
  });

  it('returns moderation flags separately without blocking otherwise valid messages', () => {
    const result = validateAndNormalizeMarketplaceMessageDraft({
      body: 'See https://one.example and www.two.example, pay via PayPal, then WhatsApp me at +39 02 12345678.',
      kind: 'text',
      senderProfileId: 'profile-1',
      transactionId: 'transaction-1'
    });

    expect(result.valid).toBeTrue();
    expect(result.flags).toEqual(['repeated_urls', 'off_platform_payment', 'external_contact']);
  });

  it('detects repeated URLs, payment handles, crypto-ish wallets, and external contact hints', () => {
    expect(detectMarketplaceMessageContentFlags('Links: www.example.com and https://example.org')).toContain('repeated_urls');
    expect(detectMarketplaceMessageContentFlags('Email buyer@example.com and one link https://example.org')).not.toContain('repeated_urls');
    expect(detectMarketplaceMessageContentFlags('paypal.me/user or $cashhandle')).toContain('off_platform_payment');
    expect(detectMarketplaceMessageContentFlags('wallet 0x1234567890abcdef1234567890abcdef12345678')).toContain('off_platform_payment');
    expect(detectMarketplaceMessageContentFlags('mail me at buyer@example.com')).toContain('external_contact');
    expect(detectMarketplaceMessageContentFlags('telegram @buyer')).toContain('external_contact');
  });

  it('builds a private-safe text thread preview with redacted contact details and moderation flags', () => {
    const result = buildMarketplaceMessageThreadPreview({
      flags: ['off_platform_payment'],
      lastMessageAt: new Date('2026-07-08T09:30:00Z'),
      lastMessageBody: `  Email buyer@example.com or +39 02 12345678 about ${'delivery details '.repeat(12)}  `,
      lastMessageKind: 'text',
      otherParticipantLabel: '  Seller profile  ',
      structuredPayload: {privateAddressSnapshot: 'Do not copy'},
      transactionId: ' transaction-1 ',
      unknownPrivateField: 'do not copy'
    } as Parameters<typeof buildMarketplaceMessageThreadPreview>[0] & Record<string, unknown>);

    expect(result.available).toBeTrue();
    if (result.available) {
      expect(result).toEqual(jasmine.objectContaining({
        flags: ['off_platform_payment', 'external_contact'],
        lastMessageAt: '2026-07-08T09:30:00.000Z',
        lastMessageKind: 'text',
        otherParticipantLabel: 'Seller profile',
        transactionId: 'transaction-1',
        unreadCount: 0
      }));
      expect(result.lastMessagePreview.length).toBeLessThanOrEqual(120);
      expect(result.lastMessagePreview).toContain('[redacted contact]');
      expect(result.lastMessagePreview).not.toContain('buyer@example.com');
      expect(result.lastMessagePreview).not.toContain('+39 02 12345678');
      expect(result.lastMessagePreview).toMatch(/…$/u);
      expect(result).not.toEqual(jasmine.objectContaining({
        privateAddressSnapshot: jasmine.anything(),
        structuredPayload: jasmine.anything(),
        unknownPrivateField: jasmine.anything()
      }));
    }
  });

  it('uses generic labels for structured thread previews without echoing arbitrary payloads', () => {
    const structuredOffer = buildMarketplaceMessageThreadPreview({
      lastMessageBody: 'Private offer payload: address 123 Synth Lane',
      lastMessageKind: 'structured_offer',
      otherParticipantLabel: '',
      structuredPayload: {amountMinor: 12000, privateAddressSnapshot: '123 Synth Lane'},
      transactionId: 'transaction-1',
      unreadCount: 4.9
    });

    expect(structuredOffer).toEqual({
      available: true,
      flags: [],
      lastMessageKind: 'structured_offer',
      lastMessagePreview: 'Structured offer',
      otherParticipantLabel: 'Marketplace conversation',
      transactionId: 'transaction-1',
      unreadCount: 4,
      unreadLabel: '4'
    });

    expect(buildMarketplaceMessageThreadPreview({
      lastMessageBody: 'Do not echo this arbitrary info payload',
      lastMessageKind: 'structured_info',
      transactionId: 'transaction-1'
    })).toEqual(jasmine.objectContaining({
      lastMessageKind: 'structured_info',
      lastMessagePreview: 'Shared info'
    }));

    expect(buildMarketplaceMessageThreadPreview({
      lastMessageBody: 'Do not echo this arbitrary status payload',
      lastMessageKind: 'status_notice',
      transactionId: 'transaction-1'
    })).toEqual(jasmine.objectContaining({
      lastMessageKind: 'status_notice',
      lastMessagePreview: 'Status update'
    }));
  });

  it('returns unavailable thread previews for missing transactions and caps unread labels', () => {
    expect(buildMarketplaceMessageThreadPreview({
      flags: ['external_contact', 'unknown_flag' as never],
      otherParticipantLabel: ' buyer@example.com ',
      transactionId: ' ',
      unreadCount: 120
    })).toEqual({
      available: false,
      flags: ['external_contact'],
      otherParticipantLabel: '[redacted contact]',
      reason: 'missing_transaction',
      unreadCount: 99,
      unreadLabel: '99+'
    });

    expect(buildMarketplaceMessageThreadPreview({
      transactionId: 'transaction-1',
      unreadCount: -1
    })).toEqual(jasmine.objectContaining({
      unreadCount: 0
    }));
  });

  it('never throws on malformed draft values', () => {
    expect(() => validateAndNormalizeMarketplaceMessageDraft({
      body: {text: 'hello'},
      kind: ['text'],
      senderProfileId: {id: 'profile-1'},
      structuredPayload: () => 'unknown',
      transactionId: 123
    } as unknown as MarketplaceMessageDraft)).not.toThrow();

    const result = validateAndNormalizeMarketplaceMessageDraft(null);

    expect(result).toEqual({
      errors: {
        kind: 'Use a supported message kind',
        senderProfileId: 'Required',
        transactionId: 'Required'
      },
      flags: [],
      valid: false
    });
  });

  it('sorts thread previews by recency with deterministic tie-breakers', () => {
    const older = buildMarketplaceMessageThreadPreview({
      lastMessageAt: '2026-07-08T09:30:00.000Z',
      transactionId: 'transaction-b',
      unreadCount: 0
    });
    const newer = buildMarketplaceMessageThreadPreview({
      lastMessageAt: '2026-07-09T09:30:00.000Z',
      transactionId: 'transaction-a',
      unreadCount: 0
    });
    const missingTime = buildMarketplaceMessageThreadPreview({
      transactionId: 'transaction-c'
    });

    const input = [older, missingTime, newer];
    const sorted = sortMarketplaceMessageThreadPreviews(input);

    expect(sorted.map(preview => preview.available ? preview.transactionId : 'missing')).toEqual([
      'transaction-a',
      'transaction-b',
      'transaction-c'
    ]);
    expect(input.map(preview => preview.available ? preview.transactionId : 'missing')).toEqual([
      'transaction-b',
      'transaction-c',
      'transaction-a'
    ]);
  });

  it('breaks equal-time ties by unread count then transaction id without throwing', () => {
    const sameTime = '2026-07-09T09:30:00.000Z';
    const lowUnread = buildMarketplaceMessageThreadPreview({
      lastMessageAt: sameTime,
      transactionId: 'transaction-b',
      unreadCount: 1
    });
    const highUnread = buildMarketplaceMessageThreadPreview({
      lastMessageAt: sameTime,
      transactionId: 'transaction-c',
      unreadCount: 5
    });
    const sameUnreadLaterId = buildMarketplaceMessageThreadPreview({
      lastMessageAt: sameTime,
      transactionId: 'transaction-a',
      unreadCount: 5
    });

    const sorted = sortMarketplaceMessageThreadPreviews([lowUnread, highUnread, sameUnreadLaterId]);

    expect(sorted.map(preview => preview.available ? preview.transactionId : 'missing')).toEqual([
      'transaction-a',
      'transaction-c',
      'transaction-b'
    ]);
  });

  it('returns an empty list for unknown sort input and skips malformed entries', () => {
    expect(sortMarketplaceMessageThreadPreviews(null)).toEqual([]);
    expect(sortMarketplaceMessageThreadPreviews(undefined)).toEqual([]);
    expect(() => sortMarketplaceMessageThreadPreviews(
      [null, undefined, 123] as unknown as Parameters<typeof sortMarketplaceMessageThreadPreviews>[0]
    )).not.toThrow();
    expect(sortMarketplaceMessageThreadPreviews(
      [null, undefined, 123] as unknown as Parameters<typeof sortMarketplaceMessageThreadPreviews>[0]
    )).toEqual([]);
  });
});
