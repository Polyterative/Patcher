import { normalizeMarketplaceListingMediaDrafts } from './marketplace-listing-media.utils';

const IMG = 'https://images.patcher.xyz/';
const draft = (over: Record<string, unknown>) => ({mimeType: 'image/png', ...over});
const normalize = (drafts: unknown) => normalizeMarketplaceListingMediaDrafts(drafts as never);

describe('marketplace listing media — edge probing', () => {
  describe('URL allow-list', () => {
    const accepted = [
      `${IMG}a.png`,
      `${IMG}path/to/a.webp?w=100`,
      `  ${IMG}a.png  `,
      `${IMG}%2e%2e/a.png`,
      `${IMG}@evil.example/a.png`
    ];
    const rejected = [
      'http://images.patcher.xyz/a.png',
      'https://images.patcher.xyz',
      'https://images.patcher.xyz.evil.example/a.png',
      'https://evil.example/https://images.patcher.xyz/a.png',
      'https://images.patcher.xyz@evil.example/a.png',
      'https://images.patcher.xyz:444@evil.example/',
      'https://IMAGES.patcher.xyz/a.png',
      '//images.patcher.xyz/a.png',
      'images.patcher.xyz/a.png',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'blob:https://images.patcher.xyz/uuid',
      'file:///etc/passwd',
      `${IMG.replace('https', 'ftp')}a.png`,
      'https://patcher.xyz/a.png',
      'https://cdn.patcher.xyz/a.png',
      'https://xxxxxxxx.supabase.co/storage/v1/object/public/private/a.png',
      `${IMG}a.png`.replace('patcher', 'patcher​')
    ];

    for (const url of accepted) {
      it(`accepts ${JSON.stringify(url)} and the host stays images.patcher.xyz`, () => {
        const result = normalize([draft({url})]);
        expect(result.errors).withContext(url).toEqual([]);
        expect(new URL(result.media[0].url as string).hostname).toBe('images.patcher.xyz');
      });
    }

    for (const url of rejected) {
      it(`rejects ${JSON.stringify(url)}`, () => {
        const result = normalize([draft({url})]);
        expect(result.media).withContext(url).toEqual([]);
        expect(result.errors.some(e => e.field === 'url')).withContext(url).toBeTrue();
      });
    }

    it('rejects a URL over the 2048 length cap', () => {
      const result = normalize([draft({url: `${IMG}${'a'.repeat(2048)}`})]);
      expect(result.errors.some(e => e.field === 'url')).toBeTrue();
    });

    it('accepts a URL exactly at the cap', () => {
      const url = `${IMG}${'a'.repeat(2048 - IMG.length)}`;
      expect(url.length).toBe(2048);
      expect(normalize([draft({url})]).errors).toEqual([]);
    });
  });

  describe('filename', () => {
    const rejected = ['a/b.png', '../a.png', 'a\\b.png', 'a\u0000.png', 'a\n.png', 'a\u007f.png', 'x'.repeat(256)];
    for (const filename of rejected) {
      it(`rejects ${JSON.stringify(filename.slice(0, 20))}`, () => {
        const result = normalize([draft({filename})]);
        expect(result.media).toEqual([]);
        expect(result.errors.some(e => e.field === 'filename')).toBeTrue();
      });
    }

    it('accepts dotfile-ish, spaced and unicode names up to 255 chars', () => {
      for (const filename of ['..png', 'my photo (1).png', 'синтезатор.png', 'x'.repeat(255)]) {
        expect(normalize([draft({filename})]).errors).withContext(filename.slice(0, 20)).toEqual([]);
      }
    });
  });

  describe('mime type', () => {
    it('accepts the three supported types case-insensitively', () => {
      for (const mimeType of ['image/jpeg', 'IMAGE/PNG', ' image/webp ']) {
        expect(normalize([{mimeType, id: 'a'}]).errors).withContext(mimeType).toEqual([]);
      }
    });

    it('rejects svg, gif, html, parameterised and missing types', () => {
      for (const mimeType of ['image/svg+xml', 'image/gif', 'text/html', 'image/png; charset=x', 'image/jpg', '', null, undefined, 5]) {
        const result = normalize([{mimeType, id: 'a'}]);
        expect(result.media).withContext(String(mimeType)).toEqual([]);
        expect(result.errors.some(e => e.field === 'mimeType')).withContext(String(mimeType)).toBeTrue();
      }
    });

    it('rejects non-image kinds', () => {
      const result = normalize([draft({id: 'a', kind: 'video'})]);
      expect(result.errors.some(e => e.field === 'kind')).toBeTrue();
    });
  });

  describe('size', () => {
    const MAX = 10 * 1024 * 1024;
    it('accepts 0 and exactly the cap; rejects cap+1, negatives, floats, NaN and strings', () => {
      expect(normalize([draft({id: 'a', sizeBytes: 0})]).errors).toEqual([]);
      expect(normalize([draft({id: 'a', sizeBytes: MAX})]).errors).toEqual([]);
      for (const sizeBytes of [MAX + 1, -1, 1.5, NaN, Infinity, '100', {}]) {
        const result = normalize([draft({id: 'a', sizeBytes})]);
        expect(result.errors.some(e => e.field === 'sizeBytes')).withContext(String(sizeBytes)).toBeTrue();
      }
    });
  });

  describe('ordering, limits and dedupe', () => {
    it('caps at 8 images and warns for each dropped one', () => {
      const drafts = Array.from({length: 11}, (_, i) => draft({id: `id${i}`}));
      const result = normalize(drafts);
      expect(result.media.length).toBe(8);
      expect(result.warnings.length).toBe(3);
      expect(result.media.map(m => m.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    it('sorts by explicit position first, then input order, and densifies positions', () => {
      const result = normalize([
        draft({id: 'c'}),
        draft({id: 'b', position: 5}),
        draft({id: 'a', position: '2'}),
        draft({id: 'd'})
      ]);
      expect(result.media.map(m => m.id)).toEqual(['a', 'b', 'c', 'd']);
      expect(result.media.map(m => m.position)).toEqual([0, 1, 2, 3]);
    });

    it('ignores malformed positions with a warning instead of failing the item', () => {
      for (const position of ['x', '', NaN, Infinity, {}]) {
        const result = normalize([draft({id: 'a', position})]);
        expect(result.media.length).withContext(String(position)).toBe(1);
      }
      expect(normalize([draft({id: 'a', position: 'x'})]).warnings.some(w => w.field === 'position')).toBeTrue();
    });

    it('applies the cap after sorting, so a low explicit position beats earlier input order', () => {
      const drafts = [
        ...Array.from({length: 8}, (_, i) => draft({id: `late${i}`})),
        draft({id: 'first', position: -1})
      ];
      const result = normalize(drafts);
      expect(result.media[0].id).toBe('first');
      expect(result.media.some(m => m.id === 'late7')).toBeFalse();
    });

    it('dedupes by id and by url but keeps the first occurrence', () => {
      const result = normalize([
        draft({id: 'a', url: `${IMG}1.png`}),
        draft({id: 'a'}),
        draft({id: 'b', url: `${IMG}1.png`}),
        draft({id: 'c', url: `${IMG}2.png`})
      ]);
      expect(result.media.map(m => m.id)).toEqual(['a', 'c']);
      expect(result.warnings.length).toBe(2);
    });

    it('dedupes bare filenames case-insensitively', () => {
      const result = normalize([draft({filename: 'Photo.PNG'}), draft({filename: 'photo.png'})]);
      expect(result.media.length).toBe(1);
    });

    it('does not mutate the input drafts', () => {
      const drafts = [draft({id: ' a ', position: '3'}), draft({id: 'b'})];
      const snapshot = JSON.stringify(drafts);
      normalize(drafts);
      expect(JSON.stringify(drafts)).toBe(snapshot);
    });
  });

  describe('container and item shape', () => {
    it('null/undefined yield an empty result, non-arrays yield one container error', () => {
      expect(normalize(null)).toEqual({errors: [], media: [], warnings: []});
      expect(normalize(undefined)).toEqual({errors: [], media: [], warnings: []});
      for (const value of ['x', 5, {}, true]) {
        expect(normalize(value).errors.length).withContext(String(value)).toBe(1);
      }
    });

    it('non-object items produce an indexed error without discarding valid siblings', () => {
      const result = normalize([null, 'x', 5, draft({id: 'ok'})]);
      expect(result.errors.map(e => e.index)).toEqual([0, 1, 2]);
      expect(result.media.length).toBe(1);
    });

    it('requires at least one of id, url or filename', () => {
      const result = normalize([draft({})]);
      expect(result.media).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('does not carry unknown or private fields into the output', () => {
      const result = normalize([draft({id: 'a', storagePath: 'private/x', ownerId: 'u1', __proto__: {evil: true}})]);
      expect(Object.keys(result.media[0]).sort()).toEqual(['id', 'kind', 'mimeType', 'position']);
    });
  });
});
