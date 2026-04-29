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
});
