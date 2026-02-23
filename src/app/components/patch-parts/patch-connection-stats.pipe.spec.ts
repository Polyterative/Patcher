import { PatchConnection } from 'src/app/models/connection';
import { CVwithModule } from 'src/app/models/cv';
import { PatchConnectionStatsPipe } from './patch-connection-stats.pipe';


function makeCV(id: number, moduleId: number): CVwithModule {
  return {id, name: `cv-${ id }`, module: {id: moduleId} as any};
}

function makeConnection(
  aId: number, aModuleId: number,
  bId: number, bModuleId: number,
  opts: {
    notes?: string;
    instance_id_a?: number;
    instance_id_b?: number
  } = {}
): PatchConnection {
  return {
    patch: {} as any,
    a: makeCV(aId, aModuleId),
    b: makeCV(bId, bModuleId),
    ...opts
  };
}

describe('PatchConnectionStatsPipe', () => {
  let pipe: PatchConnectionStatsPipe;
  
  beforeEach(() => {
    pipe = new PatchConnectionStatsPipe();
  });
  
  it('returns null for null input', () => {
    expect(pipe.transform(null)).toBeNull();
  });
  
  it('returns null for undefined input', () => {
    expect(pipe.transform(undefined)).toBeNull();
  });
  
  it('returns null for an empty array', () => {
    expect(pipe.transform([])).toBeNull();
  });
  
  it('counts total cables', () => {
    const connections = [
      makeConnection(1, 10, 2, 20),
      makeConnection(3, 10, 4, 30)
    ];
    expect(pipe.transform(connections)!.totalCables).toBe(2);
  });
  
  it('counts unique modules across all endpoints', () => {
    const connections = [
      makeConnection(1, 10, 2, 20),
      makeConnection(3, 10, 4, 30)  // module 10 appears again
    ];
    expect(pipe.transform(connections)!.uniqueModules).toBe(3);
  });
  
  it('counts total instances using instance IDs', () => {
    // Two connections both using module 10 but different instances
    const connections = [
      makeConnection(1, 10, 2, 20, {instance_id_a: 1}),
      makeConnection(3, 10, 4, 30, {instance_id_a: 2})
    ];
    const result = pipe.transform(connections)!;
    // module 10 instance 1, module 10 instance 2, module 20 no-instance, module 30 no-instance
    expect(result.totalInstances).toBe(4);
  });
  
  it('falls back to one instance per module when no instance IDs provided', () => {
    const connections = [
      makeConnection(1, 10, 2, 20),
      makeConnection(3, 10, 4, 20)
    ];
    const result = pipe.transform(connections)!;
    // module 10 "none", module 20 "none" → 2 instances
    expect(result.totalInstances).toBe(2);
  });
  
  it('counts multiples — output CV used more than once', () => {
    const connections = [
      makeConnection(1, 10, 2, 20),
      makeConnection(1, 10, 3, 30)  // output CV 1 used twice → 1 multiple
    ];
    expect(pipe.transform(connections)!.multiplesCount).toBe(1);
  });
  
  it('returns 0 multiples when every output is used exactly once', () => {
    const connections = [
      makeConnection(1, 10, 2, 20),
      makeConnection(3, 30, 4, 40)
    ];
    expect(pipe.transform(connections)!.multiplesCount).toBe(0);
  });
  
  it('calculates avgCablesPerModule rounded to 1 decimal', () => {
    // 2 cables, 3 unique modules → (2*2/3) ≈ 1.3
    const connections = [
      makeConnection(1, 10, 2, 20),
      makeConnection(3, 10, 4, 30)
    ];
    expect(pipe.transform(connections)!.avgCablesPerModule).toBe(1.3);
  });
  
  it('counts annotated connections (non-empty notes)', () => {
    const connections = [
      makeConnection(1, 10, 2, 20, {notes: 'pitch CV'}),
      makeConnection(3, 10, 4, 30, {notes: '  '}),  // whitespace only → not annotated
      makeConnection(5, 10, 6, 30)                   // no notes
    ];
    expect(pipe.transform(connections)!.annotatedConnections).toBe(1);
  });
});