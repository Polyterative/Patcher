import { StatisticsComponent } from './statistics.component';


describe('StatisticsComponent', () => {
  let component: StatisticsComponent;
  
  beforeEach(() => {
    component = new StatisticsComponent();
  });
  
  it('visibleStatistics returns only items with value > 0', () => {
    component.statistics = [
      {name: 'Modules', value: 5},
      {name: 'Patches', value: 0},
      {name: 'Racks', value: 3},
      {name: 'Empty', value: 0}
    ];
    expect(component.visibleStatistics.length).toBe(2);
    expect(component.visibleStatistics.map(s => s.name)).toEqual(['Modules', 'Racks']);
  });
  
  it('visibleStatistics returns empty array when all values are 0', () => {
    component.statistics = [
      {name: 'Modules', value: 0},
      {name: 'Patches', value: 0}
    ];
    expect(component.visibleStatistics).toEqual([]);
  });
  
  it('visibleStatistics returns empty array when statistics is null', () => {
    component.statistics = null;
    expect(component.visibleStatistics).toEqual([]);
  });
  
  it('visibleStatistics returns all items when all values are positive', () => {
    component.statistics = [
      {name: 'A', value: 1},
      {name: 'B', value: 100},
      {name: 'C', value: 42}
    ];
    expect(component.visibleStatistics.length).toBe(3);
  });
  
  it('includes items with negative values (< 0 is not > 0)', () => {
    component.statistics = [
      {name: 'Positive', value: 5},
      {name: 'Negative', value: -1}
    ];
    // -1 is not > 0, so it should be filtered out
    expect(component.visibleStatistics.length).toBe(1);
    expect(component.visibleStatistics[0].name).toBe('Positive');
  });
  
  it('default values are set correctly', () => {
    expect(component.title).toBeNull();
    expect(component.cardClass).toBe('');
    expect(component.icon).toBeUndefined();
  });
});