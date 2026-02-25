import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import {
  PATCH_GRAPH_EDGE_STAGE,
  PATCH_GRAPH_NODE_TYPE
} from '../patch-graph/patch-graph.constants';
import { PatchGraphRevealController } from '../patch-graph/patch-graph-reveal.controller';


function node(
  id: string,
  type?: string,
  parentModuleNodeId?: string
): GraphNode {
  return {
    id,
    label: id,
    color: '#000',
    size: 1,
    x: 0,
    y: 0,
    data: {
      type,
      parentModuleNodeId
    }
  };
}

function edge(id: string, from: string, to: string, stage?: string): GraphEdge {
  return {
    id,
    label: '',
    from,
    to,
    color: '#000',
    size: 1,
    type: 'arrow',
    data: {
      stage
    }
  };
}


describe('PatchGraphRevealController', () => {
  it('emits empty arrays when reveal input is empty', () => {
    let nodesEmission: GraphNode[] | undefined;
    let edgesEmission: GraphEdge[] | undefined;
    
    const controller = new PatchGraphRevealController(
      {
        emitNodes: nodes => {
          nodesEmission = nodes;
        },
        emitEdges: edges => {
          edgesEmission = edges;
        },
        startFlow: () => {
          fail('startFlow should not be called for empty reveal');
        }
      },
      {stageBridgeColor: '#9fb4ca'}
    );
    
    controller.reveal([], []);
    
    expect(nodesEmission).toEqual([]);
    expect(edgesEmission).toEqual([]);
  });
  
  it('cancels pending staged reveal timers', fakeAsync(() => {
    let flowStartCount = 0;
    
    const controller = new PatchGraphRevealController(
      {
        emitNodes: () => undefined,
        emitEdges: () => undefined,
        startFlow: () => {
          flowStartCount += 1;
        }
      },
      {stageBridgeColor: '#9fb4ca'}
    );
    
    const nodes = [
      node('m1', PATCH_GRAPH_NODE_TYPE.MODULE),
      node('m1o', PATCH_GRAPH_NODE_TYPE.CV_OUT, 'm1'),
      node('m1i', PATCH_GRAPH_NODE_TYPE.CV_IN, 'm1')
    ];
    const edges = [
      edge('e1', 'm1', 'm1o', PATCH_GRAPH_EDGE_STAGE.MODULE_TO_CV_OUT),
      edge('e2', 'm1o', 'm1i', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN),
      edge('e3', 'm1i', 'm1', PATCH_GRAPH_EDGE_STAGE.CV_IN_TO_MODULE)
    ];
    
    controller.reveal(nodes, edges);
    controller.cancel();
    tick(2500);
    
    expect(flowStartCount).toBe(0);
  }));
  
  it('starts flow after staged reveal', fakeAsync(() => {
    let flowStartCount = 0;
    let latestFlowEdges: GraphEdge[] = [];
    
    const controller = new PatchGraphRevealController(
      {
        emitNodes: () => undefined,
        emitEdges: () => undefined,
        startFlow: (_visibleEdges, flowEdges) => {
          flowStartCount += 1;
          latestFlowEdges = flowEdges;
        }
      },
      {stageBridgeColor: '#9fb4ca'}
    );
    
    const nodes = [
      node('m1', PATCH_GRAPH_NODE_TYPE.MODULE),
      node('m1o', PATCH_GRAPH_NODE_TYPE.CV_OUT, 'm1'),
      node('m1i', PATCH_GRAPH_NODE_TYPE.CV_IN, 'm1')
    ];
    const edges = [
      edge('e1', 'm1', 'm1o', PATCH_GRAPH_EDGE_STAGE.MODULE_TO_CV_OUT),
      edge('e2', 'm1o', 'm1i', PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN),
      edge('e3', 'm1i', 'm1', PATCH_GRAPH_EDGE_STAGE.CV_IN_TO_MODULE)
    ];
    
    controller.reveal(nodes, edges);
    tick(2500);
    
    expect(flowStartCount).toBe(1);
    expect(latestFlowEdges.some(e => e.data?.stage === PATCH_GRAPH_EDGE_STAGE.CV_OUT_TO_CV_IN)).toBeTrue();
  }));
});