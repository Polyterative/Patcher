import {
  DEFAULT_TIP_SPACING_MS,
  DISCOVERY_TIP_GLOBAL_PAUSE_ID
} from './discovery-tip.constants';
import {
  DiscoveryTipContextSnapshot,
  DiscoveryTipDefinition,
  DiscoveryTipViewerState
} from './discovery-tip.models';
import {
  canShowTipOnCurrentRoute,
  normalizeTipState
} from './discovery-tip.utils';

export interface DiscoveryTipSelectionContext {
  definitions: DiscoveryTipDefinition[];
  snapshot: DiscoveryTipContextSnapshot;
  anchorIds: ReadonlySet<string>;
  viewerState: DiscoveryTipViewerState;
  nowMs: number;
}

export function findAutomaticDiscoveryTipCandidate(
  context: DiscoveryTipSelectionContext
): DiscoveryTipDefinition | null {
  const sortedTips = [...context.definitions].sort((left, right) => left.priority - right.priority);
  return sortedTips.find((tip) => isAutomaticTipEligible(tip, context)) ?? null;
}

export function shouldKeepAutomaticDiscoveryTip(
  definition: DiscoveryTipDefinition,
  context: DiscoveryTipSelectionContext
): boolean {
  if (!canShowTipOnCurrentRoute(definition, context.snapshot)) {
    return false;
  }

  if (!context.anchorIds.has(definition.anchorId)) {
    return false;
  }

  const currentState = normalizeTipState(definition, context.viewerState.tips[definition.id]);
  if (currentState.learnedAt) {
    return false;
  }

  if (isSnoozedAt(currentState.snoozedUntil, context.nowMs)) {
    return false;
  }

  return definition.isEligible(context.snapshot);
}

export function shouldKeepGuidedDiscoveryTip(
  definition: DiscoveryTipDefinition,
  context: DiscoveryTipSelectionContext
): boolean {
  return canShowTipOnCurrentRoute(definition, context.snapshot)
    && context.anchorIds.has(definition.anchorId);
}

export function discoveryTipsMatchingAction(
  definitions: DiscoveryTipDefinition[],
  actionKey: string
): DiscoveryTipDefinition[] {
  return definitions.filter((tip) => tip.completionActions?.includes(actionKey));
}

export function isWithinAutomaticDiscoveryTipSpacing(
  definition: DiscoveryTipDefinition,
  viewerState: DiscoveryTipViewerState,
  nowMs: number
): boolean {
  const lastTipShownAt = viewerState.lastTipShownAt;
  if (!lastTipShownAt) {
    return false;
  }

  const lastTipShownTime = new Date(lastTipShownAt).getTime();
  if (Number.isNaN(lastTipShownTime)) {
    return false;
  }

  const minSpacingMs = definition.minSpacingMs ?? DEFAULT_TIP_SPACING_MS;
  return nowMs - lastTipShownTime < minSpacingMs;
}

function isAutomaticTipEligible(
  definition: DiscoveryTipDefinition,
  context: DiscoveryTipSelectionContext
): boolean {
  const globalPauseState = context.viewerState.tips[DISCOVERY_TIP_GLOBAL_PAUSE_ID];
  if (isSnoozedAt(globalPauseState?.snoozedUntil, context.nowMs)) {
    return false;
  }

  if (isWithinAutomaticDiscoveryTipSpacing(definition, context.viewerState, context.nowMs)) {
    return false;
  }

  if (!canShowTipOnCurrentRoute(definition, context.snapshot)) {
    return false;
  }

  if (!context.anchorIds.has(definition.anchorId)) {
    return false;
  }

  const currentState = normalizeTipState(definition, context.viewerState.tips[definition.id]);
  if (currentState.learnedAt) {
    return false;
  }

  if (isSnoozedAt(currentState.snoozedUntil, context.nowMs)) {
    return false;
  }

  const maxShowCount = definition.maxShowCount ?? 1;
  if (currentState.shownCount >= maxShowCount) {
    return false;
  }

  return definition.isEligible(context.snapshot);
}

function isSnoozedAt(snoozedUntil: string | undefined, nowMs: number): boolean {
  return !!snoozedUntil && new Date(snoozedUntil).getTime() > nowMs;
}
