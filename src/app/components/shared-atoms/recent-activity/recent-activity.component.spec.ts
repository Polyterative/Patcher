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