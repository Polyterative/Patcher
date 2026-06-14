import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedAtomsModule } from '../shared-atoms.module';
import { EntityStatGridComponent } from './entity-stat-grid.component';

describe('EntityStatGridComponent', () => {
  let component: EntityStatGridComponent;
  let fixture: ComponentFixture<EntityStatGridComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        SharedAtomsModule,
        RouterTestingModule.withRoutes([])
      ]
    });
    fixture = TestBed.createComponent(EntityStatGridComponent);
    component = fixture.componentInstance;
  });

  it('filters hidden items from the visible list', () => {
    fixture.componentRef.setInput('items', [
      { label: 'Visible', value: '1' },
      { label: 'Hidden', value: '2', hidden: true }
    ]);

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
    fixture.componentRef.setInput('equalColumns', true);
    expect(component.itemFlex({ label: 'HP', value: '8' })).toBe('1 1 0');
  });

  it('uses default 12rem flex basis when size is not set and equalColumns is false', () => {
    fixture.componentRef.setInput('equalColumns', false);
    expect(component.itemFlex({ label: 'HP', value: '8' })).toBe('1 1 12rem');
  });

  it('uses item.size as flex basis when provided and equalColumns is false', () => {
    fixture.componentRef.setInput('equalColumns', false);
    expect(component.itemFlex({ label: 'HP', value: '8', size: '20rem' })).toBe('1 1 20rem');
  });

  it('returns all items when none are hidden', () => {
    fixture.componentRef.setInput('items', [{ label: 'A', value: '1' }, { label: 'B', value: '2' }]);
    expect(component.visibleItems().length).toBe(2);
  });
});
