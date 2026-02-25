import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import {
  PATCH_GRAPH_EDGE_STAGE,
  PATCH_GRAPH_HIDDEN_COLOR,
  PATCH_GRAPH_NODE_TYPE
} from './patch-graph.constants';


export interface PatchGraphRevealCallbacks {
  emitNodes(nodes: GraphNode[]): void;
  
  emitEdges(edges: GraphEdge[]): void;
  
  startFlow(visibleEdges: GraphEdge[], flowEdges: GraphEdge[]): void;
}

export interface PatchGraphRevealConfig {
  stageBridgeColor: string;
}

export class PatchGraphRevealController {
  private revealTimers: ReturnType<typeof setTimeout>[] = [];
  private revealRunId = 0;
  
  constructor(
    private readonly callbacks: PatchGraphRevealCallbacks,
    private readonly config: PatchGraphRevealConfig
  ) {
  }
  
  reveal(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.cancel();
    this.revealRunId++;
    const runId = this.revealRunId;
    
    if (nodes.length === 0) {
      this.callbacks.emitNodes([]);
      this.callbacks.emitEdges([]);
      return;
    }
    
    const modules = nodes.filter(node => node.data?.type === PATCH_GRAPH_NODE_TYPE.MODULE);
    const cvOutNodes = nodes.filter(node => node.data?.type === PATCH_GRAPH_NODE_TYPE.CV_OUT);
    const cvInNodes = nodes.filter(node => node.data?.type === PATCH_GRAPH_NODE_TYPE.CV_IN);
    const remainingNodes = nodes.filter(node =>
      node.data?.type !== PATCH_GRAPH_NODE_TYPE.MODULE
      && node.data?.type !== PATCH_GRAPH_NODE_TYPE.CV_OUT
      && node.data?.type !== PATCH_GRAPH_NODE_TYPE.CV_IN
    );
    const visibleNodes: GraphNode[] = [...modules];
    const visibleNodeIds = new Set<string>();
    modules.forEach(node => visibleNodeIds.add(node.id));
    
    const nodeIds = new Set(nodes.map(node => node.id));
    const revealableEdges = edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));
    const moduleBridgeEdges = revealableEdges.filter(edge => edge.data?.stage === PATCH_GRAPH_EDGE_STAGE.MODULE_BRIDGE);
    const moduleToCvOutEdges = revealableEdges.filter(edge => edge.data?.stage === PATCH_GRAPH_EDGE_STAGE.MODULE_TO_CV_OUT);
    const cvInToModuleEdges = revealableEdges.filter(edge => edge.data?.stage === PATCH_GRAPH_EDGE_STAGE.CV_IN_TO_MODULE);
    const patchConnectionEdges = revealableEdges.filter(edge => edge.data?.stage === PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN);
    const remainingEdges = revealableEdges.filter(edge =>
      edge.data?.stage !== PATCH_GRAPH_EDGE_STAGE.MODULE_BRIDGE
      && edge.data?.stage !== PATCH_GRAPH_EDGE_STAGE.MODULE_TO_CV_OUT
      && edge.data?.stage !== PATCH_GRAPH_EDGE_STAGE.CV_IN_TO_MODULE
      && edge.data?.stage !== PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN
    );
    
    const edgeStageDelayMs = 420;
    const stageDelayMs = 480;
    const visibleEdges: GraphEdge[] = [];
    const visibleEdgeIds = new Set<string>();
    
    moduleBridgeEdges
      .filter(edge => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to))
      .forEach(edge => {
        visibleEdges.push({
          ...edge,
          color: this.config.stageBridgeColor,
          data: {
            ...(edge.data ?? {}),
            hidden: false
          }
        });
        visibleEdgeIds.add(edge.id);
      });
    
    this.callbacks.emitNodes([...visibleNodes]);
    this.callbacks.emitEdges([...visibleEdges]);
    
    let layerStartDelay = 0;
    const revealLayer = (layerNodes: GraphNode[], layerEdges: GraphEdge[], delayMs: number) => {
      layerStartDelay += delayMs;
      const timer = setTimeout(() => {
        if (runId !== this.revealRunId) {
          return;
        }
        
        let changed = false;
        layerNodes.forEach(node => {
          if (visibleNodeIds.has(node.id)) {
            return;
          }
          
          visibleNodes.push(node);
          visibleNodeIds.add(node.id);
          changed = true;
        });
        
        layerEdges.forEach(edge => {
          if (visibleEdgeIds.has(edge.id)) {
            return;
          }
          if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) {
            return;
          }
          
          visibleEdges.push(edge);
          visibleEdgeIds.add(edge.id);
          changed = true;
        });
        
        if (changed) {
          this.callbacks.emitNodes([...visibleNodes]);
          this.callbacks.emitEdges([...visibleEdges]);
        }
      }, layerStartDelay);
      
      this.revealTimers.push(timer);
    };
    
    const hideModuleBridgeEdges = (): boolean => {
      let changed = false;
      for (let index = 0; index < visibleEdges.length; index++) {
        const edge = visibleEdges[index];
        if (edge.data?.stage !== PATCH_GRAPH_EDGE_STAGE.MODULE_BRIDGE) {
          continue;
        }
        if (edge.data?.hidden) {
          continue;
        }
        
        visibleEdges[index] = {
          ...edge,
          color: PATCH_GRAPH_HIDDEN_COLOR,
          data: {
            ...(edge.data ?? {}),
            hidden: true
          }
        };
        changed = true;
      }
      
      return changed;
    };
    
    revealLayer(cvOutNodes, moduleToCvOutEdges, stageDelayMs);
    revealLayer([...cvInNodes, ...remainingNodes], [...cvInToModuleEdges, ...remainingEdges], stageDelayMs);
    
    layerStartDelay += edgeStageDelayMs;
    const patchRoutingTimer = setTimeout(() => {
      if (runId !== this.revealRunId) {
        return;
      }
      
      let changed = false;
      patchConnectionEdges.forEach(edge => {
        if (visibleEdgeIds.has(edge.id)) {
          return;
        }
        if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) {
          return;
        }
        
        visibleEdges.push(edge);
        visibleEdgeIds.add(edge.id);
        changed = true;
      });
      
      if (hideModuleBridgeEdges()) {
        changed = true;
      }
      
      if (changed) {
        this.callbacks.emitEdges([...visibleEdges]);
      }
    }, layerStartDelay);
    this.revealTimers.push(patchRoutingTimer);
    
    const flowStartDelay = layerStartDelay + 260;
    const flowTimer = setTimeout(() => {
      if (runId !== this.revealRunId) {
        return;
      }
      
      const ioFlowEdges = [...moduleToCvOutEdges, ...patchConnectionEdges, ...cvInToModuleEdges];
      const flowEdges = ioFlowEdges.length > 0
        ? ioFlowEdges
        : revealableEdges.filter(edge => !edge.data?.hidden);
      
      this.callbacks.startFlow([...visibleEdges], flowEdges);
    }, flowStartDelay);
    this.revealTimers.push(flowTimer);
  }
  
  cancel(): void {
    this.revealRunId++;
    this.revealTimers.forEach(timer => clearTimeout(timer));
    this.revealTimers = [];
  }
}