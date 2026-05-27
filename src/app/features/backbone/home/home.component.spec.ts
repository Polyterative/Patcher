import { HomeComponent } from './home.component';
import { Subject } from 'rxjs';

describe('HomeComponent', () => {
  let comp: HomeComponent;
  let mockAppStatSvc: any;
  let mockAppState: any;
  let mockSeoSvc: any;

  beforeEach(() => {
    mockAppStatSvc = { teaser$: new Subject<any>() };
    mockAppState = { isDev: false };
    mockSeoSvc = { updateSeo: jasmine.createSpy('updateSeo') };

    comp = new HomeComponent(
      mockAppStatSvc,
      mockAppState,
      mockSeoSvc,
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

  it('showInsightsPageEntry reflects appState.isDev', () => {
    expect(comp.showInsightsPageEntry).toBeFalse();
  });

  it('communityLinks includes insights when isDev=true', () => {
    mockAppState.isDev = true;
    const comp2 = new HomeComponent(
      mockAppStatSvc,
      mockAppState,
      mockSeoSvc,
    );
    expect(comp2.communityLinks.some(l => l.href === '/info/insights')).toBeTrue();
  });

  it('proofPreviewImages has screenshots for each showcase kind', () => {
    expect(comp.proofPreviewImages.patch.src).toContain('04-patches');
    expect(comp.proofPreviewImages.rack.src).toContain('07-rack-details');
    expect(comp.proofPreviewImages.module.src).toContain('03-module-details');
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
});
