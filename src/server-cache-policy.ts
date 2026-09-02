export const NO_STORE_CACHE_CONTROL = 'no-store, max-age=0';

const HASHED_SCRIPT_OR_STYLE = /-[A-Za-z0-9]{8}\.(?:js|css)$/i;
const SCRIPT_OR_STYLE = /\.(?:js|css)$/i;

export function getStaticAssetCacheControl(filePath: string): string | undefined {
  if (filePath.endsWith('.html')) {
    return NO_STORE_CACHE_CONTROL;
  }

  if (SCRIPT_OR_STYLE.test(filePath) && !HASHED_SCRIPT_OR_STYLE.test(filePath)) {
    return NO_STORE_CACHE_CONTROL;
  }

  return undefined;
}
