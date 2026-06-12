import {
  DiscoveryTipActive,
  DiscoveryTipContextSnapshot,
  DiscoveryTipDefinition,
  DiscoveryTipStateRecord,
  DiscoveryTipStorageShape
} from './discovery-tip.models';
import {
  DEFAULT_STORAGE_SHAPE,
  DISCOVERY_TIP_STORAGE_KEY
} from './discovery-tip.constants';


export function isSnoozed(snoozedUntil: string | undefined): boolean {
  return !!snoozedUntil && new Date(snoozedUntil).getTime() > Date.now();
}

export function normalizeTipState(
  definition: DiscoveryTipDefinition,
  state?: DiscoveryTipStateRecord
): DiscoveryTipStateRecord {
  if (!state || state.version !== definition.version) {
    return {
      version: definition.version,
      shownCount: 0
    };
  }
  return state;
}

export function canShowTipOnCurrentRoute(
  definition: DiscoveryTipDefinition,
  snapshot: DiscoveryTipContextSnapshot
): boolean {
  if (definition.audience === 'signed-in' && !snapshot.isLoggedIn) {
    return false;
  }

  return definition.routePrefixes.some((routePrefix) => snapshot.currentRoute.startsWith(routePrefix));
}

export function guidedDiscoveryTips(definitions: DiscoveryTipDefinition[]): DiscoveryTipDefinition[] {
  return definitions
    .filter((tip) => tip.guidedTourOrder !== undefined)
    .sort((left, right) => (left.guidedTourOrder ?? 0) - (right.guidedTourOrder ?? 0));
}

export function buildDiscoveryTipActive(
  definition: DiscoveryTipDefinition,
  anchorElement: HTMLElement,
  snapshot: DiscoveryTipContextSnapshot,
  guidedStepIndex?: number,
  guidedStepTotal?: number
): DiscoveryTipActive {
  return {
    definition,
    anchorElement,
    reason: resolveTipReason(definition, snapshot),
    guidedStepIndex,
    guidedStepTotal
  };
}

export function readDiscoveryTipStorage(isBrowser: boolean): DiscoveryTipStorageShape {
  if (!isBrowser) {
    return DEFAULT_STORAGE_SHAPE;
  }

  try {
    const rawValue = window.localStorage.getItem(DISCOVERY_TIP_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_STORAGE_SHAPE;
    }
    const parsed = JSON.parse(rawValue) as DiscoveryTipStorageShape;
    return parsed?.viewers ? parsed : DEFAULT_STORAGE_SHAPE;
  } catch {
    return DEFAULT_STORAGE_SHAPE;
  }
}

export function writeDiscoveryTipStorage(
  isBrowser: boolean,
  storage: DiscoveryTipStorageShape
): void {
  if (!isBrowser) {
    return;
  }
  window.localStorage.setItem(DISCOVERY_TIP_STORAGE_KEY, JSON.stringify(storage));
}

function resolveTipReason(
  definition: DiscoveryTipDefinition,
  snapshot: DiscoveryTipContextSnapshot
): string | undefined {
  if (!definition.reason) {
    return undefined;
  }

  return typeof definition.reason === 'function'
    ? definition.reason(snapshot)
    : definition.reason;
}
