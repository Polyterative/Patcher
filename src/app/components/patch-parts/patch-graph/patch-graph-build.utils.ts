import { PatchConnection } from 'src/app/models/connection';
import { CVwithModule } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import {
  PATCH_GRAPH_EDGE_STAGE,
  PATCH_GRAPH_HIDDEN_COLOR,
  PATCH_GRAPH_NODE_TYPE
} from './patch-graph.constants';
import { orderPatchGraphNodesForReveal } from './patch-graph-layout.utils';


interface NodesDictionary {
  [id: string]: GraphNode;
}

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

export function computePatchGraphSizeConstant(
  modulesCount: number,
  connectionsCount: number,
  baseSizeConstant = 5
): number {
  if (modulesCount <= 0 || connectionsCount <= 0) {
    return baseSizeConstant;
  }
  
  const ratio = (modulesCount / connectionsCount) / 1.5;
  const scaled = baseSizeConstant * ratio;
  return Math.max(1.5, Math.min(6, scaled));
}

export function moduleInstanceKey(moduleId: number, instanceId: number | undefined): string {
  return `${ moduleId }_${ instanceId ?? 'none' }`;
}

/** Extract unique (moduleId, instanceId) pairs from patch connections. */
export function extractPatchGraphModuleInstances(connections: PatchConnection[]): ModuleInstance[] {
  const seen = new Map<string, ModuleInstance>();
  const add = (moduleId: number, instanceId: number | undefined) => {
    const key = moduleInstanceKey(moduleId, instanceId);
    if (!seen.has(key)) {
      seen.set(key, {moduleId, instanceId});
    }
  };
  
  connections.forEach(connection => {
    add(connection.a.module.id, connection.instance_id_a);
    add(connection.b.module.id, connection.instance_id_b);
  });
  
  return Array.from(seen.values());
}

export function buildModuleNodeId(moduleId: number, instanceId: number | undefined): string {
  const instanceSuffix = instanceId != null ? `_${ instanceId }` : '';
  return moduleId.toString() + instanceSuffix;
}

export function buildCvNodeId(
  moduleId: number,
  instanceId: number | undefined,
  cvId: number
): string {
  const instanceSuffix = instanceId != null ? `_${ instanceId }` : '';
  return moduleId.toString() + instanceSuffix + cvId;
}

export function buildPatchGraphData(params: PatchGraphBuildParams): PatchGraphBuildResult {
  const {
    connections,
    modules,
    sizeConstant,
    palette
  } = params;
  
  const nodesDictionary: NodesDictionary = {};
  const allModuleJackNodes: NodesDictionary = {};
  const allModuleJackEdges: {
    [id: string]: GraphEdge
  } = {};
  
  // Fast module lookup lets connection passes avoid repeated linear scans.
  const moduleLookup = new Map<number, DbModule>(modules.map(module => [module.id, module]));
  
  // Instance grouping guarantees duplicate modules get stable "(n)" labels and distinct IDs.
  const instances = extractPatchGraphModuleInstances(connections);
  const instancesByModule = instances.reduce((map, instance) => {
    const list = map.get(instance.moduleId) ?? [];
    list.push(instance);
    return map.set(instance.moduleId, list);
  }, new Map<number, ModuleInstance[]>());
  
  const instanceOrderByKey = new Map<string, number>();
  instancesByModule.forEach((moduleInstances, moduleId) => {
    moduleInstances.forEach((moduleInstance, index) => {
      instanceOrderByKey.set(moduleInstanceKey(moduleId, moduleInstance.instanceId), index + 1);
    });
  });
  
  // First pass materializes module nodes and their jack fan-in/fan-out edges.
  instances.forEach(instance => {
    const module = moduleLookup.get(instance.moduleId);
    if (!module) {
      return;
    }
    
    const moduleNodeId = buildModuleNodeId(module.id, instance.instanceId);
    const sameModuleInstances = instancesByModule.get(instance.moduleId) ?? [];
    const instanceNumber = instanceOrderByKey.get(moduleInstanceKey(instance.moduleId, instance.instanceId)) ?? 1;
    const moduleLabel = sameModuleInstances.length > 1
      ? `${ module.name } (${ instanceNumber })`
      : module.name;
    
    const moduleNode: GraphNode = {
      id: moduleNodeId,
      label: moduleLabel,
      color: palette.moduleColor,
      size: sizeConstant * 3.75,
      x: 1,
      y: 1,
      data: {
        type: PATCH_GRAPH_NODE_TYPE.MODULE,
        module,
        moduleNodeId
      }
    };
    
    nodesDictionary[moduleNode.id] = moduleNode;
    
    const outNodes: GraphNode[] = module.outs.map(jack => ({
      id: moduleNodeId + jack.id,
      color: palette.cvOutColor,
      size: sizeConstant * 2.5,
      x: 1,
      y: 1,
      label: `${ jack.name }`,
      data: {
        type: PATCH_GRAPH_NODE_TYPE.CV_OUT,
        module,
        parentModuleNodeId: moduleNodeId
      }
    }));
    
    const inNodes: GraphNode[] = module.ins.map(jack => ({
      id: moduleNodeId + jack.id,
      color: palette.cvInColor,
      size: sizeConstant * 2.5,
      x: 1,
      y: 1,
      label: `${ jack.name }`,
      data: {
        type: PATCH_GRAPH_NODE_TYPE.CV_IN,
        module,
        parentModuleNodeId: moduleNodeId
      }
    }));
    
    outNodes.forEach(node => allModuleJackNodes[node.id] = node);
    inNodes.forEach(node => allModuleJackNodes[node.id] = node);
    
    const insEdges: GraphEdge[] = inNodes.map(node => ({
      id: node.id,
      from: node.id,
      to: moduleNodeId,
      label: '',
      color: palette.moduleJackEdgeColor,
      size: sizeConstant * 1.15,
      weight: 8,
      type: 'arrow',
      data: {
        stage: PATCH_GRAPH_EDGE_STAGE.CV_IN_TO_MODULE
      }
    }));
    
    const outsEdges: GraphEdge[] = outNodes.map(node => ({
      id: node.id,
      from: moduleNodeId,
      to: node.id,
      label: '',
      color: palette.moduleJackEdgeColor,
      size: sizeConstant * 1.15,
      weight: 8,
      type: 'arrow',
      data: {
        stage: PATCH_GRAPH_EDGE_STAGE.MODULE_TO_CV_OUT
      }
    }));
    
    insEdges.forEach(edge => allModuleJackEdges[edge.id] = edge);
    outsEdges.forEach(edge => allModuleJackEdges[edge.id] = edge);
  });
  
  // Second pass ensures connection endpoint CV nodes exist even when module data is partial.
  connections.forEach(connection => {
    const moduleNodeIdA = buildModuleNodeId(connection.a.module.id, connection.instance_id_a);
    const moduleNodeIdB = buildModuleNodeId(connection.b.module.id, connection.instance_id_b);
    
    const cvNodeIdA = buildCvNodeId(connection.a.module.id, connection.instance_id_a, connection.a.id);
    if (!nodesDictionary[cvNodeIdA]) {
      nodesDictionary[cvNodeIdA] = allModuleJackNodes[cvNodeIdA]
        ?? buildCvNode(
          cvNodeIdA,
          connection.a,
          palette.cvOutColor,
          sizeConstant,
          moduleNodeIdA,
          PATCH_GRAPH_NODE_TYPE.CV_OUT
        );
    }
    
    const cvNodeIdB = buildCvNodeId(connection.b.module.id, connection.instance_id_b, connection.b.id);
    if (!nodesDictionary[cvNodeIdB]) {
      nodesDictionary[cvNodeIdB] = allModuleJackNodes[cvNodeIdB]
        ?? buildCvNode(
          cvNodeIdB,
          connection.b,
          palette.cvInColor,
          sizeConstant,
          moduleNodeIdB,
          PATCH_GRAPH_NODE_TYPE.CV_IN
        );
    }
  });
  
  // Patch cables keep duplicate routes distinct via per-route occurrence suffixes.
  const routeOccurrenceByKey = new Map<string, number>();
  const patchEdges: GraphEdge[] = connections.map(connection => {
    const from = buildCvNodeId(connection.a.module.id, connection.instance_id_a, connection.a.id);
    const to = buildCvNodeId(connection.b.module.id, connection.instance_id_b, connection.b.id);
    const routeKey = `${ from }->${ to }`;
    const occurrence = (routeOccurrenceByKey.get(routeKey) ?? 0) + 1;
    routeOccurrenceByKey.set(routeKey, occurrence);
    
    return {
      id: `patch:${ routeKey }#${ occurrence }`,
      from,
      to,
      type: 'arrow',
      color: palette.patchCableBaseColor,
      size: sizeConstant * 1.85,
      weight: 1.2,
      x: 1,
      y: 1,
      label: `${ connection.notes ?? '' }`,
      data: {
        stage: PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN
      }
    };
  });
  
  // Hidden module-bridge edges provide structure for staged reveal without cluttering final view.
  const moduleBridgeEdgeMap = new Map<string, GraphEdge>();
  connections.forEach(connection => {
    const moduleFrom = buildModuleNodeId(connection.a.module.id, connection.instance_id_a);
    const moduleTo = buildModuleNodeId(connection.b.module.id, connection.instance_id_b);
    
    if (moduleFrom === moduleTo) {
      return;
    }
    
    const key = `${ moduleFrom }->${ moduleTo }`;
    if (moduleBridgeEdgeMap.has(key)) {
      return;
    }
    
    moduleBridgeEdgeMap.set(key, {
      id: `module-bridge:${ key }`,
      from: moduleFrom,
      to: moduleTo,
      label: '',
      color: PATCH_GRAPH_HIDDEN_COLOR,
      size: sizeConstant * 1.45,
      weight: 0.15,
      type: 'arrow',
      data: {
        stage: PATCH_GRAPH_EDGE_STAGE.MODULE_BRIDGE,
        hidden: true
      }
    });
  });
  
  const moduleBridgeEdges = Array.from(moduleBridgeEdgeMap.values());
  
  const usedCvNodeIds = new Set<string>();
  patchEdges.forEach(edge => {
    usedCvNodeIds.add(edge.from);
    usedCvNodeIds.add(edge.to);
  });
  
  // Keep only jack edges that are actually part of current patch connectivity.
  const onlyUsedModuleJacksEdges = Object.values(allModuleJackEdges)
    .filter(edge => usedCvNodeIds.has(edge.from) || usedCvNodeIds.has(edge.to));
  
  const orderedNodes = orderPatchGraphNodesForReveal(Object.values(nodesDictionary).filter(Boolean));
  const orderedEdges = [...moduleBridgeEdges, ...onlyUsedModuleJacksEdges, ...patchEdges];
  
  return {
    nodes: orderedNodes,
    edges: orderedEdges
  };
}

function buildCvNode(
  nodeId: string,
  cv: CVwithModule,
  color: string,
  sizeConstant: number,
  parentModuleNodeId: string,
  type: typeof PATCH_GRAPH_NODE_TYPE.CV_OUT | typeof PATCH_GRAPH_NODE_TYPE.CV_IN
): GraphNode {
  return {
    id: nodeId,
    label: `${ cv.name }`,
    color,
    size: sizeConstant * 2.0,
    x: 1,
    y: 1,
    data: {
      type,
      module: cv.module,
      parentModuleNodeId
    }
  };
}
