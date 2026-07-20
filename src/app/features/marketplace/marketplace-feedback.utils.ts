export type MarketplaceFeedbackSentiment = 'positive' | 'neutral' | 'negative';

export type MarketplaceTrustBand = 'new_seller' | 'steady' | 'mixed' | 'limited_history';

export const MARKETPLACE_FEEDBACK_WINDOW_DAYS = 30;
export const MARKETPLACE_FEEDBACK_WINDOW_MS = MARKETPLACE_FEEDBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const MARKETPLACE_FEEDBACK_BODY_MAX_LENGTH = 500;

export interface MarketplaceFeedbackDraft {
  transactionId: string;
  giverProfileId: string;
  receiverProfileId: string;
  sentiment: MarketplaceFeedbackSentiment;
  body?: string;
}

export type MarketplaceFeedbackDraftValidationError =
  | 'transaction_id_required'
  | 'giver_profile_id_required'
  | 'receiver_profile_id_required'
  | 'sentiment_invalid'
  | 'body_required';

export type MarketplaceFeedbackDraftValidationResult =
  | {
      valid: true;
      feedback: MarketplaceFeedbackDraft;
    }
  | {
      valid: false;
      errors: MarketplaceFeedbackDraftValidationError[];
    };

export interface MarketplaceFeedbackEligibilityInput {
  transactionStatus: string;
  closedAt: string | Date | number | null | undefined;
  now?: string | Date | number;
  alreadyLeftFeedback?: boolean;
  samePairFeedbackCount?: number;
  samePairFeedbackCap?: number;
}

export interface MarketplaceFeedbackVisibilityInput {
  closedAt: string | Date | number | null | undefined;
  buyerFeedbackCreatedAt?: string | Date | number | null;
  sellerFeedbackCreatedAt?: string | Date | number | null;
  now?: string | Date | number;
}

export interface MarketplaceTrustBandInput {
  completedTransactions: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
}

export interface MarketplaceTrustBandSummary {
  band: MarketplaceTrustBand;
  label: string;
  copy: string;
}

const DEFAULT_SAME_PAIR_FEEDBACK_CAP = 3;
const NEW_SELLER_COMPLETED_TRANSACTION_THRESHOLD = 3;
const FEEDBACK_ELIGIBLE_COMPLETED_STATUSES = new Set([
  'closed'
]);
const MARKETPLACE_FEEDBACK_SENTIMENTS = new Set<MarketplaceFeedbackSentiment>([
  'positive',
  'neutral',
  'negative'
]);

export function validateMarketplaceFeedbackDraft(input: unknown): MarketplaceFeedbackDraftValidationResult {
  const draft = asFeedbackDraftRecord(input);
  const transactionId = normalizeRequiredText(draft?.transactionId);
  const giverProfileId = normalizeRequiredText(draft?.giverProfileId);
  const receiverProfileId = normalizeRequiredText(draft?.receiverProfileId);
  const sentiment = normalizeFeedbackSentiment(draft?.sentiment);
  const body = normalizeOptionalFeedbackBody(draft?.body);
  const errors: MarketplaceFeedbackDraftValidationError[] = [];

  if (!transactionId) {
    errors.push('transaction_id_required');
  }

  if (!giverProfileId) {
    errors.push('giver_profile_id_required');
  }

  if (!receiverProfileId) {
    errors.push('receiver_profile_id_required');
  }

  if (!sentiment) {
    errors.push('sentiment_invalid');
  }

  if ((sentiment === 'neutral' || sentiment === 'negative') && !body) {
    errors.push('body_required');
  }

  if (errors.length > 0 || !transactionId || !giverProfileId || !receiverProfileId || !sentiment) {
    return {
      errors,
      valid: false
    };
  }

  return {
    feedback: {
      ...(body ? { body } : {}),
      giverProfileId,
      receiverProfileId,
      sentiment,
      transactionId
    },
    valid: true
  };
}

export function canLeaveMarketplaceFeedback(input: MarketplaceFeedbackEligibilityInput): boolean {
  const closedAtMs = parseFeedbackTime(input.closedAt);
  const nowMs = parseFeedbackTime(input.now ?? Date.now());
  const samePairFeedbackCap = input.samePairFeedbackCap ?? DEFAULT_SAME_PAIR_FEEDBACK_CAP;

  if (!FEEDBACK_ELIGIBLE_COMPLETED_STATUSES.has(input.transactionStatus) || closedAtMs === null || nowMs === null) {
    return false;
  }

  if (input.alreadyLeftFeedback === true) {
    return false;
  }

  if ((input.samePairFeedbackCount ?? 0) >= samePairFeedbackCap) {
    return false;
  }

  return nowMs >= closedAtMs && nowMs - closedAtMs <= MARKETPLACE_FEEDBACK_WINDOW_MS;
}

export function isMarketplaceFeedbackVisible(input: MarketplaceFeedbackVisibilityInput): boolean {
  const closedAtMs = parseFeedbackTime(input.closedAt);
  const nowMs = parseFeedbackTime(input.now ?? Date.now());

  if (closedAtMs === null || nowMs === null) {
    return false;
  }

  if (input.buyerFeedbackCreatedAt && input.sellerFeedbackCreatedAt) {
    return true;
  }

  return nowMs - closedAtMs > MARKETPLACE_FEEDBACK_WINDOW_MS;
}

export function summarizeMarketplaceTrustBand(input: MarketplaceTrustBandInput): MarketplaceTrustBandSummary {
  if (input.completedTransactions < NEW_SELLER_COMPLETED_TRANSACTION_THRESHOLD) {
    return {
      band: 'new_seller',
      copy: 'Not enough closed marketplace history yet. Use normal buyer caution.',
      label: 'New seller'
    };
  }

  if (input.negativeFeedbackCount > 0 && input.negativeFeedbackCount >= input.positiveFeedbackCount) {
    return {
      band: 'mixed',
      copy: 'Closed transaction feedback is mixed. Review recent transaction context.',
      label: 'Mixed feedback'
    };
  }

  if (input.positiveFeedbackCount === 0) {
    return {
      band: 'limited_history',
      copy: 'Completed transactions exist, but public feedback is still limited.',
      label: 'Limited feedback'
    };
  }

  return {
    band: 'steady',
    copy: 'Completed marketplace feedback is generally constructive.',
    label: 'Steady seller'
  };
}

function parseFeedbackTime(value: string | Date | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const ms = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function asFeedbackDraftRecord(value: unknown): Partial<Record<keyof MarketplaceFeedbackDraft, unknown>> | null {
  return value !== null && typeof value === 'object'
    ? value as Partial<Record<keyof MarketplaceFeedbackDraft, unknown>>
    : null;
}

function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFeedbackSentiment(value: unknown): MarketplaceFeedbackSentiment | null {
  if (typeof value !== 'string') {
    return null;
  }

  return MARKETPLACE_FEEDBACK_SENTIMENTS.has(value as MarketplaceFeedbackSentiment)
    ? value as MarketplaceFeedbackSentiment
    : null;
}

function normalizeOptionalFeedbackBody(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, MARKETPLACE_FEEDBACK_BODY_MAX_LENGTH) : null;
}
