import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import { renderPatchGraphSvg } from './patch-graph-svg.utils';

const node = (overrides: Partial<GraphNode> = {}): GraphNode => ({
  id: 'module-1',
  label: 'Oscillator',
  color: '#5577aa',
  size: 12,
  x: 0,
  y: 0,
  ...overrides
});

const edge = (overrides: Partial<GraphEdge> = {}): GraphEdge => ({
  id: 'edge-1',
  from: 'module-1',
  to: 'cv-1',
  label: 'pitch',
  color: '#ff55aa',
  size: 4,
  type: 'arrow',
  ...overrides
});

describe('patch-graph-svg.utils', () => {
  describe('renderPatchGraphSvg', () => {
    it('returns deterministic output for the same graph', () => {
      const graph = {
        nodes: [node(), node({id: 'cv-1', label: 'V/OCT', x: 1, y: 0.5, size: 8})],
        edges: [edge()]
      };

      expect(renderPatchGraphSvg(graph)).toBe(renderPatchGraphSvg(graph));
    });

    it('renders a self-contained svg with a viewBox, nodes, edges, and labels', () => {
      const svg = renderPatchGraphSvg({
        nodes: [node(), node({id: 'cv-1', label: 'V/OCT', x: 1, y: 0.5, size: 8})],
        edges: [edge()]
      });

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="');
      expect(svg).toContain('<g data-edge-index="0" data-edge-id="edge-1"');
      expect(svg).toContain('<polygon points="');
      expect(svg).toContain('<circle cx="0" cy="0"');
      expect(svg).toContain('Oscillator');
      expect(svg).toContain('V/OCT');
      expect(svg).toContain('<title>pitch</title>');
    });

    it('escapes text and attribute content', () => {
      const svg = renderPatchGraphSvg({
        nodes: [
          node({
            id: 'module-&-1',
            label: `Osc & <Noise> "A" 'B'`,
            color: '#5577aa'
          }),
          node({id: 'cv-1', label: 'Out', x: 1})
        ],
        edges: [edge({
          id: 'edge-&-1',
          from: 'module-&-1',
          label: `route & <main> "A" 'B'`
        })]
      });

      expect(svg).toContain('data-node-id="module-&amp;-1"');
      expect(svg).toContain('data-edge-id="edge-&amp;-1"');
      expect(svg).toContain('Osc &amp; &lt;Noise&gt; &quot;A&quot; &apos;B&apos;');
      expect(svg).toContain('route &amp; &lt;main&gt; &quot;A&quot; &apos;B&apos;');
    });

    it('renders an empty fallback for empty or invalid node data', () => {
      const svg = renderPatchGraphSvg({
        nodes: [node({x: Number.NaN})],
        edges: [edge()]
      });

      expect(svg).toContain('viewBox="0 0 100 100"');
      expect(svg).toContain('No patch graph data');
      expect(svg).not.toContain('<line');
    });

    it('skips edges with missing endpoints and hidden edges', () => {
      const svg = renderPatchGraphSvg({
        nodes: [node(), node({id: 'cv-1', label: 'Out', x: 1})],
        edges: [
          edge({id: 'visible'}),
          edge({id: 'missing-endpoint', to: 'missing'}),
          edge({id: 'hidden', data: {hidden: true}})
        ]
      });

      expect(svg).toContain('data-edge-id="visible"');
      expect(svg).not.toContain('missing-endpoint');
      expect(svg).not.toContain('data-edge-id="hidden"');
    });

    it('expands the viewBox to account for long labels', () => {
      const svg = renderPatchGraphSvg({
        nodes: [
          node({label: 'A very long oscillator label that needs horizontal room'}),
          node({id: 'cv-1', label: 'Out', x: 1})
        ],
        edges: [edge()]
      });

      const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(' ').map(Number) ?? [];
      expect(viewBox[0]).toBeLessThan(-200);
      expect(viewBox[2]).toBeGreaterThan(400);
    });
  });
});
