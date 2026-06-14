import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RecentActivityComponent } from './recent-activity.component';
import { RecentActivityModule } from './recent-activity.module';
import { RecentActivityItem } from './recent-activity.model';


describe('RecentActivityComponent', () => {
  let fixture: ComponentFixture<RecentActivityComponent>;
  let component: RecentActivityComponent;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RecentActivityModule,
        RouterTestingModule.withRoutes([])
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(RecentActivityComponent);
    component = fixture.componentInstance;
  });
  
  it('renders activity entries from input data', () => {
    fixture.componentRef.setInput('items', [
      {
        id: 'activity-1',
        type: 'update',
        actionLabel: 'updated',
        targetLabel: 'Maths',
        timestamp: '2025-01-01T00:00:00.000Z',
        contextLabel: 'Module by Make Noise',
        route: ['/modules', 'details', 1]
      }
    ]);
    fixture.detectChanges();
    
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.recent-activity__item').length).toBe(1);
    expect(host.textContent).toContain('updated Maths');
    expect(host.textContent).toContain('Module by Make Noise');
  });
  
  it('renders empty state when items are empty', () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();
    
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.recent-activity__state')).not.toBeNull();
    expect(host.textContent).toContain('No recent activity yet.');
  });
  
  it('renders loading state when items are undefined', () => {
    fixture.componentRef.setInput('items', undefined);
    fixture.detectChanges();
    
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.recent-activity__state--loading')).not.toBeNull();
    expect(host.textContent).toContain('Loading recent activity...');
  });
  it('title defaults to Recent activity', () => {
    expect(component.title()).toBe('Recent activity');
  });

  it('maxItems defaults to 5', () => {
    expect(component.maxItems()).toBe(5);
  });

  it('visibleItems returns empty array when items is null', () => {
    fixture.componentRef.setInput('items', null);
    expect(component.visibleItems()).toEqual([]);
  });

  it('visibleItems respects maxItems', () => {
    fixture.componentRef.setInput('maxItems', 2);
    fixture.componentRef.setInput('items', [
      {id: 'a', type: 'update', actionLabel: 'x', targetLabel: 'y', timestamp: '2025-01-01T00:00:00.000Z', contextLabel: '', route: []},
      {id: 'b', type: 'update', actionLabel: 'x', targetLabel: 'y', timestamp: '2025-01-02T00:00:00.000Z', contextLabel: '', route: []},
      {id: 'c', type: 'update', actionLabel: 'x', targetLabel: 'y', timestamp: '2025-01-03T00:00:00.000Z', contextLabel: '', route: []}
    ]);
    expect(component.visibleItems().length).toBe(2);
  });

  it('resolveIcon returns item.icon when present', () => {
    const item: RecentActivityItem = {id: '1', type: 'update', icon: 'star', actionLabel: '', targetLabel: '', timestamp: '2025-01-01T00:00:00.000Z', contextLabel: '', route: []};
    expect(component.resolveIcon(item)).toBe('star');
  });

  it('resolveIcon falls back to type icon', () => {
    const item: RecentActivityItem = {id: '2', type: 'comment', actionLabel: '', targetLabel: '', timestamp: '2025-01-01T00:00:00.000Z', contextLabel: '', route: []};
    expect(component.resolveIcon(item)).toBe('chat_bubble_outline');
  });
});
