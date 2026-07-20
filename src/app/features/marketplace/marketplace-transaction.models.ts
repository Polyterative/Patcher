export const MARKETPLACE_TRANSACTION_STATUSES = [
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
] as const;

export type MarketplaceTransactionStatus = typeof MARKETPLACE_TRANSACTION_STATUSES[number];

export const MARKETPLACE_TRANSACTION_ACTIONS = [
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
] as const;

export type MarketplaceTransactionAction = typeof MARKETPLACE_TRANSACTION_ACTIONS[number];

export type MarketplaceTransactionActorRole = 'buyer' | 'seller' | 'admin';
export type MarketplaceOfferParticipantRole = Extract<MarketplaceTransactionActorRole, 'buyer' | 'seller'>;

export interface MarketplaceTransactionTransitionContext {
  shippingNote?: string | null;
  trackingNote?: string | null;
}

export type MarketplaceTransactionTransitionErrorCode =
  | 'invalid_status'
  | 'invalid_actor'
  | 'invalid_action'
  | 'terminal_status'
  | 'shipping_note_required'
  | 'transition_not_allowed';

export type MarketplaceTransactionTransitionResult =
  | {
      ok: true;
      nextStatus: MarketplaceTransactionStatus;
    }
  | {
      ok: false;
      code: MarketplaceTransactionTransitionErrorCode;
      message: string;
    };

export interface MarketplaceTransactionSnapshotInput {
  status: MarketplaceTransactionStatus;
  agreedPriceAmountMinor?: number | null;
  agreedPriceCurrency?: string | null;
  buyerShippingAddressSnapshot?: unknown;
}

export interface MarketplaceInquiryDraft {
  listingId?: string | null;
  buyerProfileId?: string | null;
  message?: string | null;
  proposedPrice?: string | number | null;
  proposedPriceCurrency?: string | null;
  buyerDestinationSummary?: string | null;
}

export type MarketplaceLatestOfferSource = 'proposed_price' | 'counter_price' | 'agreed_price';
export type MarketplaceLatestOfferUnavailableReason = 'missing_price' | 'invalid_price' | 'inactive_status';

export interface MarketplaceLatestOfferSummaryInput {
  status: MarketplaceTransactionStatus | null | undefined;
  proposedPrice?: string | number | null;
  proposedPriceAmountMinor?: number | null;
  proposedPriceCurrency?: string | null;
  counterPrice?: string | number | null;
  counterPriceAmountMinor?: number | null;
  counterPriceCurrency?: string | null;
  agreedPrice?: string | number | null;
  agreedPriceAmountMinor?: number | null;
  agreedPriceCurrency?: string | null;
  latestActorRole?: MarketplaceOfferParticipantRole | null;
  currentActorRole?: MarketplaceTransactionActorRole | null;
}

export type MarketplaceLatestOfferSummary =
  | {
      available: true;
      amountMinor: number;
      canCurrentActorRespond: boolean;
      currency: string;
      label: string;
      source: MarketplaceLatestOfferSource;
      awaitingActorRole?: MarketplaceOfferParticipantRole;
    }
  | {
      available: false;
      reason: MarketplaceLatestOfferUnavailableReason;
    };

export interface MarketplaceTransactionSnapshotSummary {
  accepted: boolean;
  hasAcceptedPriceSnapshot: boolean;
  hasBuyerAddressSnapshot: boolean;
  readyToRevealSensitiveDetails: boolean;
}

export type MarketplaceTransactionNextActionChipTone = 'primary' | 'neutral' | 'danger';

export interface MarketplaceTransactionNextActionChip {
  action: MarketplaceTransactionAction;
  label: string;
  tone: MarketplaceTransactionNextActionChipTone;
  nextStatus?: MarketplaceTransactionStatus;
  disabled?: boolean;
  reason?: string;
}

export interface MarketplaceTransactionTimelineEventInput {
  fromStatus?: MarketplaceTransactionStatus | null;
  toStatus: MarketplaceTransactionStatus | null | undefined;
  actorRole?: MarketplaceTransactionActorRole | null;
  action?: MarketplaceTransactionAction | null;
  createdAt?: Date | string | null;
  note?: string | null;
  shippingNote?: string | null;
  trackingNote?: string | null;
}

export type MarketplaceTransactionTimelineItemTone = 'primary' | 'neutral' | 'danger';
export type MarketplaceTransactionTimelineUnavailableReason =
  | 'invalid_status'
  | 'invalid_actor'
  | 'invalid_action';

export type MarketplaceTransactionTimelineItem =
  | {
      available: true;
      status: MarketplaceTransactionStatus;
      label: string;
      tone: MarketplaceTransactionTimelineItemTone;
      terminal: boolean;
      actorRole?: MarketplaceTransactionActorRole;
      createdAt?: string;
    }
  | {
      available: false;
      reason: MarketplaceTransactionTimelineUnavailableReason;
    };

export interface MarketplaceInquiryNormalizedDraft {
  listingId: string;
  buyerProfileId: string;
  message: string;
  proposedPriceAmountMinor?: number;
  proposedPriceCurrency?: string;
  buyerDestinationSummary?: string;
}

export type MarketplaceInquiryDraftField =
  | 'listingId'
  | 'buyerProfileId'
  | 'message'
  | 'proposedPrice'
  | 'proposedPriceCurrency'
  | 'buyerDestinationSummary';

export type MarketplaceInquiryDraftValidationResult =
  | {
      valid: true;
      inquiry: MarketplaceInquiryNormalizedDraft;
      errors: Record<string, never>;
    }
  | {
      valid: false;
      errors: Partial<Record<MarketplaceInquiryDraftField, string>>;
    };
