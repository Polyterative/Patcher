/**
 * Unit tests for patch-graph node-ID uniqueness with duplicate module instances.
 */

import { PatchConnection } from 'src/app/models/connection';
import { CVwithModule } from 'src/app/models/cv';
import { Patch } from 'src/app/models/patch';
import {
  buildCvNodeId,
  buildModuleNodeId,
  extractPatchGraphModuleInstances
} from '../patch-graph/patch-graph-build.utils';


function makeCV(id: number, moduleId: number, moduleName = `Module ${ moduleId }`): CVwithModule {
  return {id, name: `CV ${ id }`, module: {id: moduleId, name: moduleName} as any};
}

function makeConnection(
  outCvId: number,
  outModuleId: number,
  outInstanceId: number | undefined,
  inCvId: number,
  inModuleId: number,
  inInstanceId: number | undefined,
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


describe('Patch graph — node-ID uniqueness with module instances', () => {
  
  describe('extractPatchGraphModuleInstances', () => {
    it('returns one entry per connection side when no instances', () => {
      const connections = [
        makeConnection(1, 10, undefined, 2, 20, undefined)
      ];
      const instances = extractPatchGraphModuleInstances(connections);
      expect(instances.length).toBe(2);
      expect(instances.map(i => i.moduleId)).toContain(10);
      expect(instances.map(i => i.moduleId)).toContain(20);
    });

    it('deduplicates when same module appears multiple times without instance IDs', () => {
      const connections = [
        makeConnection(1, 10, undefined, 2, 10, undefined)
      ];
      const instances = extractPatchGraphModuleInstances(connections);
      expect(instances.length).toBe(1);
    });

    it('keeps separate entries for same module with different instance IDs', () => {
      const connections = [
        makeConnection(1, 10, 101, 2, 10, 102)
      ];
      const instances = extractPatchGraphModuleInstances(connections);
      expect(instances.length).toBe(2);
      expect(instances[0].instanceId).toBe(101);
      expect(instances[1].instanceId).toBe(102);
    });

    it('handles three connections involving two instances of the same module', () => {
      const connections = [
        makeConnection(1, 10, 101, 2, 20, undefined),
        makeConnection(3, 10, 102, 4, 20, undefined),
        makeConnection(5, 30, undefined, 6, 10, 101)
      ];
      const instances = extractPatchGraphModuleInstances(connections);
      const module10Instances = instances.filter(i => i.moduleId === 10);
      expect(module10Instances.length).toBe(2);
    });
  });
  
  
  describe('buildModuleNodeId — collision prevention', () => {
    it('same module without instance IDs produces the same node ID', () => {
      const id1 = buildModuleNodeId(10, undefined);
      const id2 = buildModuleNodeId(10, undefined);
      expect(id1).toBe(id2);
    });

    it('same module with different instance IDs produces different node IDs', () => {
      const id1 = buildModuleNodeId(10, 101);
      const id2 = buildModuleNodeId(10, 102);
      expect(id1).not.toBe(id2);
    });

    it('different modules without instance IDs produce different node IDs', () => {
      expect(buildModuleNodeId(10, undefined)).not.toBe(buildModuleNodeId(20, undefined));
    });

    it('instance suffix is underscore-prefixed (format: "<moduleId>_<instanceId>")', () => {
      expect(buildModuleNodeId(42, 7)).toBe('42_7');
    });

    it('no instance ID produces just the module ID string', () => {
      expect(buildModuleNodeId(42, undefined)).toBe('42');
    });
  });
  
  
  describe('buildCvNodeId — collision prevention', () => {
    it('same module + same CV + different instance IDs produce different node IDs', () => {
      const id1 = buildCvNodeId(10, 101, 55);
      const id2 = buildCvNodeId(10, 102, 55);
      expect(id1).not.toBe(id2);
    });
    
    it('same module + same instance ID + different CV IDs produce different node IDs', () => {
      expect(buildCvNodeId(10, 101, 55)).not.toBe(buildCvNodeId(10, 101, 56));
    });
    
    it('different modules + same CV ID produce different node IDs', () => {
      expect(buildCvNodeId(10, undefined, 55)).not.toBe(buildCvNodeId(20, undefined, 55));
    });
  });
  
  
  describe('PatchConnection model — instance_id fields', () => {
    it('instance_id_a and instance_id_b are optional (undefined by default)', () => {
      const connection = makeConnection(1, 10, undefined, 2, 20, undefined);
      expect(connection.instance_id_a).toBeUndefined();
      expect(connection.instance_id_b).toBeUndefined();
    });
    
    it('instance_id_a and instance_id_b are set when provided', () => {
      const connection = makeConnection(1, 10, 5, 2, 20, 6);
      expect(connection.instance_id_a).toBe(5);
      expect(connection.instance_id_b).toBe(6);
    });
  });
});