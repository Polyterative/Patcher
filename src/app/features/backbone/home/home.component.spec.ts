import { HomeComponent } from './home.component';
import { Subject } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

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

  it('rackViewConfig and moduleViewConfig are defined with sensible defaults', () => {
    expect(comp.rackViewConfig).toBeDefined();
    expect(comp.moduleViewConfig.hidePanelsOptions).toBeTrue();
    expect(comp.moduleViewConfig.bigPanelImage).toBeFalse();
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

  it('does not fire data-service updates on server platform', fakeAsync(() => {
    const patchSpy = spyOn(mockPatchSvc.updateSinglePatchData$, 'next');
    const moduleSpy = spyOn(mockModuleSvc.updateSingleModuleData$, 'next');
    const rackSpy = spyOn(mockRackSvc.updateSingleRackData$, 'next');

    const serverComp = new HomeComponent(
      mockPatchSvc, mockRackSvc, mockModuleSvc, mockAppStatSvc,
      mockAppState, mockSeoSvc, 'server' as unknown as object
    );
    tick(5000);

    expect(patchSpy).not.toHaveBeenCalled();
    expect(moduleSpy).not.toHaveBeenCalled();
    expect(rackSpy).not.toHaveBeenCalled();
    serverComp.ngOnDestroy();
  }));

  it('fires preview data triggers after timers on browser platform', fakeAsync(() => {
    const patchSpy = spyOn(mockPatchSvc.updateSinglePatchData$, 'next');
    const moduleSpy = spyOn(mockModuleSvc.updateSingleModuleData$, 'next');
    const rackSpy = spyOn(mockRackSvc.updateSingleRackData$, 'next');

    const browserComp = new HomeComponent(
      mockPatchSvc, mockRackSvc, mockModuleSvc, mockAppStatSvc,
      mockAppState, mockSeoSvc, 'browser' as unknown as object
    );

    tick(1001);  expect(patchSpy).toHaveBeenCalledWith(5);
    tick(1000);  expect(moduleSpy).toHaveBeenCalledWith(1025);
    tick(1000);  expect(rackSpy).toHaveBeenCalledWith(265);
    browserComp.ngOnDestroy();
  }));
});
