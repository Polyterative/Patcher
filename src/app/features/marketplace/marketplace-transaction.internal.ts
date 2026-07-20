import {
  MARKETPLACE_TRANSACTION_ACTIONS,
  MARKETPLACE_TRANSACTION_STATUSES,
  type MarketplaceTransactionAction,
  type MarketplaceTransactionActorRole,
  type MarketplaceTransactionStatus
} from './marketplace-transaction.models';

export const TERMINAL_STATUSES = new Set<MarketplaceTransactionStatus>([
  'closed',
  'cancelled_by_buyer',
  'cancelled_by_seller',
  'cancelled_mutual',
  'disputed'
]);

export const AGREED_PRICE_STATUSES = new Set<MarketplaceTransactionStatus>([
  'accepted',
  'paid',
  'shipped',
  'received',
  'closed'
]);

export const INACTIVE_OFFER_STATUSES = new Set<MarketplaceTransactionStatus>([
  'cancelled_by_buyer',
  'cancelled_by_seller',
  'cancelled_mutual',
  'disputed'
]);

export const MARKETPLACE_TRANSACTION_STATUS_SET = new Set<string>(MARKETPLACE_TRANSACTION_STATUSES);
export const MARKETPLACE_TRANSACTION_ACTION_SET = new Set<string>(MARKETPLACE_TRANSACTION_ACTIONS);
export const MARKETPLACE_TRANSACTION_ACTOR_SET = new Set<string>(['buyer', 'seller', 'admin']);
export const MARKETPLACE_OFFER_PARTICIPANT_SET = new Set<string>(['buyer', 'seller']);

export function isMarketplaceTransactionStatus(value: unknown): value is MarketplaceTransactionStatus {
  return typeof value === 'string' && MARKETPLACE_TRANSACTION_STATUS_SET.has(value);
}

export function isMarketplaceTransactionAction(value: unknown): value is MarketplaceTransactionAction {
  return typeof value === 'string' && MARKETPLACE_TRANSACTION_ACTION_SET.has(value);
}

export function isMarketplaceTransactionActorRole(value: unknown): value is MarketplaceTransactionActorRole {
  return typeof value === 'string' && MARKETPLACE_TRANSACTION_ACTOR_SET.has(value);
}

export function hasMeaningfulInput(value: unknown): boolean {
  return value !== null && value !== undefined && !(typeof value === 'string' && value.trim().length === 0);
}

export function priceInput(value: unknown): string | number | null | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  return undefined;
}

export function trimOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function stringInput(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
