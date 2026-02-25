import { GraphNode } from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import { orderPatchGraphNodesForReveal } from '../patch-graph/patch-graph-layout.utils';


function node(id: string, type?: string, parentModuleNodeId?: string): GraphNode {
  return {
    id,
    label: id,
    color: '#000',
    size: 1,
    x: 0,
    y: 0,
    data: {
      type,
      parentModuleNodeId
    }
  };
}


describe('orderPatchGraphNodesForReveal', () => {
  it('places non-module nodes on a fallback radial layout', () => {
    const ordered = orderPatchGraphNodesForReveal([
      node('a'),
      node('b'),
      node('c')
    ]);
    
    expect(ordered.length).toBe(3);
    const uniquePositions = new Set(ordered.map(n => `${ n.x.toFixed(4) },${ n.y.toFixed(4) }`));
    expect(uniquePositions.size).toBe(3);
    
    const radius = Math.sqrt((ordered[0].x ** 2) + (ordered[0].y ** 2));
    expect(radius).toBeGreaterThan(2);
  });
  
  it('positions module children around their parent, with outs farther from center than ins', () => {
    const moduleNode = node('m1', 'module');
    const outNode = node('m1-o1', 'cv-out', 'm1');
    const inNode = node('m1-i1', 'cv-in', 'm1');
    
    const ordered = orderPatchGraphNodesForReveal([moduleNode, outNode, inNode]);
    
    const resolvedModule = ordered.find(n => n.id === 'm1');
    const resolvedOut = ordered.find(n => n.id === 'm1-o1');
    const resolvedIn = ordered.find(n => n.id === 'm1-i1');
    
    expect(resolvedModule).toBeDefined();
    expect(resolvedOut).toBeDefined();
    expect(resolvedIn).toBeDefined();
    
    expect(resolvedOut!.y).toBeLessThan(resolvedModule!.y);
    expect(resolvedIn!.y).toBeGreaterThan(resolvedModule!.y);
  });
  
  it('keeps ungrouped nodes in output while preserving module-first ordering', () => {
    const ordered = orderPatchGraphNodesForReveal([
      node('m1', 'module'),
      node('m1-o1', 'cv-out', 'm1'),
      node('loose')
    ]);
    
    expect(ordered[0].id).toBe('m1');
    expect(ordered.some(n => n.id === 'loose')).toBeTrue();
  });
});