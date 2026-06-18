import {
  DEFAULT_AUTH_RETURN_URL,
  normalizeInternalReturnUrl
} from './safe-return-url';


describe('normalizeInternalReturnUrl', () => {
  it('keeps normalized same-origin app paths', () => {
    expect(normalizeInternalReturnUrl('/modules/browser?query=1#rack')).toBe('/modules/browser?query=1#rack');
    expect(normalizeInternalReturnUrl('modules/browser')).toBe('/modules/browser');
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(normalizeInternalReturnUrl('https://evil.example/path')).toBe(DEFAULT_AUTH_RETURN_URL);
    expect(normalizeInternalReturnUrl('//evil.example/path')).toBe(DEFAULT_AUTH_RETURN_URL);
  });

  it('rejects non-string, empty, and malformed values', () => {
    expect(normalizeInternalReturnUrl(null)).toBe(DEFAULT_AUTH_RETURN_URL);
    expect(normalizeInternalReturnUrl('   ')).toBe(DEFAULT_AUTH_RETURN_URL);
    expect(normalizeInternalReturnUrl('/\\evil')).toBe(DEFAULT_AUTH_RETURN_URL);
  });
});
