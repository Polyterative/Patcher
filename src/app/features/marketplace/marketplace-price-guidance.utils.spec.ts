import {
  buildMarketplacePriceGuidance
} from './marketplace-price-guidance.utils';

describe('marketplace price guidance', () => {
  it('picks the edited module row with whitelisted fields', () => {
    const guidance = buildMarketplacePriceGuidance([
      {moduleId: 9, displayPrice: '~€99', storeCount: 2, tooltip: 'Estimated recent market price.'},
      {
        moduleId: 101,
        displayPrice: '~€1,199',
        storeCount: 4,
        tooltip: 'Estimated recent market price: ~€1,199 from 4 stores.',
        extra: 'never copied'
      }
    ], 101);

    expect(guidance).toEqual({
      displayPrice: '~€1,199',
      moduleId: 101,
      storeCount: 4,
      tooltip: 'Estimated recent market price: ~€1,199 from 4 stores.'
    });
    expect(JSON.stringify(guidance)).not.toContain('extra');
  });

  it('returns null without a row for the edited module', () => {
    expect(buildMarketplacePriceGuidance([
      {moduleId: 9, displayPrice: '~€99', storeCount: 2, tooltip: null}
    ], 101)).toBeNull();
    expect(buildMarketplacePriceGuidance([], 101)).toBeNull();
  });

  it('returns null for blank prices and malformed input without throwing', () => {
    expect(buildMarketplacePriceGuidance([
      {moduleId: 101, displayPrice: '   ', storeCount: 3, tooltip: null}
    ], 101)).toBeNull();
    expect(buildMarketplacePriceGuidance(null, 101)).toBeNull();
    expect(buildMarketplacePriceGuidance('nope', 101)).toBeNull();
    expect(buildMarketplacePriceGuidance([{moduleId: 101}], 101)).toBeNull();
    expect(buildMarketplacePriceGuidance([{moduleId: '101', displayPrice: '~€1', storeCount: 1, tooltip: null}], 101)).toBeNull();
    expect(buildMarketplacePriceGuidance([
      {moduleId: 101, displayPrice: '~€1', storeCount: 1, tooltip: null}
    ], Number.NaN)).toBeNull();
  });
});
