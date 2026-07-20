import {
  asSortModeId,
  asGroupModeId,
  filterEditorCardsByQuery,
  resolvePatchEditorSortStrategy,
  resolveRackInlinePanelSide,
  defaultSortModeId,
  defaultGroupModeId
} from './patch-editor.utils';

const makeCard = (name: string, mfr = 'MFR', connectionCount = 0, instanceCount = 0): any => ({
  module: { name, manufacturer: { name: mfr } },
  connectionCount,
  instanceCount,
  trackingId: 0
});

describe('patch-editor.utils', () => {
  describe('asSortModeId', () => {
    it('returns valid sort mode id', () => {
      expect(asSortModeId({ id: 'nameAsc' })).toBe('nameAsc');
    });
    it('returns default for unknown value', () => {
      expect(asSortModeId({ id: 'unknown' })).toBe(defaultSortModeId);
    });
    it('returns default for undefined', () => {
      expect(asSortModeId(undefined)).toBe(defaultSortModeId);
    });
  });

  describe('asGroupModeId', () => {
    it('returns valid group mode id', () => {
      expect(asGroupModeId({ id: 'manufacturer' })).toBe('manufacturer');
    });
    it('returns default for unknown', () => {
      expect(asGroupModeId({ id: 'something' })).toBe(defaultGroupModeId);
    });
    it('accepts all valid ids', () => {
      for (const id of ['none', 'manufacturer', 'connectionState', 'patchPresence']) {
        expect(asGroupModeId({ id })).toBe(id as any);
      }
    });
  });

  describe('filterEditorCardsByQuery', () => {
    const cards = [makeCard('Moog Filter'), makeCard('Make Noise Wogglebug', 'Make Noise')];

    it('returns all cards for empty query', () => {
      expect(filterEditorCardsByQuery(cards, '')).toEqual(cards);
    });

    it('filters by module name', () => {
      expect(filterEditorCardsByQuery(cards, 'moog').length).toBe(1);
    });

    it('filters by manufacturer name', () => {
      expect(filterEditorCardsByQuery(cards, 'make noise').length).toBe(1);
    });

    it('returns empty when no match', () => {
      expect(filterEditorCardsByQuery(cards, 'xyz').length).toBe(0);
    });
  });

  describe('resolvePatchEditorSortStrategy', () => {
    it('returns a strategy for nameAsc', () => {
      expect(resolvePatchEditorSortStrategy('nameAsc')).toBeTruthy();
    });
    it('returns a strategy for all known modes', () => {
      const modes = ['nameAsc', 'nameDesc', 'addedLatest', 'addedEarliest', 'manufacturerAsc', 'manufacturerDesc', 'connectionsMost'];
      for (const mode of modes) {
        expect(resolvePatchEditorSortStrategy(mode as any)).toBeTruthy();
      }
    });
  });

  describe('resolveRackInlinePanelSide', () => {
    it('returns right when enough space on right', () => {
      const rect = { left: 0, right: 100 };
      expect(resolveRackInlinePanelSide(rect, 800)).toBe('right');
    });

    it('returns left when tight space on right', () => {
      const rect = { left: 600, right: 780 };
      expect(resolveRackInlinePanelSide(rect, 800, 0, 200)).toBe('left');
    });
  });
});
