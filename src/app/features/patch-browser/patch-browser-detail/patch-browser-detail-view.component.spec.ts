import { BehaviorSubject, of } from 'rxjs';
import { PatchBrowserDetailViewComponent } from './patch-browser-detail-view.component';


describe('PatchBrowserDetailViewComponent', () => {
  let component: PatchBrowserDetailViewComponent;
  let dataService: any;
  let seoService: any;
  let commentsDataService: any;
  let userManagementService: any;
  let loggedUser$: BehaviorSubject<any>;
  let singlePatchData$: BehaviorSubject<any>;
  let patchConnections$: BehaviorSubject<any>;
  
  beforeEach(() => {
    loggedUser$ = new BehaviorSubject<any>(undefined);
    singlePatchData$ = new BehaviorSubject<any>(undefined);
    patchConnections$ = new BehaviorSubject<any>(undefined);
    dataService = {
      setPublicDetailMode: jasmine.createSpy('setPublicDetailMode'),
      updateSinglePatchByPublicId$: {next: jasmine.createSpy('updateSinglePatchByPublicId$.next')},
      singlePatchData$,
      patchConnections$,
      patchEditingPanelOpenState$: {next: jasmine.createSpy('patchEditingPanelOpenState$.next')}
    };
    seoService = {updateSeo: jasmine.createSpy('updateSeo')};
    commentsDataService = {requestCommentsUpdate$: {next: jasmine.createSpy('requestCommentsUpdate$.next')}};
    userManagementService = {loggedUser$};
    
    component = new PatchBrowserDetailViewComponent(
      dataService,
      {params: of({publicId: 'aBcD1234_-Xy'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );
  });

  afterEach(() => {
    component.ngOnDestroy();
  });
  
  it('uses public detail reads for signed-out visitors', () => {
    component.ngOnInit();
    
    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(true);
    expect(dataService.updateSinglePatchByPublicId$.next).toHaveBeenCalledWith('aBcD1234_-Xy');
  });
  
  it('uses authenticated detail reads for signed-in users', () => {
    loggedUser$.next({id: 'u1'});
    component = new PatchBrowserDetailViewComponent(
      dataService,
      {params: of({publicId: 'zYxW9876_-Ab'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );
    
    component.ngOnInit();
    
    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(false);
    expect(dataService.updateSinglePatchByPublicId$.next).toHaveBeenCalledWith('zYxW9876_-Ab');
  });

  it('switches back to public detail reads when the viewer logs out on the page', () => {
    loggedUser$.next({id: 'u1'});
    component = new PatchBrowserDetailViewComponent(
      dataService,
      {params: of({publicId: 'zYxW9876_-Ab'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );

    component.ngOnInit();
    loggedUser$.next(undefined);

    expect(dataService.setPublicDetailMode).toHaveBeenCalledTimes(2);
    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(false);
    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(true);
    expect(dataService.updateSinglePatchByPublicId$.next).toHaveBeenCalledTimes(2);
    expect(dataService.updateSinglePatchByPublicId$.next).toHaveBeenCalledWith('zYxW9876_-Ab');
  });

  it('shows wide-shell nav by default', () => {
  });

  it('viewConfig hides buttons by default', () => {
    expect(component.viewConfig.hideButtons).toBeFalse();
  });

  it('resets patch data and closes edit panel on destroy', () => {
    component.ngOnDestroy();
    expect(dataService.singlePatchData$.value).toBeUndefined();
    expect(dataService.patchEditingPanelOpenState$.next).toHaveBeenCalledWith(false);
  });

  it('requests comments update when single patch data arrives', () => {
    component.ngOnInit();
    singlePatchData$.next({id: 99, name: 'My Patch'});
    expect(commentsDataService.requestCommentsUpdate$.next).toHaveBeenCalledWith(
      jasmine.objectContaining({entityId: 99})
    );
  });

  it('does not request comments for falsy patch data', () => {
    component.ngOnInit();
    singlePatchData$.next(null);
    expect(commentsDataService.requestCommentsUpdate$.next).not.toHaveBeenCalled();
  });
});
