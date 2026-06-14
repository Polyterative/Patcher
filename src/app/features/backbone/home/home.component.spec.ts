import { ReplaySubject } from 'rxjs';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let comp: HomeComponent;
  let mockAppState: any;
  let mockSeoSvc: any;
  let mockPatchSvc: any;
  let mockRackSvc: any;
  let mockModuleSvc: any;
  const platformId: object = { __browser: false };

  function makeServiceMocks() {
    mockPatchSvc = { updateSinglePatchData$: new ReplaySubject<number>(1) };
    mockRackSvc = { updateSingleRackData$: new ReplaySubject<number>(1) };
    mockModuleSvc = { updateSingleModuleData$: new ReplaySubject<number>(1) };
  }

  beforeEach(() => {
    mockAppState = { isDev: false };
    mockSeoSvc = { updateSeo: jasmine.createSpy('updateSeo') };
    makeServiceMocks();

    comp = new HomeComponent(
      mockAppState,
      mockSeoSvc,
      mockPatchSvc,
      mockRackSvc,
      mockModuleSvc,
      platformId,
    );
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
    mockAppState.isDev = true;
    makeServiceMocks();
    const comp2 = new HomeComponent(
      mockAppState,
      mockSeoSvc,
      mockPatchSvc,
      mockRackSvc,
      mockModuleSvc,
      platformId,
    );
    expect(comp2.communityLinks.some(l => l.href === '/info/insights')).toBeTrue();
  });

  it('proofSections has at least one item', () => {
    expect((comp as any).proofSections.length).toBeGreaterThan(0);
  });

  it('heroContent title is non-empty', () => {
    expect(comp.heroContent.title.length).toBeGreaterThan(0);
  });

  it('SEO data includes correct url, type and keywords', () => {
    const call = (mockSeoSvc.updateSeo as jasmine.Spy).calls.mostRecent().args[0];
    expect(call.url).toBe('https://patcher.xyz/');
    expect(call.type).toBe('website');
    expect(call.keywords).toContain('eurorack');
  });

  it('exposes view configs for the proof showcase live components', () => {
    expect(comp.patchViewConfig).toBeDefined();
    expect(comp.rackViewConfig).toBeDefined();
    expect(comp.moduleViewConfig).toBeDefined();
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
