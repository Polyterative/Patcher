import { HomeComponent } from './home.component';
import { Subject } from 'rxjs';

describe('HomeComponent', () => {
  let comp: HomeComponent;
  let mockPatchSvc: any;
  let mockRackSvc: any;
  let mockModuleSvc: any;
  let mockAppStatSvc: any;
  let mockAppState: any;
  let mockSeoSvc: any;

  beforeEach(() => {
    mockPatchSvc = { updateSinglePatchData$: new Subject<number>() };
    mockRackSvc = { updateSingleRackData$: new Subject<number>() };
    mockModuleSvc = { updateSingleModuleData$: new Subject<number>() };
    mockAppStatSvc = { teaser$: new Subject<any>() };
    mockAppState = { isDev: false };
    mockSeoSvc = { updateSeo: jasmine.createSpy('updateSeo') };

    comp = new HomeComponent(
      mockPatchSvc,
      mockRackSvc,
      mockModuleSvc,
      mockAppStatSvc,
      mockAppState,
      mockSeoSvc,
      'server' as unknown as object
    );
  });

  afterEach(() => {
    comp.ngOnDestroy();
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

  it('patchViewConfig has hideButtons=true', () => {
    expect(comp.patchViewConfig.hideButtons).toBeTrue();
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

  it('showInsightsPageEntry reflects appState.isDev', () => {
    expect(comp.showInsightsPageEntry).toBeFalse();
  });

  it('communityLinks includes insights when isDev=true', () => {
    mockAppState.isDev = true;
    const comp2 = new HomeComponent(
      mockPatchSvc,
      mockRackSvc,
      mockModuleSvc,
      mockAppStatSvc,
      mockAppState,
      mockSeoSvc,
      'server' as unknown as object
    );
    expect(comp2.communityLinks.some(l => l.href === '/insights')).toBeTrue();
    comp2.ngOnDestroy();
  });
});
