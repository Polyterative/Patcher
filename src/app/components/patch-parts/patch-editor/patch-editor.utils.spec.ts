import {
  asSortModeId,
  asGroupModeId,
  filterEditorCardsByQuery,
  resolvePatchEditorSortStrategy,
  countOrphanedConnections,
  buildDivergenceTooltip,
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

  describe('countOrphanedConnections', () => {
    it('returns 0 for empty connections', () => {
      expect(countOrphanedConnections(new Map(), [], [])).toBe(0);
    });

    it('counts connections involving orphaned instances', () => {
      const instanceMap = new Map([[1, 10]]);
      const instances = [{ id: 10 }, { id: 20 }] as any[];
      const connections = [
        { instance_id_a: 20, instance_id_b: 10 },
        { instance_id_a: 10, instance_id_b: 10 }
      ] as any[];
      expect(countOrphanedConnections(instanceMap, instances, connections)).toBe(1);
    });
  });

  describe('buildDivergenceTooltip', () => {
    it('includes orphaned module info', () => {
      const divergence = {
        orphanedModules: [{ moduleName: 'VCO', patchInstances: 2 }],
        excessInstances: []
      } as any;
      const result = buildDivergenceTooltip(divergence, 0);
      expect(result).toContain('VCO');
      expect(result).toContain('2 instances');
    });

    it('includes orphaned connection count when > 0', () => {
      const divergence = { orphanedModules: [], excessInstances: [] } as any;
      const result = buildDivergenceTooltip(divergence, 3);
      expect(result).toContain('3 connections');
    });

    it('ends with collection-mode note', () => {
      const divergence = { orphanedModules: [], excessInstances: [] } as any;
      expect(buildDivergenceTooltip(divergence, 0)).toContain('collection mode');
    });
  });
});
