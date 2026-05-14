import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let comp: PageHeaderComponent;

  beforeEach(() => { comp = new PageHeaderComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('color defaults to #778698', () => {
    expect(comp.color).toBe('#778698');
  });

  it('title has a default value', () => {
    expect(comp.title.length).toBeGreaterThan(0);
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
