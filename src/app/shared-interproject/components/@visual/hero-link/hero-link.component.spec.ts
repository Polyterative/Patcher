import { HeroLinkComponent } from './hero-link.component';

describe('HeroLinkComponent', () => {
  let comp: HeroLinkComponent;

  beforeEach(() => {
    comp = new HeroLinkComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('iconColor defaults to "black"', () => {
    expect(comp.iconColor).toBe('black');
  });

  it('disabled defaults to false', () => {
    expect(comp.disabled).toBeFalse();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
