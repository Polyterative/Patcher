import { RackedModule } from 'src/app/models/module';
import {
  ModuleLayoutAnimationCancel,
  ModuleLayoutMoveRect,
  ModuleRenderRect,
  SignalHoverCardPlacement,
  SignalOverlayFrame
} from './rack-visual-model.types';

export const RACK_MODULE_TRACK_KEY_DATASET_KEY = 'rackModuleTrackKey';

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

export function buildRenderedModuleTrackElementMap(screenElement: HTMLElement): Map<string, HTMLElement> {
  return new Map(
    Array.from(screenElement.querySelectorAll<HTMLElement>('[data-rack-module-track-key]'))
      .map(element => [element.dataset[RACK_MODULE_TRACK_KEY_DATASET_KEY], element] as const)
      .filter((entry): entry is [string, HTMLElement] => !!entry[0])
  );
}

export function findMovedRackModuleKeys(
  previousRows: RackedModule[][] | null | undefined,
  nextRows: RackedModule[][] | null | undefined,
  keyForModule: (module: RackedModule) => string
): Set<string> {
  const previousPositions = indexRackModulePositions(previousRows, keyForModule);
  const movedKeys = new Set<string>();

  (nextRows ?? []).forEach((row, rowIndex) => {
    row.forEach((module, columnIndex) => {
      const key = keyForModule(module);
      const previous = previousPositions.get(key);
      if (!previous) {
        return;
      }

      if (previous.rowIndex !== rowIndex || previous.columnIndex !== columnIndex) {
        movedKeys.add(key);
      }
    });
  });

  return movedKeys;
}

export function captureModuleLayoutMoveRects(
  screenElement: HTMLElement,
  movedKeys: Set<string>
): Map<string, ModuleLayoutMoveRect> {
  const elements = buildRenderedModuleTrackElementMap(screenElement);
  const snapshots = new Map<string, ModuleLayoutMoveRect>();

  movedKeys.forEach(key => {
    const element = elements.get(key);
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    snapshots.set(key, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });
  });

  return snapshots;
}

export function playModuleLayoutMoveAnimations(
  screenElement: HTMLElement,
  snapshots: Map<string, ModuleLayoutMoveRect>,
  durationMs: number,
  viewportToLocalScale: number,
  onComplete: () => void
): ModuleLayoutAnimationCancel {
  const animations: Animation[] = [];
  const activeElements = new Set<HTMLElement>();
  const scale = viewportToLocalScale > 0 ? viewportToLocalScale : 1;
  let completeCount = 0;
  let frameId: number | null = window.requestAnimationFrame(() => {
    const elements = buildRenderedModuleTrackElementMap(screenElement);
    snapshots.forEach((snapshot, key) => {
      const element = elements.get(key);
      if (!element?.animate) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const deltaX = (snapshot.left - rect.left) / scale;
      const deltaY = (snapshot.top - rect.top) / scale;
      const scaleX = rect.width > 0 ? snapshot.width / rect.width : 1;
      const scaleY = rect.height > 0 ? snapshot.height / rect.height : 1;
      const hasMeaningfulScaleChange = Math.abs(scaleX - 1) >= 0.01 || Math.abs(scaleY - 1) >= 0.01;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5 && !hasMeaningfulScaleChange) {
        return;
      }

      activeElements.add(element);
      element.classList.add('module--layoutRemixMoving');
      const distance = Math.hypot(deltaX, deltaY);
      const moveDurationMs = Math.min(980, Math.max(durationMs, durationMs + (distance * 0.45)));
      const animation = element.animate([
        {transform: `translate3d(${ deltaX }px, ${ deltaY }px, 0) scale(${ scaleX }, ${ scaleY })`, transformOrigin: 'top left'},
        {transform: 'translate3d(0, 0, 0) scale(1, 1)', transformOrigin: 'top left'}
      ], {
        duration: moveDurationMs,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        fill: 'both'
      });
      animations.push(animation);
      animation.addEventListener('finish', () => {
        element.classList.remove('module--layoutRemixMoving');
        completeCount += 1;
        if (completeCount === animations.length) {
          onComplete();
        }
      }, {once: true});
    });

    frameId = null;
    if (animations.length === 0) {
      onComplete();
    }
  });

  return () => {
    if (frameId != null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    animations.forEach(animation => animation.cancel());
    activeElements.forEach(element => element.classList.remove('module--layoutRemixMoving'));
  };
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
  hostRect: DOMRect,
  scale = 1
): SignalOverlayFrame {
  const safeScale = scale > 0 ? scale : 1;
  return {
    left: (screenRect.left - hostRect.left) / safeScale,
    top: (screenRect.top - hostRect.top) / safeScale,
    width: screenRect.width / safeScale,
    height: screenRect.height / safeScale,
    viewBoxWidth: screenRect.width,
    viewBoxHeight: screenRect.height,
  };
}

function indexRackModulePositions(
  rows: RackedModule[][] | null | undefined,
  keyForModule: (module: RackedModule) => string
): Map<string, {rowIndex: number; columnIndex: number}> {
  const positions = new Map<string, {rowIndex: number; columnIndex: number}>();
  (rows ?? []).forEach((row, rowIndex) => {
    row.forEach((module, columnIndex) => {
      positions.set(keyForModule(module), {rowIndex, columnIndex});
    });
  });
  return positions;
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
