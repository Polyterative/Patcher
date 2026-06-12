import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { HomeDiscoverySectionComponent } from './home-discovery-section.component';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('HomeDiscoverySectionComponent', () => {
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let component: HomeDiscoverySectionComponent;
  let fixture: any;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture']);

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        NoopAnimationsModule,
        HomeDiscoverySectionComponent
      ],
      providers: [
        {
          provide: SupabaseService,
          useValue: {
            GET: {
              applicationStatistics: jasmine.createSpy('GET.applicationStatistics').and.returnValue(of({})),
              applicationInsightsSnapshot: jasmine.createSpy('GET.applicationInsightsSnapshot').and.returnValue(of({})),
              applicationModuleDiscovery: jasmine.createSpy('GET.applicationModuleDiscovery').and.returnValue(of({
                mostOwned: [
                  {id: 101, name: 'Maths', manufacturer: {id: 1, name: 'Intellijel'}, count: 21}
                ],
                mostWanted: [
                  {id: 202, name: 'Plaits', manufacturer: {id: 2, name: 'Mutable Instruments'}, count: 17}
                ],
                mostSold: [
                  {id: 303, name: 'Disting EX', manufacturer: {id: 3, name: 'Expert Sleepers'}, count: 12}
                ]
              }))
            }
          }
        },
        {provide: AppStateService, useValue: {isDev: false}},
        {
          provide: UserManagementService,
          useValue: {
            loggedUser$: of(undefined),
            loggedUserFullProfile$: of(undefined),
            isAdmin$: of(false)
          }
        },
        {provide: AnalyticsService, useValue: analytics}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeDiscoverySectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the ranked discovery list', () => {
    expect(component.discoveryBuckets.length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Maths');
    expect(fixture.nativeElement.textContent).toContain('21');
  });

  it('switches buckets and tracks the interaction', () => {
    component.onBucketChange('mostWanted');
    expect(component.selectedBucket).toBe('mostWanted');
    expect(analytics.capture).toHaveBeenCalledWith('module.discovery_bucket_viewed', {bucket: 'mostWanted'});
  });

  it('tracks module clicks', () => {
    component.onModuleClick('mostOwned', {id: 101, name: 'Maths', manufacturer: {id: 1, name: 'Intellijel'}, count: 21}, 1);
    expect(analytics.capture).toHaveBeenCalledWith('module.discovery_module_clicked', {
      bucket: 'mostOwned',
      module_id: 101,
      rank: 1,
      count: 21
    });
  });
});
