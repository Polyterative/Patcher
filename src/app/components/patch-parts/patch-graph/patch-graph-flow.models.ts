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
