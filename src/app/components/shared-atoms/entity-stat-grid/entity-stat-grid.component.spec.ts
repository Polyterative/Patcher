import { EntityStatGridComponent } from './entity-stat-grid.component';

describe('EntityStatGridComponent', () => {
  let component: EntityStatGridComponent;

  beforeEach(() => {
    component = new EntityStatGridComponent();
  });

  it('filters hidden items from the visible list', () => {
    component.items = [
      { label: 'Visible', value: '1' },
      { label: 'Hidden', value: '2', hidden: true }
    ];

    expect(component.visibleItems()).toEqual([
      { label: 'Visible', value: '1' }
    ]);
  });

  it('returns a stable track key for equivalent stat items', () => {
    const firstKey = component.itemTrackKey({
      label: 'Power',
      value: '420 HP',
      icon: 'bolt',
      badge: 'new',
      routerLink: ['/racks', '1']
    }, 0);

    const secondKey = component.itemTrackKey({
      label: 'Power',
      value: '420 HP',
      icon: 'bolt',
      badge: 'new',
      routerLink: ['/racks', '1']
    }, 0);

    expect(firstKey).toBe(secondKey);
  });

  it('returns "1 1 0" for all items when equalColumns is true', () => {
    component.equalColumns = true;
    expect(component.itemFlex({ label: 'HP', value: '8' })).toBe('1 1 0');
  });

  it('uses default 12rem flex basis when size is not set and equalColumns is false', () => {
    component.equalColumns = false;
    expect(component.itemFlex({ label: 'HP', value: '8' })).toBe('1 1 12rem');
  });

  it('uses item.size as flex basis when provided and equalColumns is false', () => {
    component.equalColumns = false;
    expect(component.itemFlex({ label: 'HP', value: '8', size: '20rem' })).toBe('1 1 20rem');
  });

  it('returns all items when none are hidden', () => {
    component.items = [{ label: 'A', value: '1' }, { label: 'B', value: '2' }];
    expect(component.visibleItems().length).toBe(2);
  });
});
