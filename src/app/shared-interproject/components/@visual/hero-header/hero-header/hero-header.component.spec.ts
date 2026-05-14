import { HeroHeaderComponent } from './hero-header.component';

describe('HeroHeaderComponent', () => {
  let comp: HeroHeaderComponent;

  beforeEach(() => { comp = new HeroHeaderComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('title defaults to empty string', () => {
    expect(comp.title).toBe('');
  });

  it('description defaults to empty string', () => {
    expect(comp.description).toBe('');
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
