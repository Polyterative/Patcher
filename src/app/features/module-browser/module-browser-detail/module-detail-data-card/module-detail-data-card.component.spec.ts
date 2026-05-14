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

  it('title input can be assigned', () => {
    comp.title = 'Power';
    expect(comp.title).toBe('Power');
  });

  it('animationDelay input can be assigned', () => {
    comp.animationDelay = 150;
    expect(comp.animationDelay).toBe(150);
  });

  it('data input can be assigned', () => {
    comp.data = [{label: 'HP', value: '8'}];
    expect(comp.data.length).toBe(1);
  });
});
