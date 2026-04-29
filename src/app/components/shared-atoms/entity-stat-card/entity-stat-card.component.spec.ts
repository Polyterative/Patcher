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

  it('uses stable row and group track keys', () => {
    expect(component.rowTrackKey(1)).toBe(1);
    expect(component.groupTrackKey({ title: 'Power', items: [] }, 0, 1)).toBe('0|Power|1');
    expect(component.groupTrackKey({ items: [] }, 2, 0)).toBe('2||0');
  });
});
