export interface DiscoveryTipPosition {
  left: number;
  top: number;
  side: 'above' | 'below';
  arrowLeft: number;
}

export interface DiscoveryTipViewModel extends DiscoveryTipPosition {
  title: string;
  body: string;
}

export interface DiscoveryTipSize {
  width: number;
  height: number;
}

export interface DiscoveryTipViewportOffset {
  offsetLeft: number;
  offsetTop: number;
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
  body = '',
  tipSize?: DiscoveryTipSize,
  viewportOffset: DiscoveryTipViewportOffset = {offsetLeft: 0, offsetTop: 0}
): DiscoveryTipPosition {
  const margin = 16;
  const tipWidth = tipSize?.width ?? Math.min(320, viewportWidth - (margin * 2));
  const tipHeight = tipSize?.height ?? estimateDiscoveryTipHeight(title, body, tipWidth);
  const gap = 14;
  const viewportLeft = viewportOffset.offsetLeft;
  const viewportTop = viewportOffset.offsetTop;
  const minLeft = viewportLeft + margin;
  const maxLeft = viewportLeft + viewportWidth - tipWidth - margin;
  const minTop = viewportTop + margin;
  const visibleBottom = viewportTop + viewportHeight - margin;
  const maxTop = visibleBottom - tipHeight;
  const spaceAbove = anchorRect.top - minTop - gap;
  const spaceBelow = visibleBottom - anchorRect.bottom - gap;
  const side: 'above' | 'below' = spaceBelow >= tipHeight || spaceBelow >= spaceAbove ? 'below' : 'above';
  const unclampedLeft = anchorRect.left + (anchorRect.width / 2) - (tipWidth / 2);
  const left = Math.max(minLeft, Math.min(unclampedLeft, maxLeft));
  const unclampedTop = side === 'above'
    ? anchorRect.top - gap - tipHeight
    : anchorRect.bottom + gap;
  const top = Math.max(minTop, Math.min(unclampedTop, maxTop));
  const anchorCenterX = anchorRect.left + (anchorRect.width / 2);
  const arrowLeft = Math.max(18, Math.min(anchorCenterX - left, tipWidth - 18));

  return {
    left,
    top,
    side,
    arrowLeft
  };
}
