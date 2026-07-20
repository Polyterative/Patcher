import {
  MARKETPLACE_FEEDBACK_BODY_MAX_LENGTH,
  MARKETPLACE_FEEDBACK_WINDOW_DAYS,
  canLeaveMarketplaceFeedback,
  isMarketplaceFeedbackVisible,
  summarizeMarketplaceTrustBand,
  validateMarketplaceFeedbackDraft
} from './marketplace-feedback.utils';

describe('marketplace-feedback.utils', () => {
  const closedAt = '2026-07-01T12:00:00Z';

  it('allows feedback only for completed transactions with a closed timestamp', () => {
    expect(canLeaveMarketplaceFeedback({
      closedAt,
      now: '2026-07-10T12:00:00Z',
      transactionStatus: 'closed'
    })).toBeTrue();
    expect(canLeaveMarketplaceFeedback({
      closedAt,
      now: '2026-07-10T12:00:00Z',
      transactionStatus: 'accepted'
    })).toBeFalse();
    expect(canLeaveMarketplaceFeedback({
      closedAt: null,
      now: '2026-07-10T12:00:00Z',
      transactionStatus: 'accepted'
    })).toBeFalse();
    expect(canLeaveMarketplaceFeedback({
      closedAt,
      now: '2026-07-10T12:00:00Z',
      transactionStatus: 'proposed'
    })).toBeFalse();
  });

  it('enforces the 30-day feedback window', () => {
    expect(MARKETPLACE_FEEDBACK_WINDOW_DAYS).toBe(30);
    expect(canLeaveMarketplaceFeedback({
      closedAt,
      now: '2026-08-01T12:00:01Z',
      transactionStatus: 'closed'
    })).toBeFalse();
  });

  it('keeps feedback hidden until both sides submit or the window expires', () => {
    expect(isMarketplaceFeedbackVisible({
      buyerFeedbackCreatedAt: '2026-07-05T12:00:00Z',
      closedAt,
      now: '2026-07-10T12:00:00Z'
    })).toBeFalse();
    expect(isMarketplaceFeedbackVisible({
      buyerFeedbackCreatedAt: '2026-07-05T12:00:00Z',
      closedAt,
      now: '2026-07-10T12:00:00Z',
      sellerFeedbackCreatedAt: '2026-07-06T12:00:00Z'
    })).toBeTrue();
    expect(isMarketplaceFeedbackVisible({
      buyerFeedbackCreatedAt: '2026-07-05T12:00:00Z',
      closedAt,
      now: '2026-08-01T12:00:01Z'
    })).toBeTrue();
  });

  it('respects same-pair cap and one-feedback-per-party inputs', () => {
    expect(canLeaveMarketplaceFeedback({
      closedAt,
      now: '2026-07-10T12:00:00Z',
      samePairFeedbackCap: 2,
      samePairFeedbackCount: 2,
      transactionStatus: 'closed'
    })).toBeFalse();
    expect(canLeaveMarketplaceFeedback({
      alreadyLeftFeedback: true,
      closedAt,
      now: '2026-07-10T12:00:00Z',
      transactionStatus: 'closed'
    })).toBeFalse();
  });

  it('summarizes new sellers with a neutral bounded band', () => {
    expect(summarizeMarketplaceTrustBand({
      completedTransactions: 0,
      negativeFeedbackCount: 0,
      positiveFeedbackCount: 0
    })).toEqual({
      band: 'new_seller',
      copy: 'Not enough closed marketplace history yet. Use normal buyer caution.',
      label: 'New seller'
    });
  });

  it('uses bounded trust bands instead of star scores or leaderboards', () => {
    const summary = summarizeMarketplaceTrustBand({
      completedTransactions: 5,
      negativeFeedbackCount: 0,
      positiveFeedbackCount: 4
    });

    expect(summary.band).toBe('steady');
    expect(`${summary.label} ${summary.copy}`).not.toContain('star');
    expect(`${summary.label} ${summary.copy}`).not.toContain('score');
    expect(`${summary.label} ${summary.copy}`).not.toContain('leaderboard');
  });

  it('normalizes positive feedback without a body', () => {
    expect(validateMarketplaceFeedbackDraft({
      giverProfileId: ' giver-1 ',
      receiverProfileId: ' receiver-1 ',
      sentiment: 'positive',
      transactionId: ' tx-1 '
    })).toEqual({
      feedback: {
        giverProfileId: 'giver-1',
        receiverProfileId: 'receiver-1',
        sentiment: 'positive',
        transactionId: 'tx-1'
      },
      valid: true
    });
  });

  it('requires body context for neutral and negative feedback', () => {
    expect(validateMarketplaceFeedbackDraft({
      giverProfileId: 'giver-1',
      receiverProfileId: 'receiver-1',
      sentiment: 'neutral',
      transactionId: 'tx-1'
    })).toEqual({
      errors: ['body_required'],
      valid: false
    });
    expect(validateMarketplaceFeedbackDraft({
      body: '   ',
      giverProfileId: 'giver-1',
      receiverProfileId: 'receiver-1',
      sentiment: 'negative',
      transactionId: 'tx-1'
    })).toEqual({
      errors: ['body_required'],
      valid: false
    });
  });

  it('rejects invalid sentiments and blank IDs', () => {
    expect(validateMarketplaceFeedbackDraft({
      body: 'Context',
      giverProfileId: '',
      receiverProfileId: '   ',
      sentiment: 'great',
      transactionId: ' '
    })).toEqual({
      errors: [
        'transaction_id_required',
        'giver_profile_id_required',
        'receiver_profile_id_required',
        'sentiment_invalid'
      ],
      valid: false
    });
  });

  it('trims and caps feedback body length', () => {
    const body = ` ${'a'.repeat(MARKETPLACE_FEEDBACK_BODY_MAX_LENGTH + 20)} `;

    expect(validateMarketplaceFeedbackDraft({
      body,
      giverProfileId: 'giver-1',
      receiverProfileId: 'receiver-1',
      sentiment: 'negative',
      transactionId: 'tx-1'
    })).toEqual({
      feedback: {
        body: 'a'.repeat(MARKETPLACE_FEEDBACK_BODY_MAX_LENGTH),
        giverProfileId: 'giver-1',
        receiverProfileId: 'receiver-1',
        sentiment: 'negative',
        transactionId: 'tx-1'
      },
      valid: true
    });
  });

  it('never throws on malformed draft values', () => {
    const malformedValues = [
      null,
      undefined,
      'draft',
      12,
      [],
      {
        body: { unsafe: true },
        giverProfileId: 1,
        receiverProfileId: false,
        sentiment: null,
        transactionId: Symbol('tx')
      }
    ];

    for (const value of malformedValues) {
      expect(() => validateMarketplaceFeedbackDraft(value)).not.toThrow();
      expect(validateMarketplaceFeedbackDraft(value).valid).toBeFalse();
    }
  });

  it('excludes unknown fields from normalized feedback', () => {
    const result = validateMarketplaceFeedbackDraft({
      adminOnly: true,
      body: '  Useful context  ',
      giverProfileId: 'giver-1',
      privateModerationState: 'approved',
      receiverProfileId: 'receiver-1',
      sentiment: 'neutral',
      transactionId: 'tx-1'
    });

    expect(result).toEqual({
      feedback: {
        body: 'Useful context',
        giverProfileId: 'giver-1',
        receiverProfileId: 'receiver-1',
        sentiment: 'neutral',
        transactionId: 'tx-1'
      },
      valid: true
    });
    expect('adminOnly' in (result.valid ? result.feedback : {})).toBeFalse();
    expect('privateModerationState' in (result.valid ? result.feedback : {})).toBeFalse();
  });
});
