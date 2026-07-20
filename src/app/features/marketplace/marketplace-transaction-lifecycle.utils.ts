import {
  isMarketplaceTransactionActorRole,
  isMarketplaceTransactionAction,
  isMarketplaceTransactionStatus,
  TERMINAL_STATUSES
} from './marketplace-transaction.internal';
import {
  type MarketplaceTransactionAction,
  type MarketplaceTransactionActorRole,
  type MarketplaceTransactionNextActionChip,
  type MarketplaceTransactionStatus,
  type MarketplaceTransactionTransitionContext,
  type MarketplaceTransactionTransitionErrorCode,
  type MarketplaceTransactionTransitionResult
} from './marketplace-transaction.models';

const SHIPPING_NOTE_REQUIRED_REASON = 'Add a shipping or tracking note before marking shipped';

const MARKETPLACE_TRANSACTION_NEXT_ACTIONS_BY_ROLE: Record<
  MarketplaceTransactionActorRole,
  readonly MarketplaceTransactionAction[]
> = {
  admin: ['mutual_cancel', 'close_completed', 'open_dispute'],
  buyer: [
    'buyer_inquire',
    'buyer_cancel',
    'buyer_mark_paid',
    'buyer_mark_received',
    'mutual_cancel',
    'open_dispute'
  ],
  seller: [
    'seller_accept',
    'seller_decline',
    'seller_counter',
    'seller_cancel',
    'seller_mark_shipped',
    'close_completed',
    'mutual_cancel',
    'open_dispute'
  ]
};

const MARKETPLACE_TRANSACTION_ACTION_CHIP_COPY: Record<
  MarketplaceTransactionAction,
  Pick<MarketplaceTransactionNextActionChip, 'label' | 'tone'>
> = {
  buyer_cancel: {label: 'Cancel inquiry', tone: 'danger'},
  buyer_inquire: {label: 'Send inquiry', tone: 'primary'},
  buyer_mark_paid: {label: 'Mark paid', tone: 'primary'},
  buyer_mark_received: {label: 'Mark received', tone: 'primary'},
  close_completed: {label: 'Close sale', tone: 'primary'},
  mutual_cancel: {label: 'Mutual cancel', tone: 'danger'},
  open_dispute: {label: 'Open dispute', tone: 'danger'},
  seller_accept: {label: 'Accept offer', tone: 'primary'},
  seller_cancel: {label: 'Cancel transaction', tone: 'danger'},
  seller_counter: {label: 'Counter offer', tone: 'neutral'},
  seller_decline: {label: 'Decline offer', tone: 'danger'},
  seller_mark_shipped: {label: 'Mark shipped', tone: 'primary'}
};

export function transitionMarketplaceTransactionStatus(
  currentStatus: MarketplaceTransactionStatus | null | undefined,
  actorRole: MarketplaceTransactionActorRole,
  action: MarketplaceTransactionAction,
  context: MarketplaceTransactionTransitionContext | null | undefined = {}
): MarketplaceTransactionTransitionResult {
  const statusValidation = validateMarketplaceTransactionStatus(currentStatus);
  if (statusValidation) {
    return statusValidation;
  }

  if (!isMarketplaceTransactionActorRole(actorRole)) {
    return transitionError('invalid_actor', 'Actor role is not supported');
  }

  if (!isMarketplaceTransactionAction(action)) {
    return transitionError('invalid_action', 'Action is not supported');
  }

  if (currentStatus && TERMINAL_STATUSES.has(currentStatus)) {
    return transitionError('terminal_status', 'Terminal transaction statuses cannot transition');
  }

  if (
    action === 'open_dispute'
    && currentStatus
    && ['accepted', 'paid', 'shipped', 'received'].includes(currentStatus)
  ) {
    return transitionSuccess('disputed');
  }

  switch (currentStatus) {
    case null:
    case undefined:
      return action === 'buyer_inquire' && actorRole === 'buyer'
        ? transitionSuccess('proposed')
        : transitionError('transition_not_allowed', 'Only buyers can create proposed transactions');
    case 'proposed':
    case 'negotiating':
      return transitionFromProposalOrNegotiation(actorRole, action);
    case 'accepted':
      return actorRole === 'buyer' && action === 'buyer_mark_paid'
        ? transitionSuccess('paid')
        : transitionError('transition_not_allowed', 'Only buyer payment attestation can move accepted transactions forward');
    case 'paid':
      if (actorRole === 'seller' && action === 'seller_mark_shipped') {
        return hasShippingNote(context)
          ? transitionSuccess('shipped')
          : transitionError('shipping_note_required', 'Shipping requires a nonblank shipping or tracking note');
      }

      return transitionError('transition_not_allowed', 'Only sellers can mark paid transactions shipped');
    case 'shipped':
      return actorRole === 'buyer' && action === 'buyer_mark_received'
        ? transitionSuccess('received')
        : transitionError('transition_not_allowed', 'Only buyers can mark shipped transactions received');
    case 'received':
      return action === 'close_completed' && (actorRole === 'seller' || actorRole === 'admin')
        ? transitionSuccess('closed')
        : transitionError('transition_not_allowed', 'Only sellers or admins can close received transactions');
    case 'closed':
    case 'cancelled_by_buyer':
    case 'cancelled_by_seller':
    case 'cancelled_mutual':
    case 'disputed':
      return transitionError('terminal_status', 'Terminal transaction statuses cannot transition');
  }
}

export function getMarketplaceTransactionNextStatus(
  currentStatus: MarketplaceTransactionStatus | null | undefined,
  action: MarketplaceTransactionAction
): MarketplaceTransactionStatus | undefined {
  const actorRole = defaultActorRoleForAction(action);
  if (!actorRole) {
    return undefined;
  }

  const result = transitionMarketplaceTransactionStatus(currentStatus, actorRole, action);
  return result.ok ? result.nextStatus : undefined;
}

export function canMarketplaceTransactionTransition(
  currentStatus: MarketplaceTransactionStatus | null | undefined,
  action: MarketplaceTransactionAction
): boolean {
  return getMarketplaceTransactionNextStatus(currentStatus, action) !== undefined;
}

export function getMarketplaceTransactionNextActionChips(
  currentStatus: MarketplaceTransactionStatus | null | undefined,
  actorRole: MarketplaceTransactionActorRole,
  context: MarketplaceTransactionTransitionContext | null | undefined = {}
): MarketplaceTransactionNextActionChip[] {
  if (!isMarketplaceTransactionActorRole(actorRole)) {
    return [];
  }

  return MARKETPLACE_TRANSACTION_NEXT_ACTIONS_BY_ROLE[actorRole].reduce<MarketplaceTransactionNextActionChip[]>(
    (chips, action) => {
      const result = transitionMarketplaceTransactionStatus(currentStatus, actorRole, action, context);
      const copy = MARKETPLACE_TRANSACTION_ACTION_CHIP_COPY[action];

      if (result.ok) {
        chips.push({
          action,
          label: copy.label,
          nextStatus: result.nextStatus,
          tone: copy.tone
        });
        return chips;
      }

      if ('code' in result && result.code === 'shipping_note_required') {
        chips.push({
          action,
          disabled: true,
          label: copy.label,
          reason: SHIPPING_NOTE_REQUIRED_REASON,
          tone: copy.tone
        });
      }

      return chips;
    },
    []
  );
}

function transitionFromProposalOrNegotiation(
  actorRole: MarketplaceTransactionActorRole,
  action: MarketplaceTransactionAction
): MarketplaceTransactionTransitionResult {
  if (actorRole === 'seller') {
    switch (action) {
      case 'seller_accept':
        return transitionSuccess('accepted');
      case 'seller_decline':
      case 'seller_cancel':
        return transitionSuccess('cancelled_by_seller');
      case 'seller_counter':
        return transitionSuccess('negotiating');
      default:
        break;
    }
  }

  if (actorRole === 'buyer' && action === 'buyer_cancel') {
    return transitionSuccess('cancelled_by_buyer');
  }

  if (action === 'mutual_cancel' && (actorRole === 'buyer' || actorRole === 'seller' || actorRole === 'admin')) {
    return transitionSuccess('cancelled_mutual');
  }

  return transitionError('transition_not_allowed', 'Actor cannot perform this transition from the current status');
}

function validateMarketplaceTransactionStatus(
  currentStatus: MarketplaceTransactionStatus | null | undefined
): MarketplaceTransactionTransitionResult | undefined {
  if (currentStatus === null || currentStatus === undefined) {
    return undefined;
  }

  return isMarketplaceTransactionStatus(currentStatus)
    ? undefined
    : transitionError('invalid_status', 'Current status is not supported');
}

function hasShippingNote(context: MarketplaceTransactionTransitionContext | null | undefined): boolean {
  return hasNonblankText(context?.shippingNote) || hasNonblankText(context?.trackingNote);
}

function hasNonblankText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function defaultActorRoleForAction(
  action: MarketplaceTransactionAction
): MarketplaceTransactionActorRole | undefined {
  switch (action) {
    case 'buyer_inquire':
    case 'buyer_cancel':
    case 'buyer_mark_paid':
    case 'buyer_mark_received':
      return 'buyer';
    case 'seller_accept':
    case 'seller_decline':
    case 'seller_counter':
    case 'seller_cancel':
    case 'seller_mark_shipped':
      return 'seller';
    case 'mutual_cancel':
    case 'close_completed':
    case 'open_dispute':
      return 'admin';
  }
}

function transitionSuccess(nextStatus: MarketplaceTransactionStatus): MarketplaceTransactionTransitionResult {
  return {
    nextStatus,
    ok: true
  };
}

function transitionError(
  code: MarketplaceTransactionTransitionErrorCode,
  message: string
): MarketplaceTransactionTransitionResult {
  return {
    code,
    message,
    ok: false
  };
}
