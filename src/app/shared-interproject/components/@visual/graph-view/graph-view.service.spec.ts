import { GraphViewService } from './graph-view.service';
import { GraphNode } from './graph.component';

function graphNode(id: string, label: string): GraphNode {
  return {
    id,
    label,
    size: 1,
    color: '#ffffff',
    x: 0,
    y: 0
  };
}

describe('GraphViewService', () => {
  let service: GraphViewService;

  beforeEach(() => {
    service = new GraphViewService();
  });

  it('initialises selectedNode$ as undefined', () => {
    expect(service.selectedNode$.getValue()).toBeUndefined();
  });

  it('allows emitting a node', () => {
    const node = graphNode('n1', 'Node 1');
    service.selectedNode$.next(node);
    expect(service.selectedNode$.getValue()).toBe(node);
  });

  it('allows clearing the selected node', () => {
    service.selectedNode$.next(graphNode('n1', 'test'));
    service.selectedNode$.next(undefined);
    expect(service.selectedNode$.getValue()).toBeUndefined();
  });

  it('selectedNode$ is a BehaviorSubject — late subscriber receives current value', () => {
    const node = graphNode('n2', 'Node 2');
    service.selectedNode$.next(node);
    let received: GraphNode | undefined;
    service.selectedNode$.subscribe(v => received = v);
    expect(received).toBe(node);
  });
});
