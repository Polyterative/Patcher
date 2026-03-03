import { PatchConnectionUniqueModulesPipe } from './patch-connection-unique-modules.pipe';
import { PatchConnection } from 'src/app/models/connection';


function makeConnection(
  aModuleId: number, aModuleName: string, aManufacturer: string,
  bModuleId: number, bModuleName: string, bManufacturer: string,
  instanceIdA?: number, instanceIdB?: number
): PatchConnection {
  return {
    patch: {} as any,
    instance_id_a: instanceIdA,
    instance_id_b: instanceIdB,
    a: {id: 1, name: 'CV Out', module: {id: aModuleId, name: aModuleName, manufacturer: {id: 1, name: aManufacturer}} as any} as any,
    b: {id: 2, name: 'CV In', module: {id: bModuleId, name: bModuleName, manufacturer: {id: 2, name: bManufacturer}} as any} as any
  } as PatchConnection;
}


describe('PatchConnectionUniqueModulesPipe', () => {
  let pipe: PatchConnectionUniqueModulesPipe;
  
  beforeEach(() => {
    pipe = new PatchConnectionUniqueModulesPipe();
  });
  
  it('returns empty array for null input', () => {
    expect(pipe.transform(null)).toEqual([]);
  });
  
  it('returns empty array for undefined input', () => {
    expect(pipe.transform(undefined)).toEqual([]);
  });
  
  it('returns empty array for empty array input', () => {
    expect(pipe.transform([])).toEqual([]);
  });
  
  it('returns unique modules from a single connection', () => {
    const conn = makeConnection(1, 'Rings', 'Mutable', 2, 'Plaits', 'Mutable');
    const result = pipe.transform([conn]);
    expect(result.length).toBe(2);
    expect(result.map(r => r.moduleName).sort()).toEqual(['Plaits', 'Rings']);
  });
  
  it('deduplicates the same module on both sides of a connection', () => {
    const conn = makeConnection(1, 'Rings', 'Mutable', 1, 'Rings', 'Mutable');
    const result = pipe.transform([conn]);
    expect(result.length).toBe(1);
    expect(result[0].moduleName).toBe('Rings');
  });
  
  it('counts multiple distinct instances as copies', () => {
    const conn1 = makeConnection(1, 'Rings', 'Mutable', 2, 'Plaits', 'Mutable', 100, 200);
    const conn2 = makeConnection(1, 'Rings', 'Mutable', 2, 'Plaits', 'Mutable', 101, 201);
    const result = pipe.transform([conn1, conn2]);
    const rings = result.find(r => r.moduleName === 'Rings');
    expect(rings!.copies).toBe(2);
  });
  
  it('assigns copies=1 for single instance', () => {
    const conn = makeConnection(1, 'Rings', 'Mutable', 2, 'Plaits', 'Mutable', 1, 2);
    const rings = pipe.transform([conn]).find(r => r.moduleName === 'Rings');
    expect(rings!.copies).toBe(1);
  });
  
  it('handles undefined instance IDs gracefully', () => {
    const conn = makeConnection(1, 'Rings', 'Mutable', 2, 'Plaits', 'Mutable', undefined, undefined);
    expect(pipe.transform([conn]).length).toBe(2);
  });
  
  it('sorts results alphabetically by module name', () => {
    const conn = makeConnection(3, 'Warps', 'Mutable', 1, 'Braids', 'Mutable');
    const result = pipe.transform([conn]);
    expect(result[0].moduleName).toBe('Braids');
    expect(result[1].moduleName).toBe('Warps');
  });
  
  it('exposes manufacturerName for each unique module', () => {
    const conn = makeConnection(1, 'Rings', 'Mutable Instruments', 2, 'Maths', 'Make Noise');
    const result = pipe.transform([conn]);
    expect(result.find(r => r.moduleName === 'Rings')!.manufacturerName).toBe('Mutable Instruments');
    expect(result.find(r => r.moduleName === 'Maths')!.manufacturerName).toBe('Make Noise');
  });
  
  it('handles missing manufacturer without crashing', () => {
    const conn = makeConnection(1, 'Rings', '', 2, 'Plaits', '');
    (conn.a.module as any).manufacturer = undefined;
    (conn.b.module as any).manufacturer = undefined;
    expect(() => pipe.transform([conn])).not.toThrow();
    const result = pipe.transform([conn]);
    result.forEach(r => expect(r.manufacturerName).toBe(''));
  });
  
  it('correctly exposes moduleId on each entry', () => {
    const conn = makeConnection(42, 'Module A', 'Maker', 99, 'Module B', 'Maker');
    const ids = pipe.transform([conn]).map(r => r.moduleId).sort((a, b) => a - b);
    expect(ids).toEqual([42, 99]);
  });
});