import { CommentTextPipe } from './comment-text.pipe';

describe('CommentTextPipe', () => {
  const pipe = new CommentTextPipe();

  describe('falsy input', () => {
    it('returns empty string for empty string', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('returns empty string for null', () => {
      expect(pipe.transform(null!)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(pipe.transform(undefined!)).toBe('');
    });
  });

  describe('plain text passthrough', () => {
    it('returns plain text unchanged', () => {
      expect(pipe.transform('hello world')).toBe('hello world');
    });
  });

  describe('HTML stripping', () => {
    it('strips HTML tags from content', () => {
      const result = pipe.transform('<b>bold</b> text');
      expect(result).not.toContain('<b>');
      expect(result).toContain('bold');
      expect(result).toContain('text');
    });

    it('strips script tags', () => {
      const result = pipe.transform('<script>alert(1)</script>safe');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });
  });

  describe('HTML encoding', () => {
    it('encodes ampersands', () => {
      expect(pipe.transform('a & b')).toContain('&amp;');
    });

    it('encodes angle brackets (DOMPurify pre-encodes, pipe encodes & again)', () => {
      const result = pipe.transform('a < b > c');
      // DOMPurify converts < > to &lt; &gt;, then the pipe converts & to &amp;
      expect(result).toContain('&amp;lt;');
      expect(result).toContain('&amp;gt;');
      // Raw angle brackets must not appear
      expect(result).not.toMatch(/<[^a]/);
    });

    it('encodes double quotes', () => {
      expect(pipe.transform('say "hello"')).toContain('&quot;');
    });
  });

  describe('URL linkification', () => {
    it('wraps https:// URLs in anchor tags', () => {
      const result = pipe.transform('visit https://example.com today');
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('wraps http:// URLs in anchor tags', () => {
      const result = pipe.transform('visit http://example.com please');
      expect(result).toContain('<a href="http://example.com"');
    });

    it('does not linkify non-URL text', () => {
      const result = pipe.transform('no links here just text');
      expect(result).not.toContain('<a ');
    });

    it('does not linkify ftp:// URLs', () => {
      const result = pipe.transform('ftp://example.com');
      expect(result).not.toContain('<a ');
    });

    it('linkifies multiple URLs in the same comment', () => {
      const result = pipe.transform('go to https://a.com and https://b.com');
      const matches = result.match(/<a /g);
      expect(matches?.length).toBe(2);
    });
  });
});
