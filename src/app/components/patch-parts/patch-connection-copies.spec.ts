import { PatchConnectionCopiesPipe } from './patch-connection-copies.pipe';
import { PatchConnection } from 'src/app/models/connection';
import { CVwithModule } from 'src/app/models/cv';
import { Patch } from 'src/app/models/patch';


function makeCV(id: number, moduleId: number, moduleName: string): CVwithModule {
  return {
    id,
    name: `CV ${ id }`,
    module: {id: moduleId, name: moduleName} as any
  };
}

function makeConnection(outCvId: number, outModuleId: number, inCvId: number, inModuleId: number, instanceIdA?: number, instanceIdB?: number): PatchConnection {
  return {
    a: makeCV(outCvId, outModuleId, `Module ${ outModuleId }`),
    b: makeCV(inCvId, inModuleId, `Module ${ inModuleId }`),
    patch: {id: 1} as Patch,
    instance_id_a: instanceIdA,
    instance_id_b: instanceIdB
  };
}

describe('PatchConnectionCopiesPipe', () => {
  let pipe: PatchConnectionCopiesPipe;
  
  beforeEach(() => {
    pipe = new PatchConnectionCopiesPipe();
  });
  
  it('should return empty array for null input', () => {
    expect(pipe.transform(null)).toEqual([]);
  });
  
  it('should return empty array for undefined input', () => {
    expect(pipe.transform(undefined)).toEqual([]);
  });
  
  it('should return empty array for empty array', () => {
    expect(pipe.transform([])).toEqual([]);
  });
  
  it('should return empty array when no module has 2+ distinct copies', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20)
    ];
    const result = pipe.transform(connections);
    expect(result).toEqual([]);
  });
  
  it('should detect a module with 2 distinct connected copies', () => {
    // Module 10 appears with instance 100 and instance 101
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20, 100, 200),
      makeConnection(3, 10, 4, 30, 101, 300)
    ];
    const result = pipe.transform(connections);
    expect(result.length).toBe(1);
    expect(result[0].moduleId).toBe(10);
    expect(result[0].connectedCopies).toBe(2);
  });
  
  it('should not count the same instance_id twice for the same module', () => {
    // Module 10 appears twice but always with instance 100
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20, 100, 200),
      makeConnection(3, 10, 4, 30, 100, 300)
    ];
    const result = pipe.transform(connections);
    expect(result).toEqual([]);
  });
  
  it('should handle multiple modules with multiple copies', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20, 100, 200),
      makeConnection(3, 10, 4, 20, 101, 201)
    ];
    const result = pipe.transform(connections);
    // Both module 10 and module 20 have 2 distinct copies
    expect(result.length).toBe(2);
    const ids = result.map(r => r.moduleId).sort();
    expect(ids).toEqual([10, 20]);
  });
  
  it('should count 3 distinct copies correctly', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20, 100, 200),
      makeConnection(3, 10, 4, 20, 101, 200),
      makeConnection(5, 10, 6, 20, 102, 200)
    ];
    const result = pipe.transform(connections);
    const mod10 = result.find(r => r.moduleId === 10);
    expect(mod10).toBeTruthy();
    expect(mod10!.connectedCopies).toBe(3);
  });
  
  it('should treat undefined instance_id as a single group', () => {
    // Module 10 has one connection with instance_id undefined and one with 100
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20, undefined, 200),
      makeConnection(3, 10, 4, 30, 100, 300)
    ];
    const result = pipe.transform(connections);
    expect(result.length).toBe(1);
    expect(result[0].moduleId).toBe(10);
    expect(result[0].connectedCopies).toBe(2);
  });
});