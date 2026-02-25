import { GraphEdge } from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import {
  advanceFlowAnimationState,
  baseColorForPatchGraphEdge,
  buildFlowStyledEdges,
  createFlowAnimationState,
  interpolateHexColor
} from '../patch-graph/patch-graph-flow.utils';


const palette = {
  flowStartColor: '#FFD447',
  flowEndColor: '#FFF2A3',
  flowBaseColor: '#93A0B1',
  moduleJackEdgeColor: 'rgba(137, 116, 228, 0.58)'
};

function edge(id: string, from: string, to: string, stage?: string, hidden = false): GraphEdge {
  return {
    id,
    label: '',
    from,
    to,
    color: '#000',
    size: 1,
    type: 'arrow',
    data: {
      stage,
      hidden
    }
  };
}


describe('patch-graph-flow utils', () => {
  it('returns undefined flow state for empty edge list', () => {
    const state = createFlowAnimationState([], [], palette);
    expect(state).toBeUndefined();
  });
  
  it('prefers provided flow edges and seeds initial heat', () => {
    const e1 = edge('e1', 'a', 'b', 'module-to-cv-out');
    const e2 = edge('e2', 'b', 'c', 'cv-out-to-cv-in');
    const state = createFlowAnimationState([e1, e2], [e2], palette, () => 0);
    
    expect(state).toBeDefined();
    expect(state!.flowPoolEdges.map(e => e.id)).toEqual(['e2']);
    expect(state!.edgeHeatById.get('e2')).toBeGreaterThan(0.7);
  });
  
  it('advances flow with decay and periodic reinjection', () => {
    const e1 = edge('e1', 'a', 'b', 'cv-out-to-cv-in');
    const state = createFlowAnimationState([e1], [e1], palette, () => 0)!;
    
    const initialHeat = state.edgeHeatById.get('e1')!;
    advanceFlowAnimationState(state, () => 0);
    const afterFirstTick = state.edgeHeatById.get('e1')!;
    expect(afterFirstTick).toBeLessThan(initialHeat);
    
    advanceFlowAnimationState(state, () => 0);
    const afterSecondTick = state.edgeHeatById.get('e1')!;
    expect(afterSecondTick).toBeGreaterThan(afterFirstTick);
  });
  
  it('keeps hidden edges transparent and annotates flow heat', () => {
    const visible = edge('visible', 'a', 'b', 'cv-out-to-cv-in');
    const hidden = edge('hidden', 'b', 'c', 'module-bridge', true);
    const state = createFlowAnimationState([visible, hidden], [visible], palette, () => 0)!;
    
    const styled = buildFlowStyledEdges(state, palette);
    const hiddenStyled = styled.find(e => e.id === 'hidden')!;
    const visibleStyled = styled.find(e => e.id === 'visible')!;
    
    expect(hiddenStyled.color).toBe('rgba(0, 0, 0, 0)');
    expect(hiddenStyled.data.flowHeat).toBe(0);
    expect(visibleStyled.data.flowHeat).toBeGreaterThan(0);
  });
  
  it('resolves base colors by stage', () => {
    const moduleJack = edge('m', 'a', 'b', 'cv-in-to-module');
    const patch = edge('p', 'a', 'b', 'cv-out-to-cv-in');
    
    expect(baseColorForPatchGraphEdge(moduleJack, palette)).toBe(palette.moduleJackEdgeColor);
    expect(baseColorForPatchGraphEdge(patch, palette)).toBe(palette.flowBaseColor);
  });
  
  it('interpolates hex colors into rgb output', () => {
    expect(interpolateHexColor('#000000', '#ffffff', 0.5)).toBe('rgb(128, 128, 128)');
  });
});