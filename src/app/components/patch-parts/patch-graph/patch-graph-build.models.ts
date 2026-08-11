import { PatchConnection } from 'src/app/models/connection';
import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';

export interface ModuleInstance {
  moduleId: number;
  instanceId: number | undefined;
}

export interface PatchGraphJack {
  id: number;
  name: string;
}

export interface PatchGraphModule {
  id: number;
  name: string;
  ins: PatchGraphJack[];
  outs: PatchGraphJack[];
}

export interface PatchGraphBuildPalette {
  moduleColor: string;
  cvOutColor: string;
  cvInColor: string;
  moduleJackEdgeColor: string;
  patchCableBaseColor: string;
}

export interface PatchGraphBuildParams {
  connections: PatchConnection[];
  modules: PatchGraphModule[];
  sizeConstant: number;
  palette: PatchGraphBuildPalette;
}

export interface PatchGraphBuildResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
