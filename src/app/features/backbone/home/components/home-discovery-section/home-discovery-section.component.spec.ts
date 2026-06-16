import { BehaviorSubject, of } from 'rxjs';
import { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { RouterTestingModule } from '@angular/router/testing';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { HomeDiscoverySectionComponent } from './home-discovery-section.component';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MinimalModule } from 'src/app/models/module';

function buildModule(id: number, name: string, manufacturerName: string): MinimalModule {
  return {
    id,
    name,
    description: '',
    hp: 10,
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    manufacturerId: id,
    manufacturer: {id, name: manufacturerName},
    standard: {id: 0, name: '3U Doepfer'},
    tags: [],
    panels: []
  };
}

describe('HomeDiscoverySectionComponent', () => {
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let component: HomeDiscoverySectionComponent;
  let fixture: any;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture']);
    const moduleDetailDataService = {
      userModulesList$: new BehaviorSubject([]),
      singleModuleData$: new BehaviorSubject(undefined),
      setModulePossession$: new BehaviorSubject(null),
      requestAddModuleToRack$: new BehaviorSubject(null),
      copyModuleNameAndManufacturer$: new BehaviorSubject(undefined)
    };
    const rackDetailDataService = {
      singleRackData$: new BehaviorSubject(undefined),
      isCurrentRackEditable$: new BehaviorSubject(false),
      addModuleToRack$: new BehaviorSubject(null)
    };

    TestBed.configureTestingModule({
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
              })),
              publicModulesByIds: jasmine.createSpy('GET.publicModulesByIds').and.returnValue(of([
                buildModule(101, 'Maths', 'Intellijel'),
                buildModule(202, 'Plaits', 'Mutable Instruments'),
                buildModule(303, 'Disting EX', 'Expert Sleepers')
              ]))
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
    });
    TestBed.overrideProvider(ModuleDetailDataService, {useValue: moduleDetailDataService});
    TestBed.overrideProvider(RackDetailDataService, {useValue: rackDetailDataService});
    await TestBed.compileComponents();

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
