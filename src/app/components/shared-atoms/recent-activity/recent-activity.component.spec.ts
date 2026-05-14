import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RecentActivityComponent } from './recent-activity.component';
import { RecentActivityModule } from './recent-activity.module';


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
    component.items = [
      {
        id: 'activity-1',
        type: 'update',
        actionLabel: 'updated',
        targetLabel: 'Maths',
        timestamp: '2025-01-01T00:00:00.000Z',
        contextLabel: 'Module by Make Noise',
        route: ['/modules', 'details', 1]
      }
    ];
    fixture.detectChanges();
    
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.recent-activity__item').length).toBe(1);
    expect(host.textContent).toContain('updated Maths');
    expect(host.textContent).toContain('Module by Make Noise');
  });
  
  it('renders empty state when items are empty', () => {
    component.items = [];
    fixture.detectChanges();
    
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.recent-activity__state')).not.toBeNull();
    expect(host.textContent).toContain('No recent activity yet.');
  });
  
  it('renders loading state when items are undefined', () => {
    component.items = undefined;
    fixture.detectChanges();
    
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.recent-activity__state--loading')).not.toBeNull();
    expect(host.textContent).toContain('Loading recent activity...');
  });
});

describe('RecentActivityComponent - pure unit', () => {
  let comp: RecentActivityComponent;

  beforeEach(() => {
    comp = new RecentActivityComponent();
  });

  it('title defaults to Recent activity', () => {
    expect(comp.title).toBe('Recent activity');
  });

  it('maxItems defaults to 5', () => {
    expect(comp.maxItems).toBe(5);
  });

  it('visibleItems returns empty array when items is null', () => {
    comp.items = null;
    expect(comp.visibleItems).toEqual([]);
  });

  it('visibleItems respects maxItems', () => {
    comp.maxItems = 2;
    comp.items = [
      {id: 'a', type: 'update', actionLabel: 'x', targetLabel: 'y', timestamp: '', contextLabel: '', route: []},
      {id: 'b', type: 'update', actionLabel: 'x', targetLabel: 'y', timestamp: '', contextLabel: '', route: []},
      {id: 'c', type: 'update', actionLabel: 'x', targetLabel: 'y', timestamp: '', contextLabel: '', route: []}
    ];
    expect(comp.visibleItems.length).toBe(2);
  });

  it('resolveIcon returns item.icon when present', () => {
    const item: any = {id: '1', type: 'update', icon: 'star', actionLabel: '', targetLabel: '', timestamp: '', contextLabel: '', route: []};
    expect(comp.resolveIcon(item)).toBe('star');
  });

  it('resolveIcon falls back to type icon', () => {
    const item: any = {id: '2', type: 'comment', actionLabel: '', targetLabel: '', timestamp: '', contextLabel: '', route: []};
    expect(comp.resolveIcon(item)).toBe('chat_bubble_outline');
  });
});