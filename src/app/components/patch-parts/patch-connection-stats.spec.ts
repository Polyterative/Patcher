import { PatchConnectionStatsPipe } from './patch-connection-stats.pipe';
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

function makeConnection(outCvId: number, outModuleId: number, inCvId: number, inModuleId: number): PatchConnection {
  return {
    a: makeCV(outCvId, outModuleId, `Module ${ outModuleId }`),
    b: makeCV(inCvId, inModuleId, `Module ${ inModuleId }`),
    patch: {id: 1} as Patch
  };
}

describe('PatchConnectionStatsPipe', () => {
  let pipe: PatchConnectionStatsPipe;
  
  beforeEach(() => {
    pipe = new PatchConnectionStatsPipe();
  });
  
  it('should return null for null input', () => {
    expect(pipe.transform(null)).toBeNull();
  });
  
  it('should return null for undefined input', () => {
    expect(pipe.transform(undefined)).toBeNull();
  });
  
  it('should return null for empty array', () => {
    expect(pipe.transform([])).toBeNull();
  });
  
  it('should count a single connection as 1 cable', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20)
    ];
    const result = pipe.transform(connections)!;
    expect(result.totalCables).toBe(1);
  });
  
  it('should count unique modules correctly with 2 distinct modules', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20)
    ];
    const result = pipe.transform(connections)!;
    expect(result.uniqueModules).toBe(2);
  });
  
  it('should count unique modules correctly when same module appears in multiple connections', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20),
      makeConnection(3, 10, 4, 30) // module 10 appears twice as out
    ];
    const result = pipe.transform(connections)!;
    expect(result.uniqueModules).toBe(3); // modules 10, 20, 30
  });
  
  it('should return 0 multiples when every output drives only one input', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20),
      makeConnection(3, 30, 4, 40)
    ];
    const result = pipe.transform(connections)!;
    expect(result.multiplesCount).toBe(0);
  });
  
  it('should detect a multiple when one output CV drives two inputs', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20), // out CV 1 → in CV 2
      makeConnection(1, 10, 3, 30)  // out CV 1 → in CV 3 (multiple!)
    ];
    const result = pipe.transform(connections)!;
    expect(result.multiplesCount).toBe(1);
  });
  
  it('should detect 2 multiples when two distinct output CVs each drive multiple inputs', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 20),
      makeConnection(1, 10, 3, 30), // CV 1 is a multiple
      makeConnection(5, 50, 6, 60),
      makeConnection(5, 50, 7, 70)  // CV 5 is a multiple
    ];
    const result = pipe.transform(connections)!;
    expect(result.multiplesCount).toBe(2);
  });
  
  it('should report correct totalCables for a larger patch', () => {
    const connections = [
      makeConnection(1, 10, 2, 20),
      makeConnection(3, 30, 4, 40),
      makeConnection(5, 50, 6, 60),
      makeConnection(7, 70, 8, 80),
      makeConnection(9, 90, 10, 100)
    ];
    const result = pipe.transform(connections)!;
    expect(result.totalCables).toBe(5);
  });
  
  it('should handle a connection where both CVs are on the same module', () => {
    const connections: PatchConnection[] = [
      makeConnection(1, 10, 2, 10) // self-patch on module 10
    ];
    const result = pipe.transform(connections)!;
    expect(result.uniqueModules).toBe(1);
    expect(result.totalCables).toBe(1);
    expect(result.multiplesCount).toBe(0);
  });
});