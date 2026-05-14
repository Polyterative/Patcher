import {
  buildCurvedSignalPath,
  buildSignalOverlayFrame,
  withAlpha,
  resolveRowPowerPanelPlacement,
  resolveSignalHoverCardPlacement
} from './rack-visual-model.utils';

const makeRect = (left: number, top: number, width: number, height: number) => ({
  left, top, right: left + width, bottom: top + height, width, height,
  centerX: left + width / 2, centerY: top + height / 2
} as any);

const makeDOMRect = (left: number, top: number, width: number, height: number) => ({
  left, top, right: left + width, bottom: top + height, width, height, x: left, y: top
} as DOMRect);

describe('rack-visual-model.utils', () => {
  describe('buildCurvedSignalPath', () => {
    it('returns a valid SVG path string starting with M', () => {
      const src = makeRect(0, 0, 50, 50);
      const dst = makeRect(100, 0, 50, 50);
      const path = buildCurvedSignalPath(src, dst);
      expect(path).toMatch(/^M\s/);
      expect(path).toContain('C');
    });

    it('handles reversed direction (dst left of src)', () => {
      const src = makeRect(100, 0, 50, 50);
      const dst = makeRect(0, 0, 50, 50);
      const path = buildCurvedSignalPath(src, dst);
      expect(path).toBeTruthy();
    });
  });

  describe('buildSignalOverlayFrame', () => {
    it('calculates relative position correctly', () => {
      const screenRect = makeDOMRect(50, 30, 200, 150);
      const hostRect = makeDOMRect(20, 10, 400, 400);
      const frame = buildSignalOverlayFrame(screenRect, hostRect);
      expect(frame.left).toBe(30);
      expect(frame.top).toBe(20);
      expect(frame.width).toBe(200);
      expect(frame.height).toBe(150);
    });
  });

  describe('withAlpha', () => {
    it('converts #hex to rgba with alpha', () => {
      const result = withAlpha('#ff0000', 0.5);
      expect(result).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('handles shorthand 3-char hex', () => {
      const result = withAlpha('#f00', 1);
      expect(result).toBe('rgba(255, 0, 0, 1)');
    });

    it('handles hex without #', () => {
      const result = withAlpha('00ff00', 0.8);
      expect(result).toBe('rgba(0, 255, 0, 0.8)');
    });
  });

  describe('resolveRowPowerPanelPlacement', () => {
    it('returns above when null elements', () => {
      expect(resolveRowPowerPanelPlacement(null, null, 100)).toBe('above');
    });

    it('returns below when no space above', () => {
      const viewport = { getBoundingClientRect: () => makeDOMRect(0, 0, 800, 600) } as any;
      const row = { getBoundingClientRect: () => makeDOMRect(0, 10, 800, 30) } as any;
      expect(resolveRowPowerPanelPlacement(viewport, row, 200)).toBe('below');
    });
  });

  describe('resolveSignalHoverCardPlacement', () => {
    it('returns right when null elements', () => {
      expect(resolveSignalHoverCardPlacement(null, null, 200, 8)).toBe('right');
    });

    it('returns right by default when space available', () => {
      const viewport = { getBoundingClientRect: () => makeDOMRect(0, 0, 800, 600) } as any;
      const module = { getBoundingClientRect: () => makeDOMRect(0, 0, 100, 50) } as any;
      expect(resolveSignalHoverCardPlacement(module, viewport, 200, 8)).toBe('right');
    });
  });
});
