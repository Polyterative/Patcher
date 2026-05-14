import { HeroContentCardHeadIconComponent } from './hero-content-card-head-icon.component';

describe('HeroContentCardHeadIconComponent', () => {
  let comp: HeroContentCardHeadIconComponent;

  beforeEach(() => { comp = new HeroContentCardHeadIconComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
