import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Params
} from '@angular/router';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { CommentsDataService } from 'src/app/components/shared-atoms/comments/comments-data.service';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchConnection } from 'src/app/models/connection';
import { Patch } from 'src/app/models/patch';
import { CommentableEntityTypes } from 'src/app/models/comment';
import { SimpleUserModel } from '../../backend/supabase.service';
import { UserManagementService } from '../../backbone/login/user-management.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { PatchBrowserDetailViewComponent } from './patch-browser-detail-view.component';


describe('PatchBrowserDetailViewComponent', () => {
  type PatchDetailDataServiceDouble = Pick<
    PatchDetailDataService,
    | 'setPublicDetailMode'
    | 'updateSinglePatchByPublicId$'
    | 'singlePatchData$'
    | 'patchConnections$'
    | 'patchEditingPanelOpenState$'
  >;
  type SeoServiceDouble = Pick<SeoAndUtilsService, 'updateSeo'>;
  type CommentsDataServiceDouble = Pick<CommentsDataService, 'requestCommentsUpdate$'>;
  type UserManagementServiceDouble = Pick<UserManagementService, 'loggedUser$'>;
  type RouteDouble = Pick<ActivatedRoute, 'params'>;
  type CommentReference = {
    entityId: number;
    entityType: CommentableEntityTypes;
  };
  type SetPublicDetailMode = (enabled: boolean) => void;
  type SeoUpdate = SeoAndUtilsService['updateSeo'];

  let component: PatchBrowserDetailViewComponent;
  let dataService: PatchDetailDataServiceDouble;
  let seoService: SeoServiceDouble;
  let commentsDataService: CommentsDataServiceDouble;
  let userManagementService: UserManagementServiceDouble;
  let loggedUser$: BehaviorSubject<SimpleUserModel | undefined>;
  let singlePatchData$: BehaviorSubject<Patch | undefined>;
  let patchConnections$: BehaviorSubject<PatchConnection[] | null>;
  let routeParams$: ReplaySubject<Params>;

  function buildComponent(publicId = 'aBcD1234_-Xy'): PatchBrowserDetailViewComponent {
    routeParams$.next({publicId});
    return new PatchBrowserDetailViewComponent(
      TestBed.inject(PatchDetailDataService),
      TestBed.inject(ActivatedRoute),
      TestBed.inject(SeoAndUtilsService),
      TestBed.inject(CommentsDataService),
      TestBed.inject(UserManagementService)
    );
  }

  function userFactory(id: string): SimpleUserModel {
    return {
      id,
      email: `${ id }@example.com`,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z'
    };
  }
  
  beforeEach(() => {
    loggedUser$ = new BehaviorSubject<SimpleUserModel | undefined>(undefined);
    singlePatchData$ = new BehaviorSubject<Patch | undefined>(undefined);
    patchConnections$ = new BehaviorSubject<PatchConnection[] | null>(null);
    routeParams$ = new ReplaySubject<Params>(1);
    const route = {params: routeParams$} satisfies RouteDouble;
    const updateSinglePatchByPublicId$ = new ReplaySubject<string>(1);
    spyOn(updateSinglePatchByPublicId$, 'next').and.callThrough();
    const patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
    spyOn(patchEditingPanelOpenState$, 'next').and.callThrough();
    const requestCommentsUpdate$ = new ReplaySubject<CommentReference>(1);
    spyOn(requestCommentsUpdate$, 'next').and.callThrough();
    dataService = {
      setPublicDetailMode: jasmine.createSpy<SetPublicDetailMode>('setPublicDetailMode'),
      updateSinglePatchByPublicId$,
      singlePatchData$,
      patchConnections$,
      patchEditingPanelOpenState$
    };
    seoService = {updateSeo: jasmine.createSpy<SeoUpdate>('updateSeo')};
    commentsDataService = {requestCommentsUpdate$};
    userManagementService = {loggedUser$: loggedUser$.asObservable()};
    TestBed.configureTestingModule({
      providers: [
        {provide: ActivatedRoute, useValue: route},
        {provide: PatchDetailDataService, useValue: dataService},
        {provide: SeoAndUtilsService, useValue: seoService},
        {provide: CommentsDataService, useValue: commentsDataService},
        {provide: UserManagementService, useValue: userManagementService}
      ]
    });
    
    component = buildComponent();
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
    loggedUser$.next(userFactory('u1'));
    component = buildComponent('zYxW9876_-Ab');
    
    component.ngOnInit();
    
    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(false);
    expect(dataService.updateSinglePatchByPublicId$.next).toHaveBeenCalledWith('zYxW9876_-Ab');
  });

  it('switches back to public detail reads when the viewer logs out on the page', () => {
    loggedUser$.next(userFactory('u1'));
    component = buildComponent('zYxW9876_-Ab');

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
    singlePatchData$.next({
      id: 99,
      name: 'My Patch',
      author: {id: 'u1', username: 'patcher'},
      public: true,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z'
    });
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
