import { HeroItemCardComponent } from './hero-item-card.component';

describe('HeroItemCardComponent', () => {
  it('creates without error', () => {
    expect(new HeroItemCardComponent()).toBeTruthy();
  });


  it('multiple instances are independent', () => {
    expect(new HeroItemCardComponent()).not.toBe(new HeroItemCardComponent());
  });
});
