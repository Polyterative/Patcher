import { HeroItemCardComponent } from './hero-item-card.component';

describe('HeroItemCardComponent', () => {
  it('creates without error', () => {
    expect(new HeroItemCardComponent()).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    const comp = new HeroItemCardComponent();
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
