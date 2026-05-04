import { of } from 'rxjs';
import { PatchBrowserDetailViewComponent } from './patch-browser-detail-view.component';


describe('PatchBrowserDetailViewComponent', () => {
  let component: PatchBrowserDetailViewComponent;
  let dataService: any;
  let seoService: any;
  let commentsDataService: any;
  let userManagementService: any;
  
  beforeEach(() => {
    dataService = {
      setPublicDetailMode: jasmine.createSpy('setPublicDetailMode'),
      updateSinglePatchData$: {next: jasmine.createSpy('updateSinglePatchData$.next')},
      singlePatchData$: of(undefined),
      patchConnections$: of(undefined),
      patchEditingPanelOpenState$: {next: jasmine.createSpy('patchEditingPanelOpenState$.next')}
    };
    seoService = {updateSeo: jasmine.createSpy('updateSeo')};
    commentsDataService = {requestCommentsUpdate$: {next: jasmine.createSpy('requestCommentsUpdate$.next')}};
    userManagementService = {loggedUser$: of(undefined)};
    
    component = new PatchBrowserDetailViewComponent(
      dataService,
      {params: of({id: '42'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );
  });
  
  it('uses public detail reads for signed-out visitors', () => {
    component.ngOnInit();
    
    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(true);
    expect(dataService.updateSinglePatchData$.next).toHaveBeenCalledWith(42);
  });
  
  it('uses authenticated detail reads for signed-in users', () => {
    userManagementService.loggedUser$ = of({id: 'u1'});
    component = new PatchBrowserDetailViewComponent(
      dataService,
      {params: of({id: '213'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );
    
    component.ngOnInit();
    
    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(false);
    expect(dataService.updateSinglePatchData$.next).toHaveBeenCalledWith(213);
  });
});
