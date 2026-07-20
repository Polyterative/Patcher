import {
  hexToRgb,
  interpolateHexColor,
  baseColorForPatchGraphEdge
} from './patch-graph-flow.utils';
import { GraphEdge } from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';

const makePalette = () => ({
  flowBaseColor: '#ff0000',
  moduleJackEdgeColor: '#0000ff'
});

const makeEdge = (data: Record<string, unknown> = {}): GraphEdge => ({
  id: 'e1',
  from: 'a',
  to: 'b',
  label: '',
  color: '#ffffff',
  size: 1,
  type: 'arrow',
  data
});

describe('patch-graph-flow.utils', () => {
  describe('hexToRgb', () => {
    it('converts 6-char hex', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('converts 3-char shorthand hex', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('works without hash prefix', () => {
      expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('converts black', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('converts white', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('interpolateHexColor', () => {
    it('returns from-color at t=0', () => {
      expect(interpolateHexColor('#ff0000', '#0000ff', 0)).toBe('rgb(255, 0, 0)');
    });

    it('returns to-color at t=1', () => {
      expect(interpolateHexColor('#ff0000', '#0000ff', 1)).toBe('rgb(0, 0, 255)');
    });

    it('clamps t below 0', () => {
      expect(interpolateHexColor('#ff0000', '#0000ff', -1)).toBe('rgb(255, 0, 0)');
    });

    it('clamps t above 1', () => {
      expect(interpolateHexColor('#ff0000', '#0000ff', 2)).toBe('rgb(0, 0, 255)');
    });

    it('returns midpoint at t=0.5', () => {
      expect(interpolateHexColor('#000000', '#ffffff', 0.5)).toBe('rgb(128, 128, 128)');
    });
  });

  describe('baseColorForPatchGraphEdge', () => {
    const palette = makePalette();

    it('returns base flow color for normal edge', () => {
      const edge = makeEdge();
      expect(baseColorForPatchGraphEdge(edge, palette)).toBe(palette.flowBaseColor);
    });

    it('returns hidden color for hidden edge', () => {
      const edge = makeEdge({ hidden: true });
      const result = baseColorForPatchGraphEdge(edge, palette);
      expect(typeof result).toBe('string');
      expect(result).not.toBe(palette.flowBaseColor);
    });

    it('returns moduleJackEdgeColor for MODULE_TO_CV_OUT stage', () => {
      const edge = makeEdge({ stage: 'module-to-cv-out' });
      expect(baseColorForPatchGraphEdge(edge, palette)).toBe(palette.moduleJackEdgeColor);
    });
  });
});
