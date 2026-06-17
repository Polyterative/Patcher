import {
  DiscoveryTipActive,
  DiscoveryTipContextSnapshot,
  DiscoveryTipDefinition,
  DiscoveryTipStateRecord,
  DiscoveryTipStorageShape,
  DiscoveryTipViewerState,
  LegacyDiscoveryTipStorageShape
} from './discovery-tip.models';
import {
  DEFAULT_STORAGE_SHAPE,
  DISCOVERY_TIP_NEW_VIEWER_BASELINE_AT,
  DISCOVERY_TIP_STORAGE_KEY,
  LEGACY_DISCOVERY_TIP_STORAGE_KEY
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
  guidedStepIndex?: number,
  guidedStepTotal?: number
): DiscoveryTipActive {
  return {
    definition,
    anchorElement,
    guidedStepIndex,
    guidedStepTotal
  };
}

export function emptyDiscoveryTipStorage(): DiscoveryTipStorageShape {
  return {
    schemaVersion: DEFAULT_STORAGE_SHAPE.schemaVersion,
    viewers: {}
  };
}

export function readDiscoveryTipStorage(isBrowser: boolean): DiscoveryTipStorageShape {
  if (!isBrowser) {
    return emptyDiscoveryTipStorage();
  }

  const currentStorage = readCurrentDiscoveryTipStorage();
  if (currentStorage) {
    return currentStorage;
  }

  const legacyStorage = readLegacyDiscoveryTipStorage();
  return legacyStorage ? migrateLegacyDiscoveryTipStorage(legacyStorage) : emptyDiscoveryTipStorage();
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

export function initializeDiscoveryTipViewerState(
  definitions: DiscoveryTipDefinition[],
  onboardingAt = DISCOVERY_TIP_NEW_VIEWER_BASELINE_AT,
  tips: Record<string, DiscoveryTipStateRecord> = {}
): DiscoveryTipViewerState {
  return grandfatherDiscoveryTips({onboardingAt, tips}, definitions).viewerState;
}

export function ensureDiscoveryTipViewerState(
  storage: DiscoveryTipStorageShape,
  viewerKey: string,
  definitions: DiscoveryTipDefinition[],
  onboardingAt = DISCOVERY_TIP_NEW_VIEWER_BASELINE_AT
): {storage: DiscoveryTipStorageShape; viewerState: DiscoveryTipViewerState; changed: boolean} {
  const existingViewerState = storage.viewers[viewerKey];
  if (!existingViewerState) {
    const viewerState = initializeDiscoveryTipViewerState(definitions, onboardingAt);
    return {
      storage: {
        ...storage,
        viewers: {
          ...storage.viewers,
          [viewerKey]: viewerState
        }
      },
      viewerState,
      changed: true
    };
  }

  const grandfathered = grandfatherDiscoveryTips(existingViewerState, definitions);
  if (!grandfathered.changed) {
    return {storage, viewerState: existingViewerState, changed: false};
  }

  return {
    storage: {
      ...storage,
      viewers: {
        ...storage.viewers,
        [viewerKey]: grandfathered.viewerState
      }
    },
    viewerState: grandfathered.viewerState,
    changed: true
  };
}

export function grandfatherDiscoveryTips(
  viewerState: DiscoveryTipViewerState,
  definitions: DiscoveryTipDefinition[]
): {viewerState: DiscoveryTipViewerState; changed: boolean} {
  const onboardingTime = new Date(viewerState.onboardingAt).getTime();
  if (Number.isNaN(onboardingTime)) {
    return {viewerState, changed: false};
  }

  let changed = false;
  const nextTips = {...viewerState.tips};
  definitions.forEach((definition) => {
    const introducedTime = new Date(definition.introducedAt).getTime();
    if (Number.isNaN(introducedTime) || introducedTime > onboardingTime) {
      return;
    }

    const currentTipState = nextTips[definition.id];
    if (currentTipState?.learnedAt && currentTipState.version === definition.version) {
      return;
    }

    nextTips[definition.id] = {
      ...currentTipState,
      version: definition.version,
      shownCount: currentTipState?.shownCount ?? 0,
      learnedAt: currentTipState?.learnedAt ?? viewerState.onboardingAt
    };
    changed = true;
  });

  if (!changed) {
    return {viewerState, changed: false};
  }

  return {
    viewerState: {
      ...viewerState,
      tips: nextTips
    },
    changed: true
  };
}

function readCurrentDiscoveryTipStorage(): DiscoveryTipStorageShape | null {
  try {
    const rawValue = window.localStorage.getItem(DISCOVERY_TIP_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<DiscoveryTipStorageShape> | null;
    return parsed?.schemaVersion === 2 && parsed.viewers ? parsed as DiscoveryTipStorageShape : null;
  } catch {
    return null;
  }
}

function readLegacyDiscoveryTipStorage(): LegacyDiscoveryTipStorageShape | null {
  try {
    const rawValue = window.localStorage.getItem(LEGACY_DISCOVERY_TIP_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<LegacyDiscoveryTipStorageShape> | null;
    return parsed?.viewers ? parsed as LegacyDiscoveryTipStorageShape : null;
  } catch {
    return null;
  }
}

function migrateLegacyDiscoveryTipStorage(legacyStorage: LegacyDiscoveryTipStorageShape): DiscoveryTipStorageShape {
  const onboardingAt = new Date().toISOString();
  return {
    schemaVersion: 2,
    viewers: Object.entries(legacyStorage.viewers).reduce<Record<string, DiscoveryTipViewerState>>(
      (viewers, [viewerKey, tips]) => ({
        ...viewers,
        [viewerKey]: {
          onboardingAt,
          tips: {...tips}
        }
      }),
      {}
    )
  };
}
