import { HeroClickableTitleComponent } from './hero-clickable-title.component';

describe('HeroClickableTitleComponent', () => {
  let comp: HeroClickableTitleComponent;

  beforeEach(() => { comp = new HeroClickableTitleComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('textSize defaults to undefined', () => {
    expect(comp.textSize).toBeUndefined();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('textSize can be set to a number', () => {
    comp.textSize = 24;
    expect(comp.textSize).toBe(24);
  });
});
