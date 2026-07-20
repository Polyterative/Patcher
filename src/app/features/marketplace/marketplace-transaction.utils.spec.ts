import {
  buildMarketplaceLatestOfferSummary,
  buildMarketplaceTransactionTimeline,
  buildMarketplaceTransactionTimelineItem,
  buildMarketplaceTransactionSnapshotSummary,
  canMarketplaceTransactionTransition,
  getMarketplaceTransactionNextActionChips,
  getMarketplaceTransactionNextStatus,
  MARKETPLACE_TRANSACTION_ACTIONS,
  MARKETPLACE_TRANSACTION_STATUSES,
  transitionMarketplaceTransactionStatus,
  type MarketplaceInquiryDraft,
  type MarketplaceLatestOfferSummary,
  type MarketplaceLatestOfferSummaryInput,
  type MarketplaceTransactionNextActionChip,
  type MarketplaceTransactionActorRole,
  type MarketplaceTransactionAction,
  type MarketplaceTransactionStatus,
  type MarketplaceTransactionTimelineItem,
  type MarketplaceTransactionTransitionContext,
  validateAndNormalizeMarketplaceInquiryDraft
} from './marketplace-transaction.utils';

describe('marketplace-transaction.utils', () => {
  it('preserves transaction constants through the compatibility facade', () => {
    expect(MARKETPLACE_TRANSACTION_STATUSES).toEqual([
      'proposed',
      'negotiating',
      'accepted',
      'paid',
      'shipped',
      'received',
      'closed',
      'cancelled_by_buyer',
      'cancelled_by_seller',
      'cancelled_mutual',
      'disputed'
    ]);
    expect(MARKETPLACE_TRANSACTION_ACTIONS).toEqual([
      'buyer_inquire',
      'seller_accept',
      'seller_decline',
      'seller_counter',
      'buyer_cancel',
      'seller_cancel',
      'mutual_cancel',
      'buyer_mark_paid',
      'seller_mark_shipped',
      'buyer_mark_received',
      'close_completed',
      'open_dispute'
    ]);
  });

  it('creates a proposed transaction from a buyer inquiry only before a status exists', () => {
    expect(getMarketplaceTransactionNextStatus(null, 'buyer_inquire')).toBe('proposed');
    expect(canMarketplaceTransactionTransition(undefined, 'buyer_inquire')).toBeTrue();
    expect(canMarketplaceTransactionTransition('proposed', 'buyer_inquire')).toBeFalse();
  });

  it('supports seller accept, decline, and counter actions from proposed transactions', () => {
    expect(getMarketplaceTransactionNextStatus('proposed', 'seller_accept')).toBe('accepted');
    expect(getMarketplaceTransactionNextStatus('proposed', 'seller_decline')).toBe('cancelled_by_seller');
    expect(getMarketplaceTransactionNextStatus('proposed', 'seller_counter')).toBe('negotiating');
  });

  it('supports seller accept, decline, and counter actions from negotiations', () => {
    expect(getMarketplaceTransactionNextStatus('negotiating', 'seller_accept')).toBe('accepted');
    expect(getMarketplaceTransactionNextStatus('negotiating', 'seller_decline')).toBe('cancelled_by_seller');
    expect(getMarketplaceTransactionNextStatus('negotiating', 'seller_counter')).toBe('negotiating');
  });

  it('runs the participant-attested happy path from proposal to close', () => {
    const steps: Array<{
      action: MarketplaceTransactionAction;
      actorRole: MarketplaceTransactionActorRole;
      context?: {shippingNote?: string | null; trackingNote?: string | null};
      expected: MarketplaceTransactionStatus;
    }> = [
      {action: 'buyer_inquire', actorRole: 'buyer', expected: 'proposed'},
      {action: 'seller_accept', actorRole: 'seller', expected: 'accepted'},
      {action: 'buyer_mark_paid', actorRole: 'buyer', expected: 'paid'},
      {
        action: 'seller_mark_shipped',
        actorRole: 'seller',
        context: {trackingNote: 'Carrier tracking TRK-123'},
        expected: 'shipped'
      },
      {action: 'buyer_mark_received', actorRole: 'buyer', expected: 'received'},
      {action: 'close_completed', actorRole: 'seller', expected: 'closed'}
    ];
    let currentStatus: MarketplaceTransactionStatus | null = null;

    for (const step of steps) {
      const result = transitionMarketplaceTransactionStatus(
        currentStatus,
        step.actorRole,
        step.action,
        step.context
      );

      expect(result).toEqual({ok: true, nextStatus: step.expected});
      if (result.ok) {
        currentStatus = result.nextStatus;
      }
    }
  });

  it('enforces cancellation rules before accepted transactions move forward', () => {
    expect(getMarketplaceTransactionNextStatus('proposed', 'buyer_cancel')).toBe('cancelled_by_buyer');
    expect(getMarketplaceTransactionNextStatus('negotiating', 'seller_cancel')).toBe('cancelled_by_seller');
    expect(getMarketplaceTransactionNextStatus('negotiating', 'mutual_cancel')).toBe('cancelled_mutual');
    expect(canMarketplaceTransactionTransition('accepted', 'buyer_cancel')).toBeFalse();
  });

  it('allows participant disputes from active persisted states', () => {
    expect(transitionMarketplaceTransactionStatus('accepted', 'buyer', 'open_dispute')).toEqual({
      ok: true,
      nextStatus: 'disputed'
    });
    expect(transitionMarketplaceTransactionStatus('paid', 'seller', 'open_dispute')).toEqual({
      ok: true,
      nextStatus: 'disputed'
    });
    expect(transitionMarketplaceTransactionStatus('proposed', 'buyer', 'open_dispute')).toEqual(
      jasmine.objectContaining({ok: false, code: 'transition_not_allowed'})
    );
    expect(transitionMarketplaceTransactionStatus('negotiating', 'seller', 'open_dispute')).toEqual(
      jasmine.objectContaining({ok: false, code: 'transition_not_allowed'})
    );
  });

  it('returns structured errors for malformed status, actor, or action input without throwing', () => {
    expect(() => transitionMarketplaceTransactionStatus(
      'unknown' as MarketplaceTransactionStatus,
      'buyer',
      'buyer_inquire'
    )).not.toThrow();
    expect(transitionMarketplaceTransactionStatus(
      'unknown' as MarketplaceTransactionStatus,
      'buyer',
      'buyer_inquire'
    )).toEqual(jasmine.objectContaining({ok: false, code: 'invalid_status'}));
    expect(transitionMarketplaceTransactionStatus(
      'proposed',
      'visitor' as MarketplaceTransactionActorRole,
      'buyer_cancel'
    )).toEqual(jasmine.objectContaining({ok: false, code: 'invalid_actor'}));
    expect(transitionMarketplaceTransactionStatus(
      'proposed',
      'buyer',
      'seller_accept' as MarketplaceTransactionAction
    )).toEqual(jasmine.objectContaining({ok: false, code: 'transition_not_allowed'}));
    expect(transitionMarketplaceTransactionStatus(
      'proposed',
      'buyer',
      'bad_action' as MarketplaceTransactionAction
    )).toEqual(jasmine.objectContaining({ok: false, code: 'invalid_action'}));
    expect(() => transitionMarketplaceTransactionStatus(
      'paid',
      'seller',
      'seller_mark_shipped',
      null
    )).not.toThrow();
  });

  it('requires a nonblank shipping or tracking note before shipped state', () => {
    expect(transitionMarketplaceTransactionStatus(
      'paid',
      'seller',
      'seller_mark_shipped',
      {shippingNote: '   ', trackingNote: null}
    )).toEqual(jasmine.objectContaining({ok: false, code: 'shipping_note_required'}));

    expect(transitionMarketplaceTransactionStatus(
      'paid',
      'seller',
      'seller_mark_shipped',
      {shippingNote: 'Handed to carrier'}
    )).toEqual({ok: true, nextStatus: 'shipped'});
  });

  it('allows only sellers or admins to close received transactions', () => {
    expect(transitionMarketplaceTransactionStatus('received', 'buyer', 'close_completed')).toEqual(
      jasmine.objectContaining({ok: false, code: 'transition_not_allowed'})
    );
    expect(transitionMarketplaceTransactionStatus('received', 'admin', 'close_completed')).toEqual({
      ok: true,
      nextStatus: 'closed'
    });
  });

  it('rejects transitions from terminal states', () => {
    const terminalStatuses: MarketplaceTransactionStatus[] = [
      'closed',
      'cancelled_by_buyer',
      'cancelled_by_seller',
      'cancelled_mutual',
      'disputed'
    ];

    for (const status of terminalStatuses) {
      expect(transitionMarketplaceTransactionStatus(status, 'seller', 'seller_accept')).toEqual(
        jasmine.objectContaining({ok: false, code: 'terminal_status'})
      );
    }
  });

  it('derives buyer next-action chips from the transition rules', () => {
    expect(getMarketplaceTransactionNextActionChips(null, 'buyer')).toEqual([
      {
        action: 'buyer_inquire',
        label: 'Send inquiry',
        nextStatus: 'proposed',
        tone: 'primary'
      }
    ]);
    expect(getMarketplaceTransactionNextActionChips('accepted', 'buyer')).toEqual([
      {
        action: 'buyer_mark_paid',
        label: 'Mark paid',
        nextStatus: 'paid',
        tone: 'primary'
      },
      {
        action: 'open_dispute',
        label: 'Open dispute',
        nextStatus: 'disputed',
        tone: 'danger'
      }
    ]);
    expect(getMarketplaceTransactionNextActionChips('shipped', 'buyer')).toEqual([
      {
        action: 'buyer_mark_received',
        label: 'Mark received',
        nextStatus: 'received',
        tone: 'primary'
      },
      {
        action: 'open_dispute',
        label: 'Open dispute',
        nextStatus: 'disputed',
        tone: 'danger'
      }
    ]);
  });

  it('derives seller next-action chips from the transition rules', () => {
    expect(getMarketplaceTransactionNextActionChips('proposed', 'seller')).toEqual([
      {
        action: 'seller_accept',
        label: 'Accept offer',
        nextStatus: 'accepted',
        tone: 'primary'
      },
      {
        action: 'seller_decline',
        label: 'Decline offer',
        nextStatus: 'cancelled_by_seller',
        tone: 'danger'
      },
      {
        action: 'seller_counter',
        label: 'Counter offer',
        nextStatus: 'negotiating',
        tone: 'neutral'
      },
      {
        action: 'seller_cancel',
        label: 'Cancel transaction',
        nextStatus: 'cancelled_by_seller',
        tone: 'danger'
      },
      {
        action: 'mutual_cancel',
        label: 'Mutual cancel',
        nextStatus: 'cancelled_mutual',
        tone: 'danger'
      }
    ]);
    expect(getMarketplaceTransactionNextActionChips('received', 'seller')).toEqual([
      {
        action: 'close_completed',
        label: 'Close sale',
        nextStatus: 'closed',
        tone: 'primary'
      },
      {
        action: 'open_dispute',
        label: 'Open dispute',
        nextStatus: 'disputed',
        tone: 'danger'
      }
    ]);
  });

  it('returns no next-action chips for terminal states', () => {
    const terminalStatuses: MarketplaceTransactionStatus[] = [
      'closed',
      'cancelled_by_buyer',
      'cancelled_by_seller',
      'cancelled_mutual',
      'disputed'
    ];

    for (const status of terminalStatuses) {
      expect(getMarketplaceTransactionNextActionChips(status, 'buyer')).toEqual([]);
      expect(getMarketplaceTransactionNextActionChips(status, 'seller')).toEqual([]);
    }
  });

  it('disables seller shipped chip until a shipping or tracking note is present', () => {
    expect(getMarketplaceTransactionNextActionChips('paid', 'seller', {
      shippingNote: '   ',
      trackingNote: null
    })).toEqual([
      {
        action: 'seller_mark_shipped',
        disabled: true,
        label: 'Mark shipped',
        reason: 'Add a shipping or tracking note before marking shipped',
        tone: 'primary'
      },
      {
        action: 'open_dispute',
        label: 'Open dispute',
        nextStatus: 'disputed',
        tone: 'danger'
      }
    ]);

    expect(getMarketplaceTransactionNextActionChips('paid', 'seller', {
      trackingNote: 'Carrier tracking TRK-123'
    })).toEqual([
      {
        action: 'seller_mark_shipped',
        label: 'Mark shipped',
        nextStatus: 'shipped',
        tone: 'primary'
      },
      {
        action: 'open_dispute',
        label: 'Open dispute',
        nextStatus: 'disputed',
        tone: 'danger'
      }
    ]);
  });

  it('keeps next-action chip descriptors free of private transaction fields', () => {
    const chips = getMarketplaceTransactionNextActionChips('paid', 'seller', {
      buyerShippingAddressSnapshot: {line1: 'Private street'},
      internalNote: 'do not serialize',
      shippingNote: 'Carrier drop-off',
      trackingNote: 'TRK-private'
    } as MarketplaceTransactionTransitionContext & Record<string, unknown>);

    expect(JSON.stringify(chips)).not.toContain('Private street');
    expect(JSON.stringify(chips)).not.toContain('TRK-private');
    expect(JSON.stringify(chips)).not.toContain('do not serialize');
    for (const chip of chips) {
      expect(Object.keys(chip).sort()).toEqual(allowedNextActionChipKeys(chip));
    }
  });

  it('returns an empty next-action chip list for invalid or malformed inputs', () => {
    expect(() => getMarketplaceTransactionNextActionChips(
      'unknown' as MarketplaceTransactionStatus,
      'buyer'
    )).not.toThrow();
    expect(getMarketplaceTransactionNextActionChips(
      'unknown' as MarketplaceTransactionStatus,
      'buyer'
    )).toEqual([]);
    expect(getMarketplaceTransactionNextActionChips(
      'proposed',
      'visitor' as MarketplaceTransactionActorRole
    )).toEqual([]);
    expect(() => getMarketplaceTransactionNextActionChips(
      'paid',
      'seller',
      42 as unknown as MarketplaceTransactionTransitionContext
    )).not.toThrow();
  });

  it('builds whitelisted timeline descriptors for transaction lifecycle events', () => {
    const timeline = buildMarketplaceTransactionTimeline([
      {toStatus: 'proposed', actorRole: 'buyer', action: 'buyer_inquire', createdAt: ' 2026-07-08T10:00:00Z '},
      {fromStatus: 'proposed', toStatus: 'accepted', actorRole: 'seller', action: 'seller_accept'},
      {fromStatus: 'accepted', toStatus: 'paid', actorRole: 'buyer', action: 'buyer_mark_paid'},
      {fromStatus: 'paid', toStatus: 'shipped', actorRole: 'seller', action: 'seller_mark_shipped'},
      {fromStatus: 'shipped', toStatus: 'received', actorRole: 'buyer', action: 'buyer_mark_received'},
      {fromStatus: 'received', toStatus: 'closed', actorRole: 'seller', action: 'close_completed'}
    ]);

    expect(timeline).toEqual([
      {
        actorRole: 'buyer',
        available: true,
        createdAt: '2026-07-08T10:00:00Z',
        label: 'Inquiry sent',
        status: 'proposed',
        terminal: false,
        tone: 'primary'
      },
      {
        actorRole: 'seller',
        available: true,
        label: 'Offer accepted',
        status: 'accepted',
        terminal: false,
        tone: 'primary'
      },
      {
        actorRole: 'buyer',
        available: true,
        label: 'Payment marked',
        status: 'paid',
        terminal: false,
        tone: 'primary'
      },
      {
        actorRole: 'seller',
        available: true,
        label: 'Marked shipped',
        status: 'shipped',
        terminal: false,
        tone: 'primary'
      },
      {
        actorRole: 'buyer',
        available: true,
        label: 'Received',
        status: 'received',
        terminal: false,
        tone: 'primary'
      },
      {
        actorRole: 'seller',
        available: true,
        label: 'Sale closed',
        status: 'closed',
        terminal: true,
        tone: 'primary'
      }
    ]);
  });

  it('marks cancellation and dispute timeline descriptors as terminal danger events', () => {
    expect(buildMarketplaceTransactionTimeline([
      {toStatus: 'cancelled_by_buyer'},
      {toStatus: 'cancelled_by_seller'},
      {toStatus: 'cancelled_mutual'},
      {toStatus: 'disputed'}
    ])).toEqual([
      {
        available: true,
        label: 'Cancelled by buyer',
        status: 'cancelled_by_buyer',
        terminal: true,
        tone: 'danger'
      },
      {
        available: true,
        label: 'Cancelled by seller',
        status: 'cancelled_by_seller',
        terminal: true,
        tone: 'danger'
      },
      {
        available: true,
        label: 'Cancelled mutually',
        status: 'cancelled_mutual',
        terminal: true,
        tone: 'danger'
      },
      {
        available: true,
        label: 'Dispute opened',
        status: 'disputed',
        terminal: true,
        tone: 'danger'
      }
    ]);
  });

  it('returns unavailable timeline descriptors for malformed status, actor, or action input', () => {
    expect(() => buildMarketplaceTransactionTimelineItem({
      toStatus: 'unknown' as MarketplaceTransactionStatus
    })).not.toThrow();
    expect(buildMarketplaceTransactionTimelineItem({
      toStatus: 'unknown' as MarketplaceTransactionStatus
    })).toEqual({
      available: false,
      reason: 'invalid_status'
    });
    expect(buildMarketplaceTransactionTimelineItem({
      fromStatus: 'unknown' as MarketplaceTransactionStatus,
      toStatus: 'proposed'
    })).toEqual({
      available: false,
      reason: 'invalid_status'
    });
    expect(buildMarketplaceTransactionTimelineItem({
      actorRole: 'visitor' as MarketplaceTransactionActorRole,
      toStatus: 'proposed'
    })).toEqual({
      available: false,
      reason: 'invalid_actor'
    });
    expect(buildMarketplaceTransactionTimelineItem({
      action: 'bad_action' as MarketplaceTransactionAction,
      toStatus: 'proposed'
    })).toEqual({
      available: false,
      reason: 'invalid_action'
    });
    expect(buildMarketplaceTransactionTimeline(null)).toEqual([]);
  });

  it('keeps timeline descriptors free of notes, shipping details, address snapshots, and unknown fields', () => {
    const item = buildMarketplaceTransactionTimelineItem({
      actorRole: 'seller',
      buyerShippingAddressSnapshot: {line1: 'Private street'},
      createdAt: new Date('2026-07-08T10:00:00.000Z'),
      internalError: 'raw database error',
      note: 'private note',
      shippingNote: 'left at drop point',
      toStatus: 'shipped',
      trackingNote: 'TRK-private'
    } as Parameters<typeof buildMarketplaceTransactionTimelineItem>[0] & Record<string, unknown>);

    expect(JSON.stringify(item)).not.toContain('Private street');
    expect(JSON.stringify(item)).not.toContain('raw database error');
    expect(JSON.stringify(item)).not.toContain('private note');
    expect(JSON.stringify(item)).not.toContain('left at drop point');
    expect(JSON.stringify(item)).not.toContain('TRK-private');
    expect(item).toEqual({
      actorRole: 'seller',
      available: true,
      createdAt: '2026-07-08T10:00:00.000Z',
      label: 'Marked shipped',
      status: 'shipped',
      terminal: false,
      tone: 'primary'
    });
    if (item.available) {
      expect(Object.keys(item).sort()).toEqual(allowedTimelineItemKeys(item));
    }
  });

  it('preserves wrapper undefined results for illegal transitions', () => {
    expect(getMarketplaceTransactionNextStatus('accepted', 'seller_counter')).toBeUndefined();
    expect(getMarketplaceTransactionNextStatus('cancelled_by_buyer', 'seller_accept')).toBeUndefined();
    expect(getMarketplaceTransactionNextStatus('cancelled_by_seller', 'mutual_cancel')).toBeUndefined();
    expect(getMarketplaceTransactionNextStatus('cancelled_mutual', 'buyer_cancel')).toBeUndefined();
  });

  it('summarizes accepted price and private address snapshot readiness', () => {
    expect(buildMarketplaceTransactionSnapshotSummary({
      agreedPriceAmountMinor: 12345,
      agreedPriceCurrency: 'EUR',
      buyerShippingAddressSnapshot: {city: 'Milan', countryCode: 'IT'},
      status: 'accepted'
    })).toEqual({
      accepted: true,
      hasAcceptedPriceSnapshot: true,
      hasBuyerAddressSnapshot: true,
      readyToRevealSensitiveDetails: true
    });

    expect(buildMarketplaceTransactionSnapshotSummary({
      agreedPriceAmountMinor: null,
      agreedPriceCurrency: 'EUR',
      buyerShippingAddressSnapshot: null,
      status: 'accepted'
    }).readyToRevealSensitiveDetails).toBeFalse();
  });

  it('summarizes a proposed buyer offer with normalized currency and seller response readiness', () => {
    expect(buildMarketplaceLatestOfferSummary({
      currentActorRole: 'seller',
      latestActorRole: 'buyer',
      proposedPrice: ' 120,50 ',
      proposedPriceCurrency: ' eur ',
      status: 'proposed'
    })).toEqual({
      amountMinor: 12050,
      available: true,
      awaitingActorRole: 'seller',
      canCurrentActorRespond: true,
      currency: 'EUR',
      label: 'Buyer offer',
      source: 'proposed_price'
    });
  });

  it('summarizes the latest seller counter offer over the original proposal during negotiation', () => {
    expect(buildMarketplaceLatestOfferSummary({
      counterPrice: '90.00',
      counterPriceCurrency: 'usd',
      currentActorRole: 'buyer',
      latestActorRole: 'seller',
      proposedPrice: '100.00',
      proposedPriceCurrency: 'USD',
      status: 'negotiating'
    })).toEqual({
      amountMinor: 9000,
      available: true,
      awaitingActorRole: 'buyer',
      canCurrentActorRespond: true,
      currency: 'USD',
      label: 'Seller counter offer',
      source: 'counter_price'
    });
  });

  it('summarizes agreed price over active offer values once the transaction is accepted', () => {
    expect(buildMarketplaceLatestOfferSummary({
      agreedPriceAmountMinor: 9500,
      agreedPriceCurrency: ' chf ',
      counterPrice: '90.00',
      counterPriceCurrency: 'CHF',
      currentActorRole: 'buyer',
      latestActorRole: 'seller',
      proposedPrice: '100.00',
      proposedPriceCurrency: 'CHF',
      status: 'accepted'
    })).toEqual({
      amountMinor: 9500,
      available: true,
      canCurrentActorRespond: false,
      currency: 'CHF',
      label: 'Agreed price',
      source: 'agreed_price'
    });
  });

  it('returns invalid price for malformed latest offer price and currency pairs', () => {
    expect(buildMarketplaceLatestOfferSummary({
      proposedPrice: '12.3456',
      proposedPriceCurrency: 'EUR',
      status: 'proposed'
    })).toEqual({
      available: false,
      reason: 'invalid_price'
    });

    expect(buildMarketplaceLatestOfferSummary({
      counterPrice: '12.3456',
      counterPriceCurrency: 'EUR',
      proposedPrice: '100.00',
      proposedPriceCurrency: 'EUR',
      status: 'negotiating'
    })).toEqual({
      available: false,
      reason: 'invalid_price'
    });

    expect(buildMarketplaceLatestOfferSummary({
      agreedPriceAmountMinor: 1200,
      agreedPriceCurrency: 'EURO',
      status: 'paid'
    })).toEqual({
      available: false,
      reason: 'invalid_price'
    });
  });

  it('returns inactive or missing summaries for terminal cancellation and no-op states', () => {
    expect(buildMarketplaceLatestOfferSummary({
      proposedPrice: '120',
      proposedPriceCurrency: 'EUR',
      status: 'cancelled_by_buyer'
    })).toEqual({
      available: false,
      reason: 'inactive_status'
    });

    expect(buildMarketplaceLatestOfferSummary(null)).toEqual({
      available: false,
      reason: 'inactive_status'
    });

    expect(buildMarketplaceLatestOfferSummary({status: 'proposed'})).toEqual({
      available: false,
      reason: 'missing_price'
    });
  });

  it('keeps latest-offer summaries free of private and unknown transaction fields', () => {
    const summary = buildMarketplaceLatestOfferSummary({
      buyerShippingAddressSnapshot: {
        line1: 'Private street'
      },
      internalNote: 'do not serialize',
      latestActorRole: 'buyer',
      note: 'raw buyer note',
      proposedPrice: ' 12 ',
      proposedPriceCurrency: ' eur ',
      status: 'proposed'
    } as MarketplaceLatestOfferSummaryInput & Record<string, unknown>);

    expect(JSON.stringify(summary)).not.toContain('Private street');
    expect(JSON.stringify(summary)).not.toContain('do not serialize');
    expect(JSON.stringify(summary)).not.toContain('raw buyer note');
    expect(JSON.stringify(summary)).not.toContain(' 12 ');
    expect(summary.available).toBeTrue();
    if (summary.available) {
      expect(Object.keys(summary).sort()).toEqual(allowedLatestOfferSummaryKeys(summary));
    }
  });

  it('normalizes a valid buyer inquiry draft for future persistence', () => {
    const result = validateAndNormalizeMarketplaceInquiryDraft({
      buyerDestinationSummary: '  Milan, IT  ',
      buyerProfileId: ' buyer-1 ',
      listingId: ' listing-1 ',
      message: '  Is this still available?  ',
      proposedPrice: '1 234,50',
      proposedPriceCurrency: ' eur '
    });

    expect(result).toEqual({
      errors: {},
      inquiry: {
        buyerDestinationSummary: 'Milan, IT',
        buyerProfileId: 'buyer-1',
        listingId: 'listing-1',
        message: 'Is this still available?',
        proposedPriceAmountMinor: 123450,
        proposedPriceCurrency: 'EUR'
      },
      valid: true
    });
  });

  it('allows buyer inquiries without a proposed price', () => {
    const result = validateAndNormalizeMarketplaceInquiryDraft({
      buyerProfileId: 'buyer-1',
      listingId: 'listing-1',
      message: 'I am interested.'
    });

    expect(result.valid).toBeTrue();
    if (result.valid) {
      expect(result.inquiry).toEqual({
        buyerProfileId: 'buyer-1',
        listingId: 'listing-1',
        message: 'I am interested.'
      });
    }
  });

  it('requires a valid proposed price and currency pair when either is provided', () => {
    expect(validateAndNormalizeMarketplaceInquiryDraft({
      buyerProfileId: 'buyer-1',
      listingId: 'listing-1',
      message: 'Can you do this price?',
      proposedPrice: '12.3456',
      proposedPriceCurrency: 'EUR'
    }).errors).toEqual({
      proposedPrice: 'Enter a valid proposed price'
    });

    expect(validateAndNormalizeMarketplaceInquiryDraft({
      buyerProfileId: 'buyer-1',
      listingId: 'listing-1',
      message: 'Can you do this price?',
      proposedPrice: '120'
    }).errors).toEqual({
      proposedPrice: 'Enter a valid proposed price',
      proposedPriceCurrency: 'Use a three-letter currency code'
    });

    expect(validateAndNormalizeMarketplaceInquiryDraft({
      buyerProfileId: 'buyer-1',
      listingId: 'listing-1',
      message: 'Can you do this price?',
      proposedPriceCurrency: 'EURO'
    }).errors).toEqual({
      proposedPrice: 'Enter a valid proposed price',
      proposedPriceCurrency: 'Use a three-letter currency code'
    });
  });

  it('does not throw when inquiry values are malformed', () => {
    expect(() => validateAndNormalizeMarketplaceInquiryDraft({
      buyerDestinationSummary: { city: 'Milan' },
      buyerProfileId: ['buyer-1'],
      listingId: { id: 'listing-1' },
      message: { text: 'hello' },
      proposedPrice: { amount: 120 },
      proposedPriceCurrency: { code: 'EUR' }
    } as unknown as MarketplaceInquiryDraft)).not.toThrow();

    const result = validateAndNormalizeMarketplaceInquiryDraft(null);

    expect(result.valid).toBeFalse();
    expect(result.errors).toEqual({
      buyerProfileId: 'Required',
      listingId: 'Required',
      message: 'Required'
    });
  });

  it('excludes unknown, private, and address snapshot fields from normalized inquiries', () => {
    const result = validateAndNormalizeMarketplaceInquiryDraft({
      buyerProfileId: 'buyer-1',
      buyerShippingAddressSnapshot: {
        city: 'Milan',
        line1: 'Private street'
      },
      internalNote: 'do not serialize',
      listingId: 'listing-1',
      message: 'Hello',
      sellerProfileId: 'seller-1'
    } as MarketplaceInquiryDraft & Record<string, unknown>);

    expect(result.valid).toBeTrue();
    if (result.valid) {
      expect(result.inquiry).toEqual({
        buyerProfileId: 'buyer-1',
        listingId: 'listing-1',
        message: 'Hello'
      });
      expect(result.inquiry).not.toEqual(jasmine.objectContaining({
        buyerShippingAddressSnapshot: jasmine.anything(),
        internalNote: jasmine.anything(),
        sellerProfileId: jasmine.anything()
      }));
    }
  });

  it('enforces a reasonable inquiry message max length', () => {
    const result = validateAndNormalizeMarketplaceInquiryDraft({
      buyerProfileId: 'buyer-1',
      listingId: 'listing-1',
      message: 'x'.repeat(1001)
    });

    expect(result.valid).toBeFalse();
    expect(result.errors).toEqual({
      message: 'Use 1000 characters or fewer'
    });
  });
});

function allowedNextActionChipKeys(chip: MarketplaceTransactionNextActionChip): string[] {
  return [
    'action',
    ...(chip.disabled !== undefined ? ['disabled'] : []),
    'label',
    ...(chip.nextStatus !== undefined ? ['nextStatus'] : []),
    ...(chip.reason !== undefined ? ['reason'] : []),
    'tone'
  ].sort();
}

function allowedLatestOfferSummaryKeys(summary: Extract<MarketplaceLatestOfferSummary, {available: true}>): string[] {
  return [
    'amountMinor',
    'available',
    ...(summary.awaitingActorRole !== undefined ? ['awaitingActorRole'] : []),
    'canCurrentActorRespond',
    'currency',
    'label',
    'source'
  ].sort();
}

function allowedTimelineItemKeys(item: Extract<MarketplaceTransactionTimelineItem, {available: true}>): string[] {
  return [
    ...(item.actorRole !== undefined ? ['actorRole'] : []),
    'available',
    ...(item.createdAt !== undefined ? ['createdAt'] : []),
    'label',
    'status',
    'terminal',
    'tone'
  ].sort();
}
