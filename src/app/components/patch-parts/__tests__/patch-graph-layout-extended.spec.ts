import { GraphNode } from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import { orderPatchGraphNodesForReveal } from '../patch-graph/patch-graph-layout.utils';
import { PATCH_GRAPH_NODE_TYPE } from '../patch-graph/patch-graph.constants';


function node(id: string, type?: string, parentModuleNodeId?: string): GraphNode {
  return {id, label: id, color: '#000', size: 1, x: 0, y: 0, data: {type, parentModuleNodeId}};
}


describe('orderPatchGraphNodesForReveal - extended coverage', () => {
  
  it('returns empty array unchanged', () => {
    expect(orderPatchGraphNodesForReveal([])).toEqual([]);
  });
  
  it('radial fallback: single node gets non-zero coordinates', () => {
    const result = orderPatchGraphNodesForReveal([node('alone')]);
    expect(result.length).toBe(1);
    // Single node placed at angle 0 → (radius, 0)
    const r = Math.sqrt(result[0].x ** 2 + result[0].y ** 2);
    expect(r).toBeGreaterThan(2);
  });
  
  it('radial fallback: 8 nodes all get unique positions', () => {
    const nodes = Array.from({length: 8}, (_, i) => node(`n${ i }`));
    const result = orderPatchGraphNodesForReveal(nodes);
    const positions = new Set(result.map(n => `${ n.x.toFixed(4) },${ n.y.toFixed(4) }`));
    expect(positions.size).toBe(8);
  });
  
  it('multiple modules are each placed at distinct positions', () => {
    const modules = [
      node('m1', PATCH_GRAPH_NODE_TYPE.MODULE),
      node('m2', PATCH_GRAPH_NODE_TYPE.MODULE),
      node('m3', PATCH_GRAPH_NODE_TYPE.MODULE)
    ];
    const result = orderPatchGraphNodesForReveal(modules);
    const moduleResults = result.filter(n => n.id.startsWith('m'));
    const positions = new Set(moduleResults.map(n => `${ n.x.toFixed(4) },${ n.y.toFixed(4) }`));
    expect(positions.size).toBe(3);
  });
  
  it('a module with no children still appears in output', () => {
    const result = orderPatchGraphNodesForReveal([node('solo', PATCH_GRAPH_NODE_TYPE.MODULE)]);
    expect(result.find(n => n.id === 'solo')).toBeDefined();
  });
  
  it('child nodes with no matching parent end up as ungrouped', () => {
    const m = node('m1', PATCH_GRAPH_NODE_TYPE.MODULE);
    const orphan = node('orphan', PATCH_GRAPH_NODE_TYPE.CV_OUT, 'nonexistent-parent');
    const result = orderPatchGraphNodesForReveal([m, orphan]);
    expect(result.find(n => n.id === 'orphan')).toBeDefined();
    expect(result.find(n => n.id === 'm1')).toBeDefined();
  });
  
  it('multiple out-nodes of same module all receive distinct positions', () => {
    const m = node('m1', PATCH_GRAPH_NODE_TYPE.MODULE);
    const outs = Array.from({length: 4}, (_, i) => node(`out-${ i }`, PATCH_GRAPH_NODE_TYPE.CV_OUT, 'm1'));
    const result = orderPatchGraphNodesForReveal([m, ...outs]);
    const outResults = result.filter(n => n.id.startsWith('out-'));
    const positions = new Set(outResults.map(n => `${ n.x.toFixed(4) },${ n.y.toFixed(4) }`));
    expect(positions.size).toBe(4);
  });
  
  it('both cv-in and cv-out nodes for the same module are placed', () => {
    const m = node('m1', PATCH_GRAPH_NODE_TYPE.MODULE);
    const out = node('o1', PATCH_GRAPH_NODE_TYPE.CV_OUT, 'm1');
    const inN = node('i1', PATCH_GRAPH_NODE_TYPE.CV_IN, 'm1');
    const result = orderPatchGraphNodesForReveal([m, out, inN]);
    expect(result.find(n => n.id === 'o1')).toBeDefined();
    expect(result.find(n => n.id === 'i1')).toBeDefined();
  });
  
  it('child nodes are sorted: cv-out before cv-in within a module', () => {
    const m = node('m1', PATCH_GRAPH_NODE_TYPE.MODULE);
    const inFirst = node('i1', PATCH_GRAPH_NODE_TYPE.CV_IN, 'm1');
    const outSecond = node('o1', PATCH_GRAPH_NODE_TYPE.CV_OUT, 'm1');
    // Pass in-first order; expect out to come before in in the result
    const result = orderPatchGraphNodesForReveal([m, inFirst, outSecond]);
    const outIdx = result.findIndex(n => n.id === 'o1');
    const inIdx = result.findIndex(n => n.id === 'i1');
    expect(outIdx).toBeLessThan(inIdx);
  });
});