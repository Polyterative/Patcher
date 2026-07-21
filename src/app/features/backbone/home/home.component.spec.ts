import { ReplaySubject } from 'rxjs';
import { DETAIL_ANALYTICS_SURFACES } from 'src/app/components/detail-analytics-surface';
import type { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import type { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import type { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import type { SeoSocialShareData } from 'src/app/models/seo.model';
import type { AppStateService } from 'src/app/shared-interproject/app-state.service';
import type { SeoAndUtilsService } from '../seo-and-utils.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let comp: HomeComponent;
  let mockAppState: jasmine.SpyObj<AppStateService>;
  let mockSeoSvc: jasmine.SpyObj<SeoAndUtilsService>;
  let mockPatchSvc: jasmine.SpyObj<PatchDetailDataService>;
  let mockRackSvc: jasmine.SpyObj<RackDetailDataService>;
  let mockModuleSvc: jasmine.SpyObj<ModuleDetailDataService>;
  const platformId: object = { __browser: false };

  function makeAppStateMock(isDev: boolean): jasmine.SpyObj<AppStateService> {
    return jasmine.createSpyObj<AppStateService>('AppStateService', ['ngOnDestroy'], { isDev });
  }

  function makeServiceMocks() {
    mockPatchSvc = jasmine.createSpyObj<PatchDetailDataService>(
      'PatchDetailDataService',
      ['setDetailAnalyticsSurface'],
      { updateSinglePatchData$: new ReplaySubject<number>(1) }
    );
    mockRackSvc = jasmine.createSpyObj<RackDetailDataService>(
      'RackDetailDataService',
      ['setDetailAnalyticsSurface'],
      { updateSingleRackData$: new ReplaySubject<number>(1) }
    );
    mockModuleSvc = jasmine.createSpyObj<ModuleDetailDataService>(
      'ModuleDetailDataService',
      ['setDetailAnalyticsSurface'],
      { updateSingleModuleData$: new ReplaySubject<number>(1) }
    );
  }

  function makeComponent() {
    return new HomeComponent(
      mockAppState,
      mockSeoSvc,
      mockPatchSvc,
      mockRackSvc,
      mockModuleSvc,
      platformId,
    );
  }

  beforeEach(() => {
    mockAppState = makeAppStateMock(false);
    mockSeoSvc = jasmine.createSpyObj<SeoAndUtilsService>('SeoAndUtilsService', ['updateSeo']);
    makeServiceMocks();

    comp = makeComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('calls seoAndUtilsService.updateSeo in constructor', () => {
    expect(mockSeoSvc.updateSeo).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ title: 'Patcher home' }),
      'Home'
    );
  });

  it('principleCards has 3 items', () => {
    expect(comp.principleCards.length).toBe(3);
  });

  it('workflowSteps has 4 items', () => {
    expect(comp.workflowSteps.length).toBe(4);
  });

  it('userStories has 4 items', () => {
    expect(comp.userStories.length).toBe(4);
  });

  it('communityLinks uses browseLinks when isDev=false', () => {
    expect(comp.communityLinks.length).toBe(3);
  });

  it('enables community trends discovery', () => {
    expect(comp.showCommunityTrends).toBeTrue();
  });

  it('keeps homepage insights hidden while disabled', () => {
    expect(comp.showHomepageInsights).toBeFalse();
  });

  it('showInsightsPageEntry reflects appState.isDev', () => {
    expect(comp.showInsightsPageEntry).toBeFalse();
  });

  it('communityLinks includes insights when isDev=true', () => {
    mockAppState = makeAppStateMock(true);
    makeServiceMocks();
    const comp2 = makeComponent();
    expect(comp2.communityLinks.some(l => l.href === '/info/insights')).toBeTrue();
  });

  it('proofSections has at least one item', () => {
    expect(comp.proofSections.length).toBeGreaterThan(0);
  });

  it('heroContent title is non-empty', () => {
    expect(comp.heroContent.title.length).toBeGreaterThan(0);
  });

  it('SEO data includes correct url, type and keywords', () => {
    const call: SeoSocialShareData = mockSeoSvc.updateSeo.calls.mostRecent().args[0];
    expect(call.url).toBe('https://patcher.xyz/');
    expect(call.type).toBe('website');
    expect(call.keywords).toContain('eurorack');
  });

  it('exposes view configs for the proof showcase live components', () => {
    expect(comp.patchViewConfig).toBeDefined();
    expect(comp.rackViewConfig).toBeDefined();
    expect(comp.moduleViewConfig).toBeDefined();
  });

  it('marks proof showcase services as home preview analytics surfaces', () => {
    expect(mockPatchSvc.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.homePreview);
    expect(mockRackSvc.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.homePreview);
    expect(mockModuleSvc.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.homePreview);
  });

  it('restores detail-route analytics surfaces when destroyed', () => {
    comp.ngOnDestroy();

    expect(mockPatchSvc.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.detailRoute);
    expect(mockRackSvc.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.detailRoute);
    expect(mockModuleSvc.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.detailRoute);
  });

  it('does not seed proof preview data on the server', () => {
    spyOn(mockPatchSvc.updateSinglePatchData$, 'next');
    spyOn(mockRackSvc.updateSingleRackData$, 'next');
    spyOn(mockModuleSvc.updateSingleModuleData$, 'next');
    comp.ngOnInit();
    expect(mockPatchSvc.updateSinglePatchData$.next).not.toHaveBeenCalled();
    expect(mockRackSvc.updateSingleRackData$.next).not.toHaveBeenCalled();
    expect(mockModuleSvc.updateSingleModuleData$.next).not.toHaveBeenCalled();
  });
});
