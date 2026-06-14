import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { StatisticsComponent } from './statistics.component';


describe('StatisticsComponent', () => {
  let component: StatisticsComponent;
  let fixture: ComponentFixture<StatisticsComponent>;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatisticsComponent]
    });
    fixture = TestBed.createComponent(StatisticsComponent);
    component = fixture.componentInstance;
  });
  
  it('visibleStatistics keeps zero-valued items so populated stats cards remain visible', () => {
    fixture.componentRef.setInput('statistics', [
      {name: 'Modules', value: 5},
      {name: 'Patches', value: 0},
      {name: 'Racks', value: 3},
      {name: 'Empty', value: 0}
    ]);
    expect(component.visibleStatistics().length).toBe(4);
    expect(component.visibleStatistics().map(s => s.name)).toEqual(['Modules', 'Patches', 'Racks', 'Empty']);
  });
  
  it('visibleStatistics returns all rows when all values are 0', () => {
    fixture.componentRef.setInput('statistics', [
      {name: 'Modules', value: 0},
      {name: 'Patches', value: 0}
    ]);
    expect(component.visibleStatistics()).toEqual([
      {name: 'Modules', value: 0},
      {name: 'Patches', value: 0}
    ]);
    expect(component.shouldRenderCard()).toBeTrue();
  });
  
  it('visibleStatistics returns empty array when statistics is null', () => {
    fixture.componentRef.setInput('statistics', null);
    expect(component.visibleStatistics()).toEqual([]);
  });
  
  it('visibleStatistics returns all items when all values are positive', () => {
    fixture.componentRef.setInput('statistics', [
      {name: 'A', value: 1},
      {name: 'B', value: 100},
      {name: 'C', value: 42}
    ]);
    expect(component.visibleStatistics().length).toBe(3);
  });
  
  it('keeps negative values when supplied by the caller', () => {
    fixture.componentRef.setInput('statistics', [
      {name: 'Positive', value: 5},
      {name: 'Negative', value: -1}
    ]);
    expect(component.visibleStatistics().length).toBe(2);
    expect(component.visibleStatistics().map(s => s.name)).toEqual(['Positive', 'Negative']);
  });
  
  it('default values are set correctly', () => {
    expect(component.title()).toBeNull();
    expect(component.cardClass()).toBe('');
    expect(component.icon()).toBeUndefined();
    expect(component.compact()).toBeFalse();
  });

  it('showEmptyState is false when empty message is provided and all values are zero', () => {
    fixture.componentRef.setInput('statistics', [
      {name: 'Modules submitted', value: 0},
      {name: 'Comments posted', value: 0}
    ]);
    fixture.componentRef.setInput('emptyMessage', 'Start contributing');

    expect(component.showEmptyState()).toBeFalse();
    expect(component.shouldRenderCard()).toBeTrue();
  });

  it('showEmptyState stays false while statistics are still loading', () => {
    fixture.componentRef.setInput('statistics', null);
    fixture.componentRef.setInput('emptyMessage', 'Start contributing');

    expect(component.showEmptyState()).toBeFalse();
    expect(component.shouldRenderCard()).toBeFalse();
  });
});
