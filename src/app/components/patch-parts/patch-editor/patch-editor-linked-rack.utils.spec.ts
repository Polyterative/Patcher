import {
  buildDivergenceTooltip,
  buildLinkedRackPreviewRows,
  countOrphanedConnections
} from './patch-editor-linked-rack.utils';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import {
  DbModule,
  RackedModule
} from 'src/app/models/module';
import { LinkedRackDivergence } from './patch-editor.types';

const makeModule = (id: number, name = `Module ${id}`): DbModule => ({
  id,
  name,
  description: '',
  hp: 8,
  public: true,
  manufacturer: { id: 1, name: 'Make Noise' },
  manufacturerId: 1,
  standard: { id: 1, name: 'Eurorack' },
  tags: [],
  panels: [],
  created: '',
  updated: '',
  ins: [],
  outs: [],
  switches: [],
  manualURL: '',
  store_url: null,
  additional: null,
  isComplete: true,
  isApproved: true,
  isDIY: false,
  powerPos12: null,
  powerNeg12: null,
  powerPos5: null,
  depth: 0,
  weight: 0
});

const makeRackedModule = (id: number, row: number | null, column = 0, orientation?: unknown): RackedModule => ({
  rackingData: {
    id,
    rackid: 1,
    moduleid: id,
    row,
    column,
    selectedPanelId: null,
    orientation: orientation as RackedModule['rackingData']['orientation']
  },
  module: makeModule(id)
});

const makePatchConnection = (instance_id_a: number, instance_id_b: number): PatchConnection => ({
  patch: {
    id: 1
  },
  a: {
    id: 1,
    name: 'Out',
    module: makeModule(1),
    instance_id: instance_id_a
  },
  b: {
    id: 2,
    name: 'In',
    module: makeModule(2),
    instance_id: instance_id_b
  },
  instance_id_a,
  instance_id_b
});

describe('patch-editor-linked-rack.utils', () => {
  describe('countOrphanedConnections', () => {
    it('returns 0 for empty connections', () => {
      expect(countOrphanedConnections(new Map(), [], [])).toBe(0);
    });

    it('counts connections involving orphaned instances', () => {
      const instanceMap = new Map([[1, 10]]);
      const instances: PatchModuleInstance[] = [
        { id: 10, patch_id: 1, module_id: 1, instance_label: null },
        { id: 20, patch_id: 1, module_id: 2, instance_label: null }
      ];
      const connections = [
        makePatchConnection(20, 10),
        makePatchConnection(10, 10)
      ];
      expect(countOrphanedConnections(instanceMap, instances, connections)).toBe(1);
    });
  });

  describe('buildDivergenceTooltip', () => {
    it('includes orphaned module info', () => {
      const divergence: LinkedRackDivergence = {
        orphanedModules: [{ moduleId: 1, moduleName: 'VCO', rackPositions: 0, patchInstances: 2 }],
        excessInstances: [],
        totalOrphanedInstances: 2,
        clean: false
      };
      const result = buildDivergenceTooltip(divergence, 0);
      expect(result).toContain('VCO');
      expect(result).toContain('2 instances');
    });

    it('includes orphaned connection count when > 0', () => {
      const divergence: LinkedRackDivergence = {
        orphanedModules: [],
        excessInstances: [],
        totalOrphanedInstances: 0,
        clean: true
      };
      const result = buildDivergenceTooltip(divergence, 3);
      expect(result).toContain('3 connections');
    });

    it('ends with collection-mode note', () => {
      const divergence: LinkedRackDivergence = {
        orphanedModules: [],
        excessInstances: [],
        totalOrphanedInstances: 0,
        clean: true
      };
      expect(buildDivergenceTooltip(divergence, 0)).toContain('collection mode');
    });
  });

  describe('buildLinkedRackPreviewRows', () => {
    it('excludes modules with null row from the preview', () => {
      const modules = [
        makeRackedModule(1, 0, 0),
        makeRackedModule(2, 0, 1),
        makeRackedModule(3, null, 0) // floating module — not placed in any row
      ];
      const rows = buildLinkedRackPreviewRows(modules);
      expect(rows.length).toBe(1);
      expect(rows[0].modules.length).toBe(2);
      expect(rows[0].modules.find(m => m.module.id === 3)).toBeUndefined();
    });

    it('excludes modules with undefined row from the preview', () => {
      const modules = [
        makeRackedModule(1, 0, 0),
        {
          rackingData: { id: 9, rackid: 1, moduleid: 9, row: undefined, column: 0 },
          module: makeModule(9, 'Floating')
        } as RackedModule
      ];
      const rows = buildLinkedRackPreviewRows(modules);
      expect(rows.length).toBe(1);
      expect(rows[0].modules.length).toBe(1);
    });

    it('returns empty array when all modules have null row', () => {
      const modules = [makeRackedModule(1, null), makeRackedModule(2, null)];
      expect(buildLinkedRackPreviewRows(modules)).toEqual([]);
    });

    it('carries persisted rack module orientation into preview cards', () => {
      const rows = buildLinkedRackPreviewRows([
        makeRackedModule(1, 0, 0, 'rot180'),
        makeRackedModule(2, 0, 1, 'unexpected')
      ]);

      expect(rows[0].modules[0].orientation).toBe('rot180');
      expect(rows[0].modules[1].orientation).toBe('normal');
    });
  });
});
