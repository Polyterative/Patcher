export const DEFAULT_AUTH_RETURN_URL = '/user/area';

const FALLBACK_ORIGIN = 'https://patcher.local';

function getCurrentOrigin(): string {
  return typeof window === 'undefined'
    ? FALLBACK_ORIGIN
    : window.location.origin;
}

export function normalizeInternalReturnUrl(
  returnUrl: unknown,
  fallback = DEFAULT_AUTH_RETURN_URL
): string {
  if (typeof returnUrl !== 'string') {
    return fallback;
  }

  const trimmed = returnUrl.trim();
  if (!trimmed || trimmed.includes('\\') || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    return fallback;
  }

  const origin = getCurrentOrigin();

  try {
    const parsed = new URL(trimmed, origin);
    if (parsed.origin !== origin) {
      return fallback;
    }

    return `${ parsed.pathname }${ parsed.search }${ parsed.hash }` || fallback;
  } catch {
    return fallback;
  }
}
