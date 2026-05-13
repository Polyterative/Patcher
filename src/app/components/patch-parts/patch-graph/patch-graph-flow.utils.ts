import { GraphEdge } from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import {
  PATCH_GRAPH_EDGE_STAGE,
  PATCH_GRAPH_HIDDEN_COLOR
} from './patch-graph.constants';

const FLOW_HEAT_DECAY = 0.87;
const FLOW_HEAT_MIN_THRESHOLD = 0.03;
const FLOW_HEAT_INCREMENT = 0.72;
const FLOW_SIZE_BASE = 0.95;
const FLOW_SIZE_HEAT_SCALE = 0.62;


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
  // Prefer IO path edges when available; otherwise fall back to any visible edge.
  const flowPoolEdges = baseEdges.filter(edge =>
    !edge.data?.hidden && preferredFlowEdgeIds.has(edge.id)
  );
  const resolvedFlowPool = flowPoolEdges.length > 0
    ? flowPoolEdges
    : baseEdges.filter(edge => !edge.data?.hidden);
  
  const outgoingByNode = resolvedFlowPool.reduce((acc, edge) => {
    const list = acc.get(edge.from) ?? [];
    list.push(edge);
    acc.set(edge.from, list);
    return acc;
  }, new Map<string, GraphEdge[]>());
  
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
  // Every tick decays prior heat; every second tick injects a new leading pulse.
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
  // Styled edge output is pure projection of heat map + static edge metadata.
  return flowState.baseEdges.map(edge => {
    if (edge.data?.hidden) {
      return {
        ...edge,
        color: PATCH_GRAPH_HIDDEN_COLOR,
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
      size: edge.size * (FLOW_SIZE_BASE + heat * FLOW_SIZE_HEAT_SCALE),
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
    return PATCH_GRAPH_HIDDEN_COLOR;
  }
  
  if (
    edge.data?.stage === PATCH_GRAPH_EDGE_STAGE.MODULE_TO_CV_OUT
    || edge.data?.stage === PATCH_GRAPH_EDGE_STAGE.CV_IN_TO_MODULE
  ) {
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
  // Walk forward if possible; otherwise reseed from the global flow pool.
  const outgoing = sourceNodeId ? outgoingByNode.get(sourceNodeId) ?? [] : [];
  const pool = outgoing.length > 0 ? outgoing : flowPoolEdges;
  
  const nextEdge = pool[Math.floor(randomFn() * pool.length)];
  if (!nextEdge) {
    return;
  }
  
  flowState.currentNodeId = nextEdge.to;
  const current = edgeHeatById.get(nextEdge.id) ?? 0;
  edgeHeatById.set(nextEdge.id, Math.min(1, current + FLOW_HEAT_INCREMENT));
}

function decayFlowHeat(flowState: FlowAnimationState): void {
  flowState.edgeHeatById = new Map(
    [...flowState.edgeHeatById.entries()]
      .map(([id, heat]) => [id, heat * FLOW_HEAT_DECAY] as const)
      .filter(([, decayed]) => decayed > FLOW_HEAT_MIN_THRESHOLD)
  );
}
