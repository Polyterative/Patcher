import {
  DiscoveryTipDefinition,
  DiscoveryTipStateRecord
} from './discovery-tip.models';


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
