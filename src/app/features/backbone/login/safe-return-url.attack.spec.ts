import {
  DEFAULT_AUTH_RETURN_URL,
  normalizeInternalReturnUrl
} from './safe-return-url';

/** Whatever comes out must be a same-origin path: starts with a single "/" and never "//". */
function expectSafeInternalPath(result: string, label: string): void {
  expect(result.startsWith('/')).withContext(`${label} -> ${result}`).toBeTrue();
  expect(result.startsWith('//')).withContext(`${label} -> ${result}`).toBeFalse();
  expect(new URL(result, window.location.origin).origin).withContext(`${label} -> ${result}`).toBe(window.location.origin);
}

describe('normalizeInternalReturnUrl — open-redirect attack corpus', () => {
  const attacks = [
    'https://evil.example',
    'http://evil.example/x',
    '//evil.example',
    '///evil.example',
    '////evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    '\\/evil.example',
    '/\\/evil.example',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'blob:https://evil.example/uuid',
    'ftp://evil.example',
    'ws://evil.example',
    '\t//evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r/evil.example',
    '\u0000//evil.example',
    '/\u0000/evil.example',
    '/\u007f/evil.example',
    'https:evil.example',
    'https:/evil.example',
    'https:\\\\evil.example',
    'https://good.example@evil.example',
    'https://evil.example\\@good.example',
    'https://evil.example#@good.example',
    '//evil.example@good.example',
    '/@evil.example',
    'mailto:a@b.c',
    'tel:123',
    'about:blank',
    '//evil.example:80',
    '//127.0.0.1',
    '//[::1]',
    '//2130706433',
    '/%5Cevil.example',
    '/%2F/evil.example'
  ];

  for (const attack of attacks) {
    it(`never returns an off-origin target for ${JSON.stringify(attack)}`, () => {
      const result = normalizeInternalReturnUrl(attack);
      expectSafeInternalPath(result, attack);
    });
  }

  describe('path-traversal forms that resolve to protocol-relative paths', () => {
    // new URL('/..//evil.example', origin).pathname === '//evil.example'. Returned verbatim to
    // window.location / <a href>, a leading "//" is a protocol-relative redirect off-site.
    for (const attack of ['/..//evil.example', '/.//evil.example', '/a/..//evil.example', '/a/../..//evil.example', '/./..//evil.example']) {
      it(`does not emit a leading // for ${attack}`, () => {
        const result = normalizeInternalReturnUrl(attack);
        expect(result.startsWith('//')).withContext(`${attack} -> ${result}`).toBeFalse();
      });
    }
  });

  describe('legitimate inputs', () => {
    it('keeps path, query and hash and strips surrounding whitespace', () => {
      expect(normalizeInternalReturnUrl('  /racks/12?tab=a&x=1#top  ')).toBe('/racks/12?tab=a&x=1#top');
    });

    it('accepts absolute URLs on the current origin and reduces them to a path', () => {
      expect(normalizeInternalReturnUrl(`${window.location.origin}/racks/12?x=1#h`)).toBe('/racks/12?x=1#h');
    });

    it('collapses dot segments inside the origin', () => {
      expect(normalizeInternalReturnUrl('/a/b/../c')).toBe('/a/c');
      expect(normalizeInternalReturnUrl('/a/./b')).toBe('/a/b');
    });

    it('resolves a bare query or hash against the root', () => {
      expect(normalizeInternalReturnUrl('?x=1')).toBe('/?x=1');
      expect(normalizeInternalReturnUrl('#frag')).toBe('/#frag');
    });

    it('keeps encoded characters that do not change the origin', () => {
      expect(normalizeInternalReturnUrl('/search?q=a%20b%26c')).toBe('/search?q=a%20b%26c');
    });

    it('does not treat a query-embedded URL as an off-origin target', () => {
      expect(normalizeInternalReturnUrl('/login?returnUrl=https://evil.example')).toBe('/login?returnUrl=https://evil.example');
    });
  });

  describe('non-string and fallback handling', () => {
    it('falls back for every non-string type', () => {
      for (const value of [undefined, null, 0, 1, true, false, {}, [], ['/x'], () => '/x', Symbol('s'), NaN]) {
        expect(normalizeInternalReturnUrl(value)).toBe(DEFAULT_AUTH_RETURN_URL);
      }
    });

    it('uses the supplied fallback and does not sanitise it', () => {
      expect(normalizeInternalReturnUrl('https://evil.example', '/home')).toBe('/home');
      expect(normalizeInternalReturnUrl('', '/home')).toBe('/home');
    });

    it('is idempotent', () => {
      for (const input of ['/a/b?x=1#h', 'x/y', '/a/../b', '  /z  ']) {
        const once = normalizeInternalReturnUrl(input);
        expect(normalizeInternalReturnUrl(once)).toBe(once);
      }
    });

    it('survives very long inputs without throwing', () => {
      expect(() => normalizeInternalReturnUrl('/' + 'a'.repeat(100_000))).not.toThrow();
      expect(() => normalizeInternalReturnUrl('/?' + 'a=b&'.repeat(50_000))).not.toThrow();
    });
  });
});
