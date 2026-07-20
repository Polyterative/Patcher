import {
  computePatchGraphSizeConstant,
  moduleInstanceKey,
  extractPatchGraphModuleInstances,
  buildModuleNodeId,
  buildCvNodeId
} from './patch-graph-build.utils';
import { PatchConnection } from 'src/app/models/connection';
import {
  cvWithModuleFixture,
  patchFixture
} from './patch-graph-test-fixtures';

const makeConn = (aModId: number, aInstId: number | undefined, bModId: number, bInstId: number | undefined): PatchConnection => ({
  a: cvWithModuleFixture(aModId * 10, aModId),
  b: cvWithModuleFixture(bModId * 10, bModId),
  patch: patchFixture(),
  instance_id_a: aInstId,
  instance_id_b: bInstId
});

describe('patch-graph-build.utils', () => {
  describe('computePatchGraphSizeConstant', () => {
    it('returns base size when zero modules', () => {
      expect(computePatchGraphSizeConstant(0, 5)).toBe(5);
    });

    it('returns base size when zero connections', () => {
      expect(computePatchGraphSizeConstant(5, 0)).toBe(5);
    });

    it('clamps to max 6', () => {
      expect(computePatchGraphSizeConstant(1, 100)).toBeLessThanOrEqual(6);
    });

    it('clamps to min 1.5', () => {
      expect(computePatchGraphSizeConstant(100, 1)).toBeGreaterThanOrEqual(1.5);
    });
  });

  describe('moduleInstanceKey', () => {
    it('builds key with instance id', () => {
      expect(moduleInstanceKey(5, 3)).toBe('5_3');
    });

    it('uses none for undefined instance', () => {
      expect(moduleInstanceKey(5, undefined)).toBe('5_none');
    });
  });

  describe('extractPatchGraphModuleInstances', () => {
    it('returns empty for empty connections', () => {
      expect(extractPatchGraphModuleInstances([])).toEqual([]);
    });

    it('extracts unique module instances', () => {
      const conns = [makeConn(1, 10, 2, 20), makeConn(1, 10, 3, 30)];
      const result = extractPatchGraphModuleInstances(conns);
      expect(result.length).toBe(3); // (1,10), (2,20), (3,30)
    });

    it('deduplicates same module+instance pair', () => {
      const conns = [makeConn(1, 10, 2, 20), makeConn(2, 20, 1, 10)];
      const result = extractPatchGraphModuleInstances(conns);
      expect(result.length).toBe(2);
    });
  });

  describe('buildModuleNodeId', () => {
    it('returns plain module id for undefined instance', () => {
      expect(buildModuleNodeId(7, undefined)).toBe('7');
    });

    it('includes instance id when provided', () => {
      expect(buildModuleNodeId(7, 3)).toBe('7_3');
    });
  });

  describe('buildCvNodeId', () => {
    it('builds cv node id with instance', () => {
      expect(buildCvNodeId(7, 3, 99)).toBe('7_399');
    });

    it('builds cv node id without instance', () => {
      expect(buildCvNodeId(7, undefined, 99)).toBe('799');
    });
  });

  describe('computePatchGraphSizeConstant extra', () => {
    it('scales down as module and connection count grow together', () => {
      const small = computePatchGraphSizeConstant(2, 2);
      const large = computePatchGraphSizeConstant(20, 20);
      expect(small).toBeGreaterThanOrEqual(large);
    });
  });

  describe('extractPatchGraphModuleInstances extra', () => {
    it('returns one instance per unique module+instance combination', () => {
      const conns = [
        makeConn(1, undefined, 2, undefined),
        makeConn(1, undefined, 3, undefined)
      ];
      const result = extractPatchGraphModuleInstances(conns);
      const keys = result.map(i => moduleInstanceKey(i.moduleId, i.instanceId));
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});
