export interface DiscoveryTipPosition {
  left: number;
  top: number;
  side: 'above' | 'below';
}

export interface DiscoveryTipViewModel extends DiscoveryTipPosition {
  title: string;
  body: string;
}

export function estimateDiscoveryTipHeight(title: string, body: string, tipWidth: number): number {
  const contentWidth = Math.max(180, tipWidth - 32);
  const charsPerLine = Math.max(22, Math.floor(contentWidth / 8.5));
  const titleLines = Math.max(1, Math.ceil(title.length / Math.max(16, charsPerLine - 6)));
  const bodyLines = Math.max(2, Math.ceil(body.length / charsPerLine));

  return 132 + (titleLines * 24) + (bodyLines * 18);
}

export function calculateDiscoveryTipPosition(
  anchorRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
  title = '',
  body = ''
): DiscoveryTipPosition {
  const tipWidth = Math.min(320, viewportWidth - 32);
  const tipHeight = estimateDiscoveryTipHeight(title, body, tipWidth);
  const gap = 14;
  const preferAbove = anchorRect.top > viewportHeight * 0.45;
  const side: 'above' | 'below' = preferAbove ? 'above' : 'below';
  const unclampedLeft = anchorRect.left + (anchorRect.width / 2) - (tipWidth / 2);
  const left = Math.max(16, Math.min(unclampedLeft, viewportWidth - tipWidth - 16));
  const top = side === 'above'
    ? Math.max(16, anchorRect.top - gap - tipHeight)
    : Math.min(viewportHeight - tipHeight - 16, anchorRect.bottom + gap);

  return {
    left,
    top,
    side
  };
}
