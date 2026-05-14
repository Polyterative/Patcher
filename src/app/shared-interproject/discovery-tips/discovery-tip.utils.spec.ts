import { isSnoozed, normalizeTipState } from './discovery-tip.utils';
import { DiscoveryTipDefinition, DiscoveryTipStateRecord } from './discovery-tip.models';

describe('discovery-tip.utils', () => {
  describe('isSnoozed', () => {
    it('returns false for undefined', () => {
      expect(isSnoozed(undefined)).toBeFalse();
    });

    it('returns false for past date', () => {
      expect(isSnoozed('2000-01-01T00:00:00Z')).toBeFalse();
    });

    it('returns true for future date', () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      expect(isSnoozed(future)).toBeTrue();
    });
  });

  describe('normalizeTipState', () => {
    const def: DiscoveryTipDefinition = { id: 'tip1', version: 2 } as any;

    it('returns fresh state when no state provided', () => {
      const result = normalizeTipState(def, undefined);
      expect(result.version).toBe(2);
      expect(result.shownCount).toBe(0);
    });

    it('returns fresh state when version mismatch', () => {
      const staleState: DiscoveryTipStateRecord = { version: 1, shownCount: 5 };
      const result = normalizeTipState(def, staleState);
      expect(result.version).toBe(2);
      expect(result.shownCount).toBe(0);
    });

    it('returns existing state when version matches', () => {
      const currentState: DiscoveryTipStateRecord = { version: 2, shownCount: 3 };
      const result = normalizeTipState(def, currentState);
      expect(result).toBe(currentState);
    });
  });
});
