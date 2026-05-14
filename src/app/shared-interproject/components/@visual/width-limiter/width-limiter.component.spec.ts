import { WidthLimiterComponent } from './width-limiter.component';

describe('WidthLimiterComponent', () => {
  let comp: WidthLimiterComponent;

  beforeEach(() => { comp = new WidthLimiterComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('max defaults to "16rem"', () => {
    expect(comp.max).toBe('16rem');
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('max input defaults to 16rem', () => {
    const c2 = new WidthLimiterComponent();
    expect(c2.max).toBe('16rem');
  });
});
