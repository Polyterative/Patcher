import { ModuleRenderRect, SignalOverlayFrame, SignalHoverCardPlacement } from './rack-visual-model.types';

export function resolveRenderedModuleRect(
  candidateElement: HTMLElement | null,
  screenRect: DOMRect
): ModuleRenderRect | null {
  if (!(candidateElement instanceof HTMLElement)) {
    return null;
  }

  const rect = candidateElement.getBoundingClientRect();

  return {
    left: rect.left - screenRect.left,
    top: rect.top - screenRect.top,
    right: rect.right - screenRect.left,
    bottom: rect.bottom - screenRect.top,
    centerX: (rect.left + rect.right) / 2 - screenRect.left,
    centerY: (rect.top + rect.bottom) / 2 - screenRect.top,
  };
}

export function buildCurvedSignalPath(
  sourceRect: ModuleRenderRect,
  destinationRect: ModuleRenderRect
): string {
  const startX = destinationRect.centerX >= sourceRect.centerX ? sourceRect.right : sourceRect.left;
  const endX = destinationRect.centerX >= sourceRect.centerX ? destinationRect.left : destinationRect.right;
  const startY = sourceRect.centerY;
  const endY = destinationRect.centerY;
  const horizontalDirection = destinationRect.centerX >= sourceRect.centerX ? 1 : -1;
  const horizontalDistance = Math.abs(endX - startX);
  const controlOffset = Math.max(28, Math.min(96, horizontalDistance * 0.45));
  const controlPoint1X = startX + (controlOffset * horizontalDirection);
  const controlPoint2X = endX - (controlOffset * horizontalDirection);

  return `M ${ startX } ${ startY } C ${ controlPoint1X } ${ startY }, ${ controlPoint2X } ${ endY }, ${ endX } ${ endY }`;
}

export function buildRenderedModuleElementMap(screenElement: HTMLElement): Map<string, HTMLElement> {
  return new Map(
    Array.from(screenElement.querySelectorAll<HTMLElement>('[data-rack-module-key]'))
      .map(element => [element.dataset['rackModuleKey'], element] as const)
      .filter((entry): entry is [string, HTMLElement] => !!entry[0])
  );
}

export function resolveSignalHoverCardPlacement(
  candidateElement: HTMLElement | null,
  rackViewportElement: HTMLElement | null,
  signalHoverCardWidthPx: number,
  signalHoverCardGapPx: number
): SignalHoverCardPlacement {
  const viewportRect = rackViewportElement?.getBoundingClientRect();

  if (!(candidateElement instanceof HTMLElement) || !viewportRect) {
    return 'right';
  }

  const moduleRect = candidateElement.getBoundingClientRect();
  const availableRight = viewportRect.right - moduleRect.right;
  const availableLeft = moduleRect.left - viewportRect.left;
  const requiredWidth = signalHoverCardWidthPx + signalHoverCardGapPx;

  if (availableRight < requiredWidth && availableLeft > availableRight) {
    return 'left';
  }

  if (availableLeft >= requiredWidth && availableLeft > availableRight) {
    return 'left';
  }

  return 'right';
}

export function buildSignalOverlayFrame(
  screenRect: DOMRect,
  hostRect: DOMRect
): SignalOverlayFrame {
  return {
    left: screenRect.left - hostRect.left,
    top: screenRect.top - hostRect.top,
    width: screenRect.width,
    height: screenRect.height,
  };
}

export function withAlpha(hexColor: string, alpha: number): string {
  const normalizedHex = hexColor.replace('#', '');
  const expandedHex = normalizedHex.length === 3
    ? normalizedHex.split('').map(char => `${ char }${ char }`).join('')
    : normalizedHex;
  const red = Number.parseInt(expandedHex.slice(0, 2), 16);
  const green = Number.parseInt(expandedHex.slice(2, 4), 16);
  const blue = Number.parseInt(expandedHex.slice(4, 6), 16);

  return `rgba(${ red }, ${ green }, ${ blue }, ${ alpha })`;
}

export function resolveRowPowerPanelPlacement(
  rackViewportElement: HTMLElement | null,
  rowElement: HTMLElement | null,
  rowAnalysisPanelHeightPx: number
): 'above' | 'below' {
  const viewportRect = rackViewportElement?.getBoundingClientRect();
  const rowRect = rowElement?.getBoundingClientRect();

  if (!viewportRect || !rowRect) {
    return 'above';
  }

  const availableAbove = rowRect.top - viewportRect.top;
  const availableBelow = viewportRect.bottom - rowRect.bottom;

  if (availableAbove < rowAnalysisPanelHeightPx && availableBelow > availableAbove) {
    return 'below';
  }

  if (availableBelow < rowAnalysisPanelHeightPx && availableAbove > availableBelow) {
    return 'above';
  }

  return availableAbove >= availableBelow ? 'above' : 'below';
}
