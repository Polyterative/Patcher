import { PatchConnection } from 'src/app/models/connection';
import { DbModule } from 'src/app/models/module';
import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';

export interface ModuleInstance {
  moduleId: number;
  instanceId: number | undefined;
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
  modules: DbModule[];
  sizeConstant: number;
  palette: PatchGraphBuildPalette;
}

export interface PatchGraphBuildResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
