import { prefersTouchInteraction } from './touch-interaction.utils';

describe('touchInteractionUtils', () => {
  it('prefers touch interaction when the device reports touch points', () => {
    expect(prefersTouchInteraction({
      maxTouchPoints: 5,
      matchMedia: () => ({matches: false})
    })).toBeTrue();
  });

  it('prefers touch interaction when coarse pointer media queries match', () => {
    expect(prefersTouchInteraction({
      maxTouchPoints: 0,
      matchMedia: (query: string) => ({
        matches: query.includes('pointer: coarse')
      })
    })).toBeTrue();
  });

  it('falls back to non-touch interaction when neither touch signal is present', () => {
    expect(prefersTouchInteraction({
      maxTouchPoints: 0,
      matchMedia: () => ({matches: false})
    })).toBeFalse();
  });
});
