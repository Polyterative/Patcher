import { discoveryTipRegistry } from './discovery-tip.registry';

describe('discoveryTipRegistry', () => {
  it('targets the search control for search-specific user-area tips', () => {
    const searchTips = discoveryTipRegistry.filter((tip) => tip.anchorId === 'user-area-search');

    expect(searchTips.length).toBeGreaterThan(0);
    searchTips.forEach((tip) => {
      expect(tip.placement?.targetKind).toBe('control');
    });
  });
});
