import type {MarketplaceMessageThreadPreview} from './marketplace-messaging.utils';

const MAX_THREAD_UNREAD_TOTAL_LABEL = 99;

export function sumMarketplaceThreadPreviewUnreadCounts(
  previews: readonly MarketplaceMessageThreadPreview[] | null | undefined
): number {
  if (!Array.isArray(previews)) {
    return 0;
  }

  return previews.reduce((total, preview) => total + readThreadPreviewUnread(preview), 0);
}

export function formatMarketplaceThreadUnreadTotalLabel(total: unknown): string | undefined {
  const safeTotal = typeof total === 'number' && Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  if (safeTotal <= 0) {
    return undefined;
  }

  return safeTotal > MAX_THREAD_UNREAD_TOTAL_LABEL ? `${MAX_THREAD_UNREAD_TOTAL_LABEL}+` : String(safeTotal);
}

function readThreadPreviewUnread(preview: unknown): number {
  if (typeof preview !== 'object' || preview === null) {
    return 0;
  }

  const unreadCount = (preview as {unreadCount?: unknown}).unreadCount;
  if (typeof unreadCount !== 'number' || !Number.isFinite(unreadCount) || unreadCount <= 0) {
    return 0;
  }

  return Math.floor(unreadCount);
}
