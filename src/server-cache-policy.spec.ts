import {
  NO_STORE_CACHE_CONTROL,
  getStaticAssetCacheControl
} from './server-cache-policy';

describe('server cache policy', () => {
  it('does not cache HTML entry documents', () => {
    expect(getStaticAssetCacheControl('/browser/index.csr.html')).toBe(NO_STORE_CACHE_CONTROL);
  });

  it('keeps hash-named scripts and styles eligible for the static one-year cache', () => {
    expect(getStaticAssetCacheControl('/browser/main-A1B2C3D4.js')).toBeUndefined();
    expect(getStaticAssetCacheControl('/browser/styles-a1B2c3D4.css')).toBeUndefined();
  });

  it('does not long-cache unhashed scripts or styles', () => {
    expect(getStaticAssetCacheControl('/browser/runtime.js')).toBe(NO_STORE_CACHE_CONTROL);
    expect(getStaticAssetCacheControl('/browser/styles.css')).toBe(NO_STORE_CACHE_CONTROL);
  });
});
