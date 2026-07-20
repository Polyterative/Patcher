import {
  isMarketplaceTransactionActorRole,
  isMarketplaceTransactionAction,
  isMarketplaceTransactionStatus,
  TERMINAL_STATUSES
} from './marketplace-transaction.internal';
import {
  type MarketplaceTransactionTimelineEventInput,
  type MarketplaceTransactionTimelineItem,
  type MarketplaceTransactionStatus
} from './marketplace-transaction.models';

const MARKETPLACE_TRANSACTION_TIMELINE_STATUS_COPY: Record<
  MarketplaceTransactionStatus,
  Pick<Extract<MarketplaceTransactionTimelineItem, {available: true}>, 'label' | 'tone'>
> = {
  accepted: {label: 'Offer accepted', tone: 'primary'},
  cancelled_by_buyer: {label: 'Cancelled by buyer', tone: 'danger'},
  cancelled_by_seller: {label: 'Cancelled by seller', tone: 'danger'},
  cancelled_mutual: {label: 'Cancelled mutually', tone: 'danger'},
  closed: {label: 'Sale closed', tone: 'primary'},
  disputed: {label: 'Dispute opened', tone: 'danger'},
  negotiating: {label: 'Counter offer sent', tone: 'neutral'},
  paid: {label: 'Payment marked', tone: 'primary'},
  proposed: {label: 'Inquiry sent', tone: 'primary'},
  received: {label: 'Received', tone: 'primary'},
  shipped: {label: 'Marked shipped', tone: 'primary'}
};

export function buildMarketplaceTransactionTimelineItem(
  input: MarketplaceTransactionTimelineEventInput | null | undefined
): MarketplaceTransactionTimelineItem {
  const status = input?.toStatus;

  if (!isMarketplaceTransactionStatus(status)) {
    return {
      available: false,
      reason: 'invalid_status'
    };
  }

  if (
    input?.fromStatus !== null
    && input?.fromStatus !== undefined
    && !isMarketplaceTransactionStatus(input.fromStatus)
  ) {
    return {
      available: false,
      reason: 'invalid_status'
    };
  }

  if (
    input?.actorRole !== null
    && input?.actorRole !== undefined
    && !isMarketplaceTransactionActorRole(input.actorRole)
  ) {
    return {
      available: false,
      reason: 'invalid_actor'
    };
  }

  if (
    input?.action !== null
    && input?.action !== undefined
    && !isMarketplaceTransactionAction(input.action)
  ) {
    return {
      available: false,
      reason: 'invalid_action'
    };
  }

  const copy = MARKETPLACE_TRANSACTION_TIMELINE_STATUS_COPY[status];
  const actorRole = input?.actorRole;
  const createdAt = normalizeTimelineCreatedAt(input?.createdAt);

  return {
    available: true,
    label: copy.label,
    status,
    terminal: TERMINAL_STATUSES.has(status),
    tone: copy.tone,
    ...(actorRole ? {actorRole} : {}),
    ...(createdAt ? {createdAt} : {})
  };
}

export function buildMarketplaceTransactionTimeline(
  inputs: readonly MarketplaceTransactionTimelineEventInput[] | null | undefined
): MarketplaceTransactionTimelineItem[] {
  return Array.isArray(inputs)
    ? inputs.map((input) => buildMarketplaceTransactionTimelineItem(input))
    : [];
}

function normalizeTimelineCreatedAt(value: Date | string | null | undefined): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return undefined;
}
