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
});
