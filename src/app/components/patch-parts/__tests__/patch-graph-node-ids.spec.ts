/**
 * Unit tests for patch-graph node-ID uniqueness with duplicate module instances.
 * Tests the logic that was previously a blocker (see CURRENT_FEATURE.md):
 *   "Two instances of the same module collapse to identical node IDs."
 *
 * These tests exercise the node-ID construction rules without spinning up Angular.
 */

import { PatchConnection } from 'src/app/models/connection';
import { CVwithModule } from 'src/app/models/cv';
import { Patch } from 'src/app/models/patch';


// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCV(id: number, moduleId: number, moduleName = `Module ${ moduleId }`): CVwithModule {
  return {id, name: `CV ${ id }`, module: {id: moduleId, name: moduleName} as any};
}

function makeConnection(
  outCvId: number, outModuleId: number, outInstanceId: number | undefined,
  inCvId: number, inModuleId: number, inInstanceId: number | undefined,
  patchId = 1
): PatchConnection {
  return {
    a: makeCV(outCvId, outModuleId),
    b: makeCV(inCvId, inModuleId),
    patch: {id: patchId} as Patch,
    instance_id_a: outInstanceId,
    instance_id_b: inInstanceId
  };
}

/** Mirrors PatchGraphComponent.extractModuleInstances logic (pure function extracted for testing). */
function extractModuleInstances(connections: PatchConnection[]): Array<{
  moduleId: number;
  instanceId: number | undefined
}> {
  const seen = new Map<string, {
    moduleId: number;
    instanceId: number | undefined
  }>();
  const add = (moduleId: number, instanceId: number | undefined) => {
    const key = `${ moduleId }_${ instanceId ?? 'none' }`;
    if (!seen.has(key)) { seen.set(key, {moduleId, instanceId}); }
  };
  connections.forEach(c => {
    add(c.a.module.id, c.instance_id_a);
    add(c.b.module.id, c.instance_id_b);
  });
  return Array.from(seen.values());
}

/** Mirrors node-ID construction from PatchGraphComponent. */
function moduleNodeId(moduleId: number, instanceId: number | undefined): string {
  const suffix = instanceId != null ? `_${ instanceId }` : '';
  return moduleId.toString() + suffix;
}

function cvNodeId(moduleId: number, instanceId: number | undefined, cvId: number): string {
  const suffix = instanceId != null ? `_${ instanceId }` : '';
  return moduleId.toString() + suffix + cvId;
}


// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Patch graph — node-ID uniqueness with module instances', () => {
  
  describe('extractModuleInstances', () => {
    it('returns one entry per connection side when no instances', () => {
      const connections = [
        makeConnection(1, 10, undefined, 2, 20, undefined),
      ];
      const instances = extractModuleInstances(connections);
      expect(instances.length).toBe(2);
      expect(instances.map(i => i.moduleId)).toContain(10);
      expect(instances.map(i => i.moduleId)).toContain(20);
    });
    
    it('deduplicates when same module appears multiple times without instance IDs', () => {
      const connections = [
        makeConnection(1, 10, undefined, 2, 10, undefined),
      ];
      const instances = extractModuleInstances(connections);
      // both sides have the same module, no instance ID → should collapse to 1
      expect(instances.length).toBe(1);
    });
    
    it('keeps separate entries for same module with different instance IDs', () => {
      const connections = [
        makeConnection(1, 10, 101, 2, 10, 102),
      ];
      const instances = extractModuleInstances(connections);
      expect(instances.length).toBe(2);
      expect(instances[0].instanceId).toBe(101);
      expect(instances[1].instanceId).toBe(102);
    });
    
    it('handles three connections involving two instances of the same module', () => {
      const connections = [
        makeConnection(1, 10, 101, 2, 20, undefined),
        makeConnection(3, 10, 102, 4, 20, undefined),
        makeConnection(5, 30, undefined, 6, 10, 101),
      ];
      const instances = extractModuleInstances(connections);
      const module10Instances = instances.filter(i => i.moduleId === 10);
      expect(module10Instances.length).toBe(2);
    });
  });
  
  
  describe('moduleNodeId — collision prevention', () => {
    it('same module without instance IDs produces the same node ID (legacy behaviour)', () => {
      const id1 = moduleNodeId(10, undefined);
      const id2 = moduleNodeId(10, undefined);
      expect(id1).toBe(id2);
    });
    
    it('same module with different instance IDs produces different node IDs', () => {
      const id1 = moduleNodeId(10, 101);
      const id2 = moduleNodeId(10, 102);
      expect(id1).not.toBe(id2);
    });
    
    it('different modules without instance IDs produce different node IDs', () => {
      expect(moduleNodeId(10, undefined)).not.toBe(moduleNodeId(20, undefined));
    });
    
    it('instance suffix is underscore-prefixed (format: "<moduleId>_<instanceId>")', () => {
      expect(moduleNodeId(42, 7)).toBe('42_7');
    });
    
    it('no instance ID produces just the module ID string', () => {
      expect(moduleNodeId(42, undefined)).toBe('42');
    });
  });
  
  
  describe('cvNodeId — collision prevention', () => {
    it('same module + same CV + different instance IDs produce different node IDs', () => {
      const id1 = cvNodeId(10, 101, 55);
      const id2 = cvNodeId(10, 102, 55);
      expect(id1).not.toBe(id2);
    });
    
    it('same module + same instance ID + different CV IDs produce different node IDs', () => {
      expect(cvNodeId(10, 101, 55)).not.toBe(cvNodeId(10, 101, 56));
    });
    
    it('different modules + same CV ID produce different node IDs', () => {
      expect(cvNodeId(10, undefined, 55)).not.toBe(cvNodeId(20, undefined, 55));
    });
  });
  
  
  describe('PatchConnection model — instance_id fields', () => {
    it('instance_id_a and instance_id_b are optional (undefined by default)', () => {
      const conn = makeConnection(1, 10, undefined, 2, 20, undefined);
      expect(conn.instance_id_a).toBeUndefined();
      expect(conn.instance_id_b).toBeUndefined();
    });
    
    it('instance_id_a and instance_id_b are set when provided', () => {
      const conn = makeConnection(1, 10, 5, 2, 20, 6);
      expect(conn.instance_id_a).toBe(5);
      expect(conn.instance_id_b).toBe(6);
    });
  });
});