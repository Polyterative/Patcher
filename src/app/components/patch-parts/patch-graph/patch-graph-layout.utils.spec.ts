import { orderPatchGraphNodesForReveal } from './patch-graph-layout.utils';

const makeNode = (id: string, type: string, parentModuleNodeId?: string, label = id): any => ({
  id,
  label,
  data: { type, parentModuleNodeId }
});

describe('patch-graph-layout.utils', () => {
  describe('orderPatchGraphNodesForReveal', () => {
    it('returns empty array for empty input', () => {
      expect(orderPatchGraphNodesForReveal([])).toEqual([]);
    });

    it('places nodes in a circle when no modules exist', () => {
      const nodes = [makeNode('n1', 'cv-out'), makeNode('n2', 'cv-in')];
      const result = orderPatchGraphNodesForReveal(nodes);
      expect(result.length).toBe(2);
      result.forEach(n => {
        expect(typeof n.x).toBe('number');
        expect(typeof n.y).toBe('number');
      });
    });

    it('positions module nodes on a ring', () => {
      const nodes = [makeNode('m1', 'module'), makeNode('m2', 'module')];
      const result = orderPatchGraphNodesForReveal(nodes);
      expect(result.length).toBe(2);
      result.forEach(n => {
        expect(typeof n.x).toBe('number');
        expect(typeof n.y).toBe('number');
      });
    });

    it('places cv-out child nodes near their parent module', () => {
      const nodes = [
        makeNode('m1', 'module'),
        makeNode('cv1', 'cv-out', 'm1', 'Out 1')
      ];
      const result = orderPatchGraphNodesForReveal(nodes);
      const m1 = result.find(n => n.id === 'm1')!;
      const cv1 = result.find(n => n.id === 'cv1')!;
      expect(m1).toBeTruthy();
      expect(cv1).toBeTruthy();
      const dist = Math.sqrt((m1.x - cv1.x) ** 2 + (m1.y - cv1.y) ** 2);
      expect(dist).toBeLessThan(5);
    });

    it('preserves all nodes in output', () => {
      const nodes = [
        makeNode('m1', 'module'),
        makeNode('cv-out-1', 'cv-out', 'm1'),
        makeNode('cv-in-1', 'cv-in', 'm1')
      ];
      const result = orderPatchGraphNodesForReveal(nodes);
      expect(result.length).toBe(3);
    });
  });
});
