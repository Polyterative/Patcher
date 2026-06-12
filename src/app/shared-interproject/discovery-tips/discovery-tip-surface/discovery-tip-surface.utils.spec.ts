import { estimateDiscoveryTipHeight, calculateDiscoveryTipPosition } from './discovery-tip-surface.utils';

describe('discovery-tip-surface.utils', () => {
  describe('estimateDiscoveryTipHeight', () => {
    it('returns a positive number', () => {
      expect(estimateDiscoveryTipHeight('Title', 'Body text here', 320)).toBeGreaterThan(0);
    });

    it('returns larger height for longer content', () => {
      const short = estimateDiscoveryTipHeight('T', 'B', 320);
      const long = estimateDiscoveryTipHeight('A very long title string', 'A very long body that wraps across many lines of text.', 320);
      expect(long).toBeGreaterThanOrEqual(short);
    });

    it('handles empty strings', () => {
      expect(estimateDiscoveryTipHeight('', '', 320)).toBeGreaterThan(0);
    });

    it('scales with wider tip width', () => {
      const narrow = estimateDiscoveryTipHeight('T', 'Body text that might wrap', 200);
      const wide = estimateDiscoveryTipHeight('T', 'Body text that might wrap', 400);
      expect(narrow).toBeGreaterThanOrEqual(wide);
    });
  });

  describe('calculateDiscoveryTipPosition', () => {
    const makeRect = (left: number, top: number, width: number, height: number) => ({
      left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON: () => {}
    } as DOMRect);

    it('returns object with left/top/side', () => {
      const anchor = makeRect(100, 50, 50, 30);
      const result = calculateDiscoveryTipPosition(anchor, 800, 600);
      expect(result.left).toBeDefined();
      expect(result.top).toBeDefined();
      expect(['above', 'below']).toContain(result.side);
    });

    it('places below when anchor is near top', () => {
      const anchor = makeRect(100, 10, 50, 30);
      const result = calculateDiscoveryTipPosition(anchor, 800, 600);
      expect(result.side).toBe('below');
    });

    it('places above when anchor is near bottom (>45% viewport height)', () => {
      const anchor = makeRect(100, 400, 50, 30);
      const result = calculateDiscoveryTipPosition(anchor, 800, 600);
      expect(result.side).toBe('above');
    });

    it('clamps left to be at least 16', () => {
      const anchor = makeRect(0, 10, 10, 10);
      const result = calculateDiscoveryTipPosition(anchor, 800, 600);
      expect(result.left).toBeGreaterThanOrEqual(16);
    });

    it('left does not exceed viewport width minus tipWidth minus 16', () => {
      const anchor = makeRect(750, 10, 50, 30);
      const result = calculateDiscoveryTipPosition(anchor, 800, 600);
      expect(result.left).toBeLessThanOrEqual(800 - 16);
    });

    it('uses measured tip height when available', () => {
      const anchor = makeRect(100, 520, 50, 30);
      const result = calculateDiscoveryTipPosition(
        anchor,
        800,
        600,
        'A title long enough to make the estimate taller',
        'A body long enough to wrap across several lines in the estimated fallback height.',
        {width: 320, height: 100}
      );

      expect(result.side).toBe('above');
      expect(result.top).toBe(406);
    });

    it('chooses the side where the measured tip fits', () => {
      const anchor = makeRect(100, 300, 50, 30);
      const result = calculateDiscoveryTipPosition(
        anchor,
        800,
        600,
        '',
        '',
        {width: 320, height: 100}
      );

      expect(result.side).toBe('below');
      expect(result.top).toBe(344);
    });

    it('keeps arrow aligned with the anchor when the tip is clamped', () => {
      const anchor = makeRect(760, 100, 40, 30);
      const result = calculateDiscoveryTipPosition(
        anchor,
        800,
        600,
        '',
        '',
        {width: 320, height: 100}
      );

      expect(result.left).toBe(464);
      expect(result.arrowLeft).toBe(302);
    });
  });
});
