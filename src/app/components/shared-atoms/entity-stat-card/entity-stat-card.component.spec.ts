import { EntityStatCardComponent } from './entity-stat-card.component';

describe('EntityStatCardComponent', () => {
  let component: EntityStatCardComponent;

  beforeEach(() => {
    component = new EntityStatCardComponent();
  });

  it('removes empty groups and rows from visible rows', () => {
    component.rows = [
      [
        {
          title: 'Rack',
          items: [
            { label: 'Modules', value: '12' }
          ]
        },
        {
          title: 'Hidden',
          items: [
            { label: 'Hidden stat', value: '0', hidden: true }
          ]
        }
      ],
      [
        {
          title: 'Empty row',
          items: [
            { label: 'No data', value: '0', hidden: true }
          ]
        }
      ]
    ];

    expect(component.visibleRows()).toEqual([
      [
        {
          title: 'Rack',
          items: [
            { label: 'Modules', value: '12' }
          ]
        }
      ]
    ]);
  });

  it('returns empty array when all items are hidden', () => {
    component.rows = [
      [{ title: 'Hidden', items: [{ label: 'A', value: '0', hidden: true }] }]
    ];
    expect(component.visibleRows()).toEqual([]);
  });

  it('returns empty array when rows is empty', () => {
    component.rows = [];
    expect(component.visibleRows()).toEqual([]);
  });

  it('preserves groups with at least one visible item', () => {
    component.rows = [
      [
        { title: 'Mixed', items: [{ label: 'Visible', value: '5' }, { label: 'Hidden', value: '0', hidden: true }] }
      ]
    ];
    const result = component.visibleRows();
    expect(result.length).toBe(1);
    expect(result[0][0].items.length).toBe(2);
  });
});
