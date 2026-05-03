export interface TouchInteractionEnvironment {
  matchMedia?: (query: string) => {matches: boolean};
  maxTouchPoints?: number;
}

export function prefersTouchInteraction(environment: TouchInteractionEnvironment = {}): boolean {
  const maxTouchPoints = environment.maxTouchPoints
    ?? (typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0);

  if (maxTouchPoints > 0) {
    return true;
  }

  const matchMedia = environment.matchMedia
    ?? (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia.bind(window)
      : null);

  if (!matchMedia) {
    return false;
  }

  return matchMedia('(hover: none), (pointer: coarse)').matches
    || matchMedia('(any-hover: none), (any-pointer: coarse)').matches;
}
