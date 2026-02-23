import { EllipsisPipe } from './ellipsis.pipe';


describe('EllipsisPipe', () => {
  let pipe: EllipsisPipe;
  
  beforeEach(() => {
    pipe = new EllipsisPipe();
  });
  
  it('truncates a string longer than max and appends ellipsis', () => {
    expect(pipe.transform('hello world', 5)).toBe('hello...');
  });
  
  it('returns the original string when length equals max', () => {
    expect(pipe.transform('exact', 5)).toBe('exact');
  });
  
  it('returns the original string when length is less than max', () => {
    expect(pipe.transform('hi', 10)).toBe('hi');
  });
  
  it('returns falsy value unchanged when value is null', () => {
    expect(pipe.transform(null as any, 5)).toBeNull();
  });
  
  it('returns empty string unchanged', () => {
    expect(pipe.transform('', 5)).toBe('');
  });
  
  it('truncates at exactly the max character boundary', () => {
    expect(pipe.transform('abcdef', 3)).toBe('abc...');
  });
  
  it('works with max of 0 when string is non-empty', () => {
    expect(pipe.transform('x', 0)).toBe('...');
  });
});