import {
  advanceFlowAnimationState,
  baseColorForPatchGraphEdge,
  buildFlowStyledEdges,
  createFlowAnimationState,
  hexToRgb,
  interpolateHexColor
} from '../patch-graph/patch-graph-flow.utils';
import { GraphEdge } from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import { PATCH_GRAPH_EDGE_STAGE } from '../patch-graph/patch-graph.constants';


function edge(id: string, from: string, to: string, stage?: string, hidden = false): GraphEdge {
  return {id, label: '', from, to, color: '#abc', size: 2, type: 'arrow', data: {stage, hidden}};
}

const palette = {
  flowStartColor: '#FFD447',
  flowEndColor: '#FFF2A3',
  flowBaseColor: '#93A0B1',
  moduleJackEdgeColor: 'rgba(137, 116, 228, 0.58)'
};


describe('hexToRgb', () => {
  it('parses a 6-digit hex string correctly', () => {
    expect(hexToRgb('#ffffff')).toEqual({r: 255, g: 255, b: 255});
    expect(hexToRgb('#000000')).toEqual({r: 0, g: 0, b: 0});
    expect(hexToRgb('#ff8000')).toEqual({r: 255, g: 128, b: 0});
  });
  
  it('expands a 3-digit hex shorthand to 6 digits', () => {
    // #abc → #aabbcc
    const result = hexToRgb('#abc');
    expect(result).toEqual({r: 170, g: 187, b: 204});
  });
  
  it('works without the leading #', () => {
    const result = hexToRgb('ff0000');
    expect(result).toEqual({r: 255, g: 0, b: 0});
  });
  
  it('handles lowercase hex digits', () => {
    expect(hexToRgb('#1a2b3c')).toEqual({r: 26, g: 43, b: 60});
  });
});


describe('interpolateHexColor - edge cases', () => {
  it('returns the from color at t=0', () => {
    const result = interpolateHexColor('#000000', '#ffffff', 0);
    expect(result).toBe('rgb(0, 0, 0)');
  });
  
  it('returns the to color at t=1', () => {
    const result = interpolateHexColor('#000000', '#ffffff', 1);
    expect(result).toBe('rgb(255, 255, 255)');
  });
  
  it('clamps t below 0 to 0', () => {
    const atZero = interpolateHexColor('#000000', '#ffffff', 0);
    const belowZero = interpolateHexColor('#000000', '#ffffff', -5);
    expect(belowZero).toBe(atZero);
  });
  
  it('clamps t above 1 to 1', () => {
    const atOne = interpolateHexColor('#000000', '#ffffff', 1);
    const aboveOne = interpolateHexColor('#000000', '#ffffff', 99);
    expect(aboveOne).toBe(atOne);
  });
});


describe('baseColorForPatchGraphEdge - uncovered branches', () => {
  it('returns hidden color for edges with hidden=true regardless of stage', () => {
    const hiddenEdge = edge('h', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN, true);
    expect(baseColorForPatchGraphEdge(hiddenEdge, palette)).toBe('rgba(0, 0, 0, 0)');
  });
  
  it('returns moduleJackEdgeColor for MODULE_TO_CV_OUT stage', () => {
    const e = edge('m', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.MODULE_TO_CV_OUT);
    expect(baseColorForPatchGraphEdge(e, palette)).toBe(palette.moduleJackEdgeColor);
  });
  
  it('returns moduleJackEdgeColor for CV_IN_TO_MODULE stage', () => {
    const e = edge('m', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_IN_TO_MODULE);
    expect(baseColorForPatchGraphEdge(e, palette)).toBe(palette.moduleJackEdgeColor);
  });
  
  it('returns flowBaseColor for patch cable stage', () => {
    const e = edge('p', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    expect(baseColorForPatchGraphEdge(e, palette)).toBe(palette.flowBaseColor);
  });
  
  it('returns flowBaseColor when edge has no data at all', () => {
    const bare: GraphEdge = {id: 'b', label: '', from: 'x', to: 'y', color: '#000', size: 1, type: 'arrow'};
    expect(baseColorForPatchGraphEdge(bare, palette)).toBe(palette.flowBaseColor);
  });
});


describe('createFlowAnimationState - fallback and seeding', () => {
  it('falls back to all non-hidden edges when preferred set is empty', () => {
    const e1 = edge('e1', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const state = createFlowAnimationState([e1], [], palette, () => 0)!;
    expect(state).toBeDefined();
    expect(state.flowPoolEdges.length).toBeGreaterThan(0);
  });
  
  it('excludes hidden edges from the flow pool even when they are in preferred list', () => {
    const visible = edge('v', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const hidden = edge('h', 'b', 'c', PATCH_GRAPH_EDGE_STAGE.MODULE_BRIDGE, true);
    const state = createFlowAnimationState([visible, hidden], [visible, hidden], palette, () => 0)!;
    const ids = state.flowPoolEdges.map(e => e.id);
    expect(ids).toContain('v');
    expect(ids).not.toContain('h');
  });
  
  it('sets outgoingByNode correctly based on pool edges', () => {
    const e1 = edge('e1', 'node-a', 'node-b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const e2 = edge('e2', 'node-a', 'node-c', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const state = createFlowAnimationState([e1, e2], [e1, e2], palette, () => 0)!;
    const outgoing = state.outgoingByNode.get('node-a') ?? [];
    expect(outgoing.length).toBe(2);
  });
});


describe('advanceFlowAnimationState - odd/even ticks', () => {
  it('on odd tick (1): decays heat but does NOT inject new pulse', () => {
    const e = edge('e', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const state = createFlowAnimationState([e], [e], palette, () => 0)!;
    const heatAfterInit = state.edgeHeatById.get('e') ?? 0;
    
    // first advance → odd tick (tickCount becomes 1)
    advanceFlowAnimationState(state, () => 0);
    const heatAfterOdd = state.edgeHeatById.get('e') ?? 0;
    
    // should have decayed but not injected
    expect(heatAfterOdd).toBeLessThan(heatAfterInit);
  });
  
  it('on even tick (2): decays AND injects a new pulse', () => {
    const e = edge('e', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const state = createFlowAnimationState([e], [e], palette, () => 0)!;
    
    advanceFlowAnimationState(state, () => 0); // tick 1 — only decay
    const heatAfterTick1 = state.edgeHeatById.get('e') ?? 0;
    
    advanceFlowAnimationState(state, () => 0); // tick 2 — decay + inject
    const heatAfterTick2 = state.edgeHeatById.get('e') ?? 0;
    
    // injection on tick 2 should bring heat back up relative to tick 1
    expect(heatAfterTick2).toBeGreaterThan(heatAfterTick1);
  });
});


describe('buildFlowStyledEdges - heat scaling', () => {
  it('scales edge size up when heat is high', () => {
    const e = edge('e', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const state = createFlowAnimationState([e], [e], palette, () => 0)!;
    // force full heat
    state.edgeHeatById.set('e', 1);
    const styled = buildFlowStyledEdges(state, palette);
    const original = state.baseEdges.find(x => x.id === 'e')!;
    const styledEdge = styled.find(x => x.id === 'e')!;
    expect(styledEdge.size).toBeGreaterThan(original.size);
  });
  
  it('uses base color for edges with heat near 0', () => {
    const e = edge('e', 'a', 'b', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const state = createFlowAnimationState([e], [e], palette, () => 0)!;
    state.edgeHeatById.clear(); // zero heat
    const styled = buildFlowStyledEdges(state, palette);
    const styledEdge = styled.find(x => x.id === 'e')!;
    // should use the base (flowBaseColor) not the flow color
    expect(styledEdge.color).toBe(palette.flowBaseColor);
  });
});