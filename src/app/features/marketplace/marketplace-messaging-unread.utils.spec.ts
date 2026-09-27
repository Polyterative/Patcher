import {
  buildMarketplaceMessageThreadPreview,
  sortMarketplaceMessageThreadPreviews
} from './marketplace-messaging.utils';
import {
  formatMarketplaceThreadUnreadTotalLabel,
  sumMarketplaceThreadPreviewUnreadCounts
} from './marketplace-messaging-unread.utils';

describe('marketplace-messaging-unread.utils', () => {
  it('sums unread counts across available thread previews', () => {
    const previews = sortMarketplaceMessageThreadPreviews([
      buildMarketplaceMessageThreadPreview({transactionId: 'transaction-a', unreadCount: 4}),
      buildMarketplaceMessageThreadPreview({transactionId: 'transaction-b', unreadCount: 2}),
      buildMarketplaceMessageThreadPreview({transactionId: 'transaction-c'})
    ]);

    expect(sumMarketplaceThreadPreviewUnreadCounts(previews)).toBe(6);
  });

  it('skips unavailable previews and malformed entries without throwing', () => {
    const previews = [
      buildMarketplaceMessageThreadPreview({transactionId: ' ', unreadCount: 120}),
      buildMarketplaceMessageThreadPreview({transactionId: 'transaction-a', unreadCount: 3})
    ];

    expect(() => sumMarketplaceThreadPreviewUnreadCounts(
      [...previews, null, undefined, 42] as unknown as Parameters<typeof sumMarketplaceThreadPreviewUnreadCounts>[0]
    )).not.toThrow();
    expect(sumMarketplaceThreadPreviewUnreadCounts(
      [...previews, null, undefined, 42] as unknown as Parameters<typeof sumMarketplaceThreadPreviewUnreadCounts>[0]
    )).toBe(102);
  });

  it('returns zero for unknown input', () => {
    expect(sumMarketplaceThreadPreviewUnreadCounts(null)).toBe(0);
    expect(sumMarketplaceThreadPreviewUnreadCounts(undefined)).toBe(0);
    expect(sumMarketplaceThreadPreviewUnreadCounts([])).toBe(0);
  });

  it('formats total unread labels with a 99+ cap and hides zero', () => {
    expect(formatMarketplaceThreadUnreadTotalLabel(0)).toBeUndefined();
    expect(formatMarketplaceThreadUnreadTotalLabel(-5)).toBeUndefined();
    expect(formatMarketplaceThreadUnreadTotalLabel(Number.NaN)).toBeUndefined();
    expect(formatMarketplaceThreadUnreadTotalLabel(4.9)).toBe('4');
    expect(formatMarketplaceThreadUnreadTotalLabel(99)).toBe('99');
    expect(formatMarketplaceThreadUnreadTotalLabel(102)).toBe('99+');
  });
});
