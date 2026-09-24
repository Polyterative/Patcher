export interface GraphNode {
  id: string;
  size: number;
  label: string;
  color: string;
  data?: Record<string, unknown>;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  label: string;
  from: string;
  to: string;
  color: string;
  size: number;
  weight?: number;
  type: 'arrow' | 'curve' | 'line';
  data?: Record<string, unknown>;
}

export interface GraphComponentState {
  hoveredNode?: string;
  searchQuery: string;
  selectedNode?: string;
  suggestions?: Set<string>;
  hoveredNeighbors?: Set<string>;
}
