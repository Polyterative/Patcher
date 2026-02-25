import { GraphEdge } from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';


export interface FlowAnimationState {
  baseEdges: GraphEdge[];
  flowPoolEdges: GraphEdge[];
  outgoingByNode: Map<string, GraphEdge[]>;
  currentNodeId?: string;
  edgeHeatById: Map<string, number>;
  tickCount: number;
}

export interface PatchGraphFlowPalette {
  flowStartColor: string;
  flowEndColor: string;
  flowBaseColor: string;
  moduleJackEdgeColor: string;
}

export function createFlowAnimationState(
  edges: GraphEdge[],
  preferredFlowEdges: GraphEdge[],
  palette: PatchGraphFlowPalette,
  randomFn: () => number = Math.random
): FlowAnimationState | undefined {
  if (edges.length === 0) {
    return undefined;
  }
  
  const baseEdges = edges.map(edge => ({
    ...edge,
    color: baseColorForPatchGraphEdge(edge, palette)
  }));
  
  const preferredFlowEdgeIds = new Set(preferredFlowEdges.map(edge => edge.id));
  const flowPoolEdges = baseEdges.filter(edge =>
    !edge.data?.hidden && preferredFlowEdgeIds.has(edge.id)
  );
  const resolvedFlowPool = flowPoolEdges.length > 0
    ? flowPoolEdges
    : baseEdges.filter(edge => !edge.data?.hidden);
  
  const outgoingByNode = new Map<string, GraphEdge[]>();
  resolvedFlowPool.forEach(edge => {
    const list = outgoingByNode.get(edge.from) ?? [];
    list.push(edge);
    outgoingByNode.set(edge.from, list);
  });
  
  const flowState: FlowAnimationState = {
    baseEdges,
    flowPoolEdges: resolvedFlowPool,
    outgoingByNode,
    currentNodeId: resolvedFlowPool[0]?.to,
    edgeHeatById: new Map<string, number>(),
    tickCount: 0
  };
  
  injectFlowPulse(flowState, randomFn);
  
  return flowState;
}

export function advanceFlowAnimationState(
  flowState: FlowAnimationState,
  randomFn: () => number = Math.random
): void {
  flowState.tickCount += 1;
  decayFlowHeat(flowState);
  
  if (flowState.tickCount % 2 === 0) {
    injectFlowPulse(flowState, randomFn);
  }
}

export function buildFlowStyledEdges(
  flowState: FlowAnimationState,
  palette: PatchGraphFlowPalette
): GraphEdge[] {
  return flowState.baseEdges.map(edge => {
    if (edge.data?.hidden) {
      return {
        ...edge,
        color: 'rgba(0, 0, 0, 0)',
        data: {
          ...(edge.data ?? {}),
          flowHeat: 0
        }
      };
    }
    
    const heat = flowState.edgeHeatById.get(edge.id) ?? 0;
    const flowColor = interpolateHexColor(
      palette.flowEndColor,
      palette.flowStartColor,
      Math.min(1, heat)
    );
    
    return {
      ...edge,
      color: heat > 0.01
        ? flowColor
        : baseColorForPatchGraphEdge(edge, palette),
      size: edge.size * (0.95 + heat * 0.62),
      data: {
        ...(edge.data ?? {}),
        flowHeat: heat
      }
    };
  });
}

export function baseColorForPatchGraphEdge(
  edge: GraphEdge,
  palette: Pick<PatchGraphFlowPalette, 'flowBaseColor' | 'moduleJackEdgeColor'>
): string {
  if (edge.data?.hidden) {
    return 'rgba(0, 0, 0, 0)';
  }
  
  if (edge.data?.stage === 'module-to-cv-out' || edge.data?.stage === 'cv-in-to-module') {
    return palette.moduleJackEdgeColor;
  }
  
  return palette.flowBaseColor;
}

export function interpolateHexColor(fromHex: string, toHex: string, t: number): string {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(from.r + (to.r - from.r) * clamped);
  const g = Math.round(from.g + (to.g - from.g) * clamped);
  const b = Math.round(from.b + (to.b - from.b) * clamped);
  
  return `rgb(${ r }, ${ g }, ${ b })`;
}

export function hexToRgb(hex: string): {
  r: number,
  g: number,
  b: number
} {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map(char => char + char).join('')
    : value;
  const parsed = Number.parseInt(normalized, 16);
  
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}

function injectFlowPulse(flowState: FlowAnimationState, randomFn: () => number): void {
  const {
    flowPoolEdges,
    outgoingByNode,
    edgeHeatById
  } = flowState;
  
  if (flowPoolEdges.length === 0) {
    return;
  }
  
  const sourceNodeId = flowState.currentNodeId;
  const outgoing = sourceNodeId ? outgoingByNode.get(sourceNodeId) ?? [] : [];
  const pool = outgoing.length > 0 ? outgoing : flowPoolEdges;
  
  const nextEdge = pool[Math.floor(randomFn() * pool.length)];
  if (!nextEdge) {
    return;
  }
  
  flowState.currentNodeId = nextEdge.to;
  const current = edgeHeatById.get(nextEdge.id) ?? 0;
  edgeHeatById.set(nextEdge.id, Math.min(1, current + 0.72));
}

function decayFlowHeat(flowState: FlowAnimationState): void {
  const nextHeatById = new Map<string, number>();
  flowState.edgeHeatById.forEach((heat, edgeId) => {
    const decayed = heat * 0.87;
    if (decayed > 0.03) {
      nextHeatById.set(edgeId, decayed);
    }
  });
  
  flowState.edgeHeatById = nextHeatById;
}