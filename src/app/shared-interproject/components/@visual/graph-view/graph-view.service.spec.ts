import { GraphViewService } from './graph-view.service';

describe('GraphViewService', () => {
  let service: GraphViewService;

  beforeEach(() => {
    service = new GraphViewService();
  });

  it('initialises selectedNode$ as undefined', () => {
    expect(service.selectedNode$.getValue()).toBeUndefined();
  });

  it('allows emitting a node', () => {
    const node: any = { id: 'n1', label: 'Node 1' };
    service.selectedNode$.next(node);
    expect(service.selectedNode$.getValue()).toBe(node);
  });

  it('allows clearing the selected node', () => {
    service.selectedNode$.next({ id: 'n1', label: 'test' } as any);
    service.selectedNode$.next(undefined);
    expect(service.selectedNode$.getValue()).toBeUndefined();
  });

  it('selectedNode$ is a BehaviorSubject — late subscriber receives current value', () => {
    const node: any = {id: 'n2', label: 'Node 2'};
    service.selectedNode$.next(node);
    let received: any;
    service.selectedNode$.subscribe(v => received = v);
    expect(received).toBe(node);
  });
});
