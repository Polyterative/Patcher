import { calculateDiscoveryTipPosition } from './discovery-tip-surface.component';


describe('calculateDiscoveryTipPosition', () => {
  function rect({
    left = 0,
    top = 0,
    width = 100,
    height = 40
  }: { left?: number; top?: number; width?: number; height?: number }): DOMRect {
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({})
    } as DOMRect;
  }

  it('keeps taller tips fully inside the viewport when shown below a low anchor', () => {
    const position = calculateDiscoveryTipPosition(
      rect({left: 120, top: 560, width: 120, height: 48}),
      1280,
      720,
      'Your patches are becoming a recall library',
      'Once you have a few saved, use names and notes consistently so old sessions are easy to reopen under pressure.'
    );

    expect(position.side).toBe('above');
    expect(position.top).toBeGreaterThanOrEqual(16);
  });

  it('clamps the tip horizontally within the viewport', () => {
    const position = calculateDiscoveryTipPosition(
      rect({left: 1180, top: 180, width: 120, height: 48}),
      1280,
      720,
      'Helpful tip',
      'Keep going.'
    );

    expect(position.left).toBeLessThanOrEqual(1280 - 320 - 16);
    expect(position.left).toBeGreaterThanOrEqual(16);
  });
});
