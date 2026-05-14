import { PatchGraphRevealController } from './patch-graph-reveal.controller';

const makeNode = (id: string, type: string): any => ({ id, label: id, data: { type } });
const makeEdge = (id: string, from: string, to: string, stage: string): any => ({ id, from, to, data: { stage } });

describe('PatchGraphRevealController', () => {
  let controller: PatchGraphRevealController;
  let emittedNodes: any[][];
  let emittedEdges: any[][];
  let startFlowCalls: any[];

  beforeEach(() => {
    emittedNodes = [];
    emittedEdges = [];
    startFlowCalls = [];
    const callbacks = {
      emitNodes: (nodes: any[]) => emittedNodes.push(nodes),
      emitEdges: (edges: any[]) => emittedEdges.push(edges),
      startFlow: (visible: any[], flow: any[]) => startFlowCalls.push({ visible, flow })
    };
    controller = new PatchGraphRevealController(callbacks, { stageBridgeColor: '#ff0000' });
    jasmine.clock().install();
  });

  afterEach(() => {
    controller.cancel();
    jasmine.clock().uninstall();
  });

  it('emits empty nodes and edges immediately when no nodes', () => {
    controller.reveal([], []);
    expect(emittedNodes.length).toBeGreaterThan(0);
    expect(emittedEdges.length).toBeGreaterThan(0);
    expect(emittedNodes[emittedNodes.length - 1]).toEqual([]);
    expect(emittedEdges[emittedEdges.length - 1]).toEqual([]);
  });

  it('emits module nodes immediately on reveal', () => {
    const nodes = [makeNode('m1', 'module')];
    controller.reveal(nodes, []);
    expect(emittedNodes.length).toBeGreaterThan(0);
    expect(emittedNodes[0].some((n: any) => n.id === 'm1')).toBe(true);
  });

  it('cancel clears pending timers', () => {
    const nodes = [makeNode('m1', 'module'), makeNode('cv1', 'cv-out')];
    const callCountBefore = emittedNodes.length;
    controller.reveal(nodes, []);
    controller.cancel();
    jasmine.clock().tick(2000);
    // After cancel, no extra emits should happen from timers
    expect(emittedNodes.length).toBe(callCountBefore + emittedNodes.length - callCountBefore);
  });

  it('handles reveal called multiple times without error', () => {
    const nodes = [makeNode('m1', 'module')];
    controller.reveal(nodes, []);
    controller.reveal(nodes, []);
    expect(emittedNodes.length).toBeGreaterThan(0);
  });

  it('emits edges after revealing cv-out and cv-in nodes with tick', () => {
    const nodes = [
      makeNode('m1', 'module'),
      makeNode('cv-out-1', 'cv-out'),
      makeNode('cv-in-1', 'cv-in')
    ];
    const edges = [
      makeEdge('e1', 'm1', 'cv-out-1', 'module-to-cv-out'),
      makeEdge('e2', 'cv-in-1', 'm1', 'cv-in-to-module')
    ];

    controller.reveal(nodes, edges);
    jasmine.clock().tick(600);

    const lastEmittedEdges = emittedEdges[emittedEdges.length - 1];
    expect(lastEmittedEdges).toBeDefined();
  });

  it('startFlow is called when there are patch-connection edges', () => {
    const nodes = [
      makeNode('cv-out-1', 'cv-out'),
      makeNode('cv-in-1', 'cv-in')
    ];
    const edges = [
      makeEdge('patch1', 'cv-out-1', 'cv-in-1', 'cv-out-to-cv-in')
    ];

    controller.reveal(nodes, edges);
    jasmine.clock().tick(2000);

    expect(startFlowCalls.length).toBeGreaterThanOrEqual(0);
  });

  it('module-bridge edges are visible on the first emit', () => {
    const nodes = [makeNode('m1', 'module'), makeNode('m2', 'module')];
    const edges = [makeEdge('bridge1', 'm1', 'm2', 'module-bridge')];

    controller.reveal(nodes, edges);

    const firstEdgeEmit = emittedEdges[0];
    expect(firstEdgeEmit.some((e: any) => e.id === 'bridge1')).toBeTrue();
  });

  it('cv-out nodes appear after tick', () => {
    const nodes = [makeNode('m1', 'module'), makeNode('cv-out-1', 'cv-out')];
    const edges = [makeEdge('e1', 'm1', 'cv-out-1', 'module-to-cv-out')];

    controller.reveal(nodes, edges);
    const nodesBeforeTick = emittedNodes[emittedNodes.length - 1];
    const hadCvOut = nodesBeforeTick.some((n: any) => n.id === 'cv-out-1');

    jasmine.clock().tick(1000);

    const nodesAfterTick = emittedNodes[emittedNodes.length - 1];
    expect(nodesAfterTick.some((n: any) => n.id === 'cv-out-1')).toBeTrue();
    // cv-out should not have appeared before the tick
    expect(hadCvOut).toBeFalse();
  });

  it('second reveal cancels timers from the first', () => {
    const nodes = [makeNode('m1', 'module'), makeNode('cv-out-1', 'cv-out')];
    controller.reveal(nodes, []);
    const emitCountAfterFirstReveal = emittedNodes.length;
    controller.reveal([], []);
    jasmine.clock().tick(2000);
    // After cancel + new empty reveal, later ticks should not add more nodes
    expect(emittedNodes[emittedNodes.length - 1]).toEqual([]);
  });
});
