import { ModuleDetailDataCardComponent } from './module-detail-data-card.component';

describe('ModuleDetailDataCardComponent', () => {
  let comp: ModuleDetailDataCardComponent;

  beforeEach(() => {
    comp = new ModuleDetailDataCardComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('title defaults to empty string', () => {
    expect(comp.title).toBe('');
  });

  it('data defaults to empty array', () => {
    expect(comp.data).toEqual([]);
  });

  it('animationDelay defaults to 0', () => {
    expect(comp.animationDelay).toBe(0);
  });
});
