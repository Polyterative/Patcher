import { buildHomeTextSegments } from './home-text-segments.util';

describe('buildHomeTextSegments', () => {
  it('returns [] for empty text', () => {
    expect(buildHomeTextSegments('')).toEqual([]);
  });

  it('returns single unhighlighted segment when no keywords', () => {
    expect(buildHomeTextSegments('hello world')).toEqual([{highlighted: false, text: 'hello world'}]);
  });

  it('returns single unhighlighted segment when keywords is empty array', () => {
    expect(buildHomeTextSegments('hello world', [])).toEqual([{highlighted: false, text: 'hello world'}]);
  });

  it('highlights matching keyword', () => {
    const result = buildHomeTextSegments('save your patch today', ['patch']);
    expect(result.some(s => s.highlighted && s.text === 'patch')).toBeTrue();
  });

  it('highlights multiple occurrences of keyword', () => {
    const result = buildHomeTextSegments('save patch and share patch', ['patch']);
    const highlighted = result.filter(s => s.highlighted);
    expect(highlighted.length).toBe(2);
  });

  it('preserves non-matching text segments', () => {
    const result = buildHomeTextSegments('save your patch today', ['patch']);
    const unhighlighted = result.filter(s => !s.highlighted).map(s => s.text);
    expect(unhighlighted.join('')).toBe('save your  today');
  });

  it('is case-insensitive', () => {
    const result = buildHomeTextSegments('Save PATCH now', ['patch']);
    expect(result.some(s => s.highlighted && s.text.toLowerCase() === 'patch')).toBeTrue();
  });

  it('handles multiple keywords', () => {
    const result = buildHomeTextSegments('save patch and rack today', ['patch', 'rack']);
    const highlighted = result.filter(s => s.highlighted).map(s => s.text.toLowerCase());
    expect(highlighted).toContain('patch');
    expect(highlighted).toContain('rack');
  });
});
