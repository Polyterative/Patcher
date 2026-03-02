import { EllipsisPipe } from './ellipsis.pipe';


describe('EllipsisPipe - additional cases', () => {
  let pipe: EllipsisPipe;
  
  beforeEach(() => {
    pipe = new EllipsisPipe();
  });
  
  it('handles a max larger than the string length', () => {
    expect(pipe.transform('hello', 100)).toBe('hello');
  });
  
  it('handles single-character strings within max', () => {
    expect(pipe.transform('x', 1)).toBe('x');
  });
  
  it('truncates single-character string when max is 0', () => {
    expect(pipe.transform('x', 0)).toBe('...');
  });
  
  it('handles strings with spaces at the truncation boundary', () => {
    expect(pipe.transform('hello world', 7)).toBe('hello w...');
  });
  
  it('handles numeric strings', () => {
    expect(pipe.transform('12345678', 5)).toBe('12345...');
  });
  
  it('does not add extra dots when the string is exactly max length', () => {
    const str = 'abc';
    expect(pipe.transform(str, 3)).toBe('abc');
    expect(pipe.transform(str, 3)).not.toContain('...');
  });
  
  it('handles unicode characters as individual characters', () => {
    // Each emoji is a separate character from the pipe's perspective
    const str = 'abcde';
    expect(pipe.transform(str, 3)).toBe('abc...');
  });
  
  it('handles undefined-like falsy value', () => {
    expect(pipe.transform(undefined as any, 5)).toBeUndefined();
  });
});