import {
  DISCOVERY_TIP_STORAGE_KEY,
  LEGACY_DISCOVERY_TIP_STORAGE_KEY
} from './discovery-tip.constants';
import { DiscoveryTipDefinition, DiscoveryTipStateRecord } from './discovery-tip.models';
import {
  ensureDiscoveryTipViewerState,
  initializeDiscoveryTipViewerState,
  isSnoozed,
  normalizeTipState,
  readDiscoveryTipStorage,
  writeDiscoveryTipStorage
} from './discovery-tip.utils';


describe('discovery-tip.utils', () => {
  const def: DiscoveryTipDefinition = {
    id: 'tip1',
    version: 2,
    introducedAt: '2026-06-17T00:00:00.000Z',
    anchorId: 'tip-anchor',
    title: 'Tip title',
    body: 'Tip body',
    routePrefixes: ['/'],
    priority: 1,
    audience: 'all',
    isEligible: () => true
  };

  describe('isSnoozed', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-06-17T15:00:00.000Z'));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

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

    it('returns false for "now" (edge: snoozedUntil is current timestamp)', () => {
      const justNow = new Date(Date.now() - 1).toISOString();
      expect(isSnoozed(justNow)).toBeFalse();
    });
  });

  describe('normalizeTipState', () => {
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

    it('returns fresh state when shownCount is non-zero but version mismatches', () => {
      const oldState: DiscoveryTipStateRecord = { version: 0, shownCount: 10 };
      const result = normalizeTipState(def, oldState);
      expect(result.shownCount).toBe(0);
      expect(result.version).toBe(2);
    });
  });

  describe('storage migration and viewer initialization', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-06-17T15:00:00.000Z'));
      localStorage.clear();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      localStorage.clear();
    });

    it('reads v2 storage before legacy storage', () => {
      localStorage.setItem(DISCOVERY_TIP_STORAGE_KEY, JSON.stringify({
        schemaVersion: 2,
        viewers: {
          current: {
            onboardingAt: '1970-01-01T00:00:00.000Z',
            tips: {}
          }
        }
      }));
      localStorage.setItem(LEGACY_DISCOVERY_TIP_STORAGE_KEY, JSON.stringify({
        viewers: {
          legacy: {
            tip1: {version: 1, shownCount: 1}
          }
        }
      }));

      const storage = readDiscoveryTipStorage(true);

      expect(storage.schemaVersion).toBe(2);
      expect(storage.viewers.current).toBeDefined();
      expect(storage.viewers.legacy).toBeUndefined();
    });

    it('migrates legacy v1 viewer records into v2 viewer state', () => {
      localStorage.setItem(LEGACY_DISCOVERY_TIP_STORAGE_KEY, JSON.stringify({
        viewers: {
          viewer1: {
            tip1: {
              version: 2,
              shownCount: 4,
              learnedAt: '2026-06-16T00:00:00.000Z',
              snoozedUntil: '2026-06-20T00:00:00.000Z'
            }
          }
        }
      }));

      const storage = readDiscoveryTipStorage(true);

      expect(storage.schemaVersion).toBe(2);
      expect(storage.viewers.viewer1.onboardingAt).toBe('2026-06-17T15:00:00.000Z');
      expect(storage.viewers.viewer1.tips.tip1.shownCount).toBe(4);
      expect(storage.viewers.viewer1.tips.tip1.learnedAt).toBe('2026-06-16T00:00:00.000Z');
      expect(storage.viewers.viewer1.tips.tip1.snoozedUntil).toBe('2026-06-20T00:00:00.000Z');
    });

    it('initializes new viewer state with an early baseline so current tips remain eligible', () => {
      const viewerState = initializeDiscoveryTipViewerState([def]);

      expect(viewerState.onboardingAt).toBe('1970-01-01T00:00:00.000Z');
      expect(viewerState.tips.tip1).toBeUndefined();
    });

    it('grandfathers tips introduced before a viewer baseline as learned', () => {
      const result = ensureDiscoveryTipViewerState({schemaVersion: 2, viewers: {}}, 'viewer1', [def], '2026-06-18T00:00:00.000Z');

      expect(result.changed).toBeTrue();
      expect(result.viewerState.tips.tip1.learnedAt).toBe('2026-06-18T00:00:00.000Z');
      expect(result.viewerState.tips.tip1.shownCount).toBe(0);
    });

    it('preserves existing shown and snoozed state while grandfathering old tips', () => {
      const result = ensureDiscoveryTipViewerState({
        schemaVersion: 2,
        viewers: {
          viewer1: {
            onboardingAt: '2026-06-18T00:00:00.000Z',
            tips: {
              tip1: {
                version: 2,
                shownCount: 3,
                snoozedUntil: '2026-06-20T00:00:00.000Z'
              }
            }
          }
        }
      }, 'viewer1', [def]);

      expect(result.changed).toBeTrue();
      expect(result.viewerState.tips.tip1.shownCount).toBe(3);
      expect(result.viewerState.tips.tip1.snoozedUntil).toBe('2026-06-20T00:00:00.000Z');
      expect(result.viewerState.tips.tip1.learnedAt).toBe('2026-06-18T00:00:00.000Z');
    });

    it('keeps learned grandfathered tips learned when their stored version is stale', () => {
      const result = ensureDiscoveryTipViewerState({
        schemaVersion: 2,
        viewers: {
          viewer1: {
            onboardingAt: '2026-06-18T00:00:00.000Z',
            tips: {
              tip1: {
                version: 1,
                shownCount: 2,
                learnedAt: '2026-06-16T00:00:00.000Z'
              }
            }
          }
        }
      }, 'viewer1', [def]);

      expect(result.changed).toBeTrue();
      expect(result.viewerState.tips.tip1.version).toBe(2);
      expect(result.viewerState.tips.tip1.shownCount).toBe(2);
      expect(result.viewerState.tips.tip1.learnedAt).toBe('2026-06-16T00:00:00.000Z');
    });

    it('writes v2 storage under the current key', () => {
      writeDiscoveryTipStorage(true, {
        schemaVersion: 2,
        viewers: {
          viewer1: {
            onboardingAt: '1970-01-01T00:00:00.000Z',
            tips: {}
          }
        }
      });

      expect(localStorage.getItem(DISCOVERY_TIP_STORAGE_KEY)).toContain('viewer1');
      expect(localStorage.getItem(LEGACY_DISCOVERY_TIP_STORAGE_KEY)).toBeNull();
    });
  });
});
