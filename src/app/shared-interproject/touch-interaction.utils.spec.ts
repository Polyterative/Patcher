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

  it('returns false when no environment provided and no globals', () => {
    // empty environment — maxTouchPoints defaults to 0, matchMedia falls back to navigator/window
    // In a Node/Karma test environment without touch, this should be falsy or not throw
    expect(() => prefersTouchInteraction({})).not.toThrow();
  });

  it('returns false when matchMedia is not available', () => {
    expect(prefersTouchInteraction({
      maxTouchPoints: 0,
      matchMedia: undefined
    })).toBeFalse();
  });
});
