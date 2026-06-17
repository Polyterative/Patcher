import { discoveryTipRegistry } from './discovery-tip.registry';

describe('discoveryTipRegistry', () => {
  it('targets the search control for search-specific user-area tips', () => {
    const searchTips = discoveryTipRegistry.filter((tip) => tip.anchorId === 'user-area-search');

    expect(searchTips.length).toBeGreaterThan(0);
    searchTips.forEach((tip) => {
      expect(tip.placement?.targetKind).toBe('control');
    });
  });

  it('declares an introduction timestamp for every registered tip', () => {
    discoveryTipRegistry.forEach((tip) => {
      expect(tip.introducedAt).toBeTruthy();
      expect(Number.isNaN(new Date(tip.introducedAt).getTime())).toBeFalse();
    });
  });
});
