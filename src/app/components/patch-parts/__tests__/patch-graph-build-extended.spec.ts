import {
  buildCvNodeId,
  buildModuleNodeId,
  buildPatchGraphData,
  computePatchGraphSizeConstant,
  extractPatchGraphModuleInstances,
  moduleInstanceKey
} from '../patch-graph/patch-graph-build.utils';
import { PatchConnection } from 'src/app/models/connection';
import { CVwithModule } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';


const palette = {
  moduleColor: '#8974E4',
  cvOutColor: '#E2523C',
  cvInColor: '#4483F2',
  moduleJackEdgeColor: 'rgba(137, 116, 228, 0.58)',
  patchCableBaseColor: '#93A0B1'
};

function cv(id: number, moduleId: number, name = `cv${ id }`): CVwithModule {
  return {id, name, module: {id: moduleId, name: `Mod${ moduleId }`} as any};
}

function conn(
  aId: number, aMod: number,
  bId: number, bMod: number,
  iA?: number, iB?: number
): PatchConnection {
  return {
    a: cv(aId, aMod),
    b: cv(bId, bMod),
    patch: {id: 1} as Patch,
    instance_id_a: iA,
    instance_id_b: iB
  };
}

function mod(id: number, ins: number[], outs: number[]): DbModule {
  return {
    id,
    name: `Module${ id }`,
    ins: ins.map(i => ({id: i, name: `in${ i }`})),
    outs: outs.map(o => ({id: o, name: `out${ o }`}))
  } as DbModule;
}


describe('computePatchGraphSizeConstant', () => {
  it('returns baseSizeConstant when modules count is 0', () => {
    expect(computePatchGraphSizeConstant(0, 5)).toBe(5);
  });
  
  it('returns baseSizeConstant when connections count is 0', () => {
    expect(computePatchGraphSizeConstant(3, 0)).toBe(5);
  });
  
  it('clamps the result to minimum 1.5', () => {
    // ratio close to 0 → scaled < 1.5
    const result = computePatchGraphSizeConstant(1, 1000, 1);
    expect(result).toBeGreaterThanOrEqual(1.5);
  });
  
  it('clamps the result to maximum 6', () => {
    // very high modules/connections ratio → scaled > 6
    const result = computePatchGraphSizeConstant(1000, 1, 6);
    expect(result).toBeLessThanOrEqual(6);
  });
  
  it('uses custom baseSizeConstant', () => {
    const result = computePatchGraphSizeConstant(2, 2, 3);
    expect(result).toBeGreaterThanOrEqual(1.5);
    expect(result).toBeLessThanOrEqual(6);
  });
});


describe('moduleInstanceKey', () => {
  it('uses none suffix when instanceId is undefined', () => {
    expect(moduleInstanceKey(10, undefined)).toBe('10_none');
  });
  
  it('uses numeric suffix when instanceId is defined', () => {
    expect(moduleInstanceKey(10, 42)).toBe('10_42');
  });
  
  it('uses none suffix for instanceId=0 (falsy but valid)', () => {
    // 0 is falsy; the function uses ?? 'none'
    expect(moduleInstanceKey(7, 0)).toBe('7_0');
  });
});


describe('buildModuleNodeId', () => {
  it('returns just the moduleId when no instance', () => {
    expect(buildModuleNodeId(5, undefined)).toBe('5');
  });
  
  it('appends underscore + instanceId when instance is defined', () => {
    expect(buildModuleNodeId(5, 3)).toBe('5_3');
  });
});


describe('buildCvNodeId', () => {
  it('returns moduleId+cvId when no instance', () => {
    expect(buildCvNodeId(5, undefined, 99)).toBe('599');
  });
  
  it('returns moduleId_instanceId+cvId when instance is defined', () => {
    expect(buildCvNodeId(5, 2, 99)).toBe('5_299');
  });
});


describe('extractPatchGraphModuleInstances - additional cases', () => {
  it('returns empty array for empty connections', () => {
    expect(extractPatchGraphModuleInstances([])).toEqual([]);
  });
  
  it('handles multiple connections to same instance pair — deduplicates', () => {
    const connections = [
      conn(1, 10, 2, 20, undefined, undefined),
      conn(3, 10, 4, 20, undefined, undefined)
    ];
    const instances = extractPatchGraphModuleInstances(connections);
    // still only 2 unique (moduleId, instanceId) combos
    expect(instances.length).toBe(2);
  });
  
  it('keeps instance_id_a and instance_id_b as separate entries if modules differ', () => {
    const connections = [conn(1, 10, 2, 11, 1, 1)];
    const instances = extractPatchGraphModuleInstances(connections);
    expect(instances.length).toBe(2);
    const ids = instances.map(i => i.instanceId);
    expect(ids).toContain(1);
  });
});


describe('buildPatchGraphData - duplicate routes', () => {
  it('creates distinct edge IDs for duplicate connections between same CV pair', () => {
    const connections = [
      conn(1, 10, 2, 20),
      conn(1, 10, 2, 20)   // exact duplicate
    ];
    const modules = [mod(10, [2], [1]), mod(20, [2], [1])];
    
    const result = buildPatchGraphData({connections, modules, sizeConstant: 4, palette});
    
    const patchEdges = result.edges.filter(e => e.id.startsWith('patch:'));
    // Both edges should exist but with different occurrence suffixes
    expect(patchEdges.length).toBe(2);
    const patchIds = patchEdges.map(e => e.id);
    expect(new Set(patchIds).size).toBe(2);
  });
  
  it('self-loop connections (same module both sides) produce no module-bridge edge', () => {
    const connections = [conn(1, 10, 2, 10)];
    const modules = [mod(10, [2], [1])];
    
    const result = buildPatchGraphData({connections, modules, sizeConstant: 4, palette});
    
    const bridgeEdges = result.edges.filter(e => e.id.startsWith('module-bridge:'));
    expect(bridgeEdges.length).toBe(0);
  });
  
  it('connection with no matching module in modules list still creates cv nodes', () => {
    const connections = [conn(1, 99, 2, 88)];
    const modules: DbModule[] = []; // no modules provided
    
    const result = buildPatchGraphData({connections, modules, sizeConstant: 4, palette});
    
    // cv nodes should still be created as fallback
    expect(result.nodes.length).toBeGreaterThan(0);
  });
  
  it('module bridge only deduplicates — two connections between same module pair produce one bridge', () => {
    const connections = [
      conn(1, 10, 2, 20),
      conn(3, 10, 4, 20)
    ];
    const modules = [mod(10, [3, 1], []), mod(20, [], [2, 4])];
    
    const result = buildPatchGraphData({connections, modules, sizeConstant: 4, palette});
    
    const bridges = result.edges.filter(e => e.id.startsWith('module-bridge:'));
    expect(bridges.length).toBe(1);
  });
});


// Regression: buildPatchGraphData must return nodes with spread-out initial positions.
// Previously, the graph component called circularLayout.assign() after inserting nodes, which
// overwrote the relationship-aware positions computed here — causing the graph to render as a
// flat featureless circle instead of showing signal-flow structure.
describe('buildPatchGraphData - initial node positions', () => {
  it('returns nodes with distinct positions (not all collapsed to the same point)', () => {
    const connections = [conn(1, 10, 2, 20), conn(3, 20, 4, 30)];
    const modules = [mod(10, [], [1, 3]), mod(20, [2], [3]), mod(30, [4], [])];
    
    const result = buildPatchGraphData({connections, modules, sizeConstant: 5, palette});
    
    expect(result.nodes.length).toBeGreaterThan(1);
    const positions = new Set(result.nodes.map(n => `${ n.x.toFixed(4) },${ n.y.toFixed(4) }`));
    expect(positions.size).toBe(result.nodes.length);
  });
  
  it('module nodes are not all placed at (1, 1) — layout is applied before returning', () => {
    const connections = [conn(1, 10, 2, 20)];
    const modules = [mod(10, [], [1]), mod(20, [2], [])];
    
    const result = buildPatchGraphData({connections, modules, sizeConstant: 5, palette});
    
    const moduleNodes = result.nodes.filter(n => n.data?.type === 'module');
    expect(moduleNodes.length).toBeGreaterThanOrEqual(2);
    const atDefault = moduleNodes.filter(n => n.x === 1 && n.y === 1);
    expect(atDefault.length).toBe(0);
  });
  
  it('cv-out and cv-in nodes are not at (1, 1) — layout is applied before returning', () => {
    const connections = [conn(1, 10, 2, 20)];
    const modules = [mod(10, [], [1]), mod(20, [2], [])];
    
    const result = buildPatchGraphData({connections, modules, sizeConstant: 5, palette});
    
    const jackNodes = result.nodes.filter(n => n.data?.type === 'cv-out' || n.data?.type === 'cv-in');
    expect(jackNodes.length).toBeGreaterThan(0);
    const atDefault = jackNodes.filter(n => n.x === 1 && n.y === 1);
    expect(atDefault.length).toBe(0);
  });
  
  it('multi-module patch produces module nodes at distinct positions', () => {
    const connections = [
      conn(1, 10, 2, 20),
      conn(3, 20, 4, 30),
      conn(5, 30, 6, 40)
    ];
    const modules = [
      mod(10, [], [1]),
      mod(20, [2], [3]),
      mod(30, [4], [5]),
      mod(40, [6], [])
    ];
    
    const result = buildPatchGraphData({connections, modules, sizeConstant: 5, palette});
    
    const moduleNodes = result.nodes.filter(n => n.data?.type === 'module');
    expect(moduleNodes.length).toBe(4);
    
    const positions = new Set(moduleNodes.map(n => `${ n.x.toFixed(4) },${ n.y.toFixed(4) }`));
    expect(positions.size).toBe(4);
  });
});