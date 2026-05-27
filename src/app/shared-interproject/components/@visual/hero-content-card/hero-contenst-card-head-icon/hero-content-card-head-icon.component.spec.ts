import { HeroContentCardHeadIconComponent } from './hero-content-card-head-icon.component';

describe('HeroContentCardHeadIconComponent', () => {
  let comp: HeroContentCardHeadIconComponent;

  beforeEach(() => { comp = new HeroContentCardHeadIconComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });


  it('icon input can be assigned', () => {
    comp.icon = 'settings';
    expect(comp.icon).toBe('settings');
  });
});
