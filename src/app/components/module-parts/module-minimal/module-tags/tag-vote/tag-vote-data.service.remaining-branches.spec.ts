import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  of,
  ReplaySubject,
  throwError
} from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { TagVoteDataService } from './tag-vote-data.service';


describe('TagVoteDataService - Remaining Branches', () => {
  function setup(user: any = {id: 'u1'}) {
    const loggedUser$ = new ReplaySubject<any>(1);
    loggedUser$.next(user);
    
    const backend = {
      get: {
        allTags: jasmine.createSpy('allTags').and.returnValue(of([{id: 1, name: 'VCO', type: 0}])),
        myVotes: jasmine.createSpy('myVotes').and.returnValue(of([10]))
      },
      add: {
        userModuleTag: jasmine.createSpy('userModuleTag').and.returnValue(of({})),
        moduleTagLink: jasmine.createSpy('moduleTagLink').and.returnValue(of({id: 100}))
      },
      delete: {
        userModuleTag: jasmine.createSpy('delete.userModuleTag').and.returnValue(of({}))
      }
    };
    
    TestBed.configureTestingModule({
      providers: [
        TagVoteDataService,
        {provide: SupabaseService, useValue: backend},
        {provide: UserManagementService, useValue: {loggedUser$}},
        {provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open'])}
      ]
    });
    
    return {service: TestBed.inject(TagVoteDataService), backend};
  }
  
  afterEach(() => {
    TestBed.resetTestingModule();
  });
  
  it('swallows allTags load errors in constructor loadAllTags()', () => {
    const {service, backend} = setup();
    (backend.get.allTags as jasmine.Spy).and.returnValue(throwError(() => new Error('tags fail')));
    
    (service as any).loadAllTags();
    
    expect(service).toBeTruthy();
  });
  
  it('shows load-votes error when myVotes call fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = setup();
    (backend.get.myVotes as jasmine.Spy).and.returnValue(throwError(() => new Error('myVotes fail')));
    
    service.loadVotes$.next([{moduleTagId: 10, count: 1}]);
    
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
  
  it('shows vote-failed error when toggle backend call fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = setup();
    (backend.add.userModuleTag as jasmine.Spy).and.returnValue(throwError(() => new Error('vote fail')));
    
    service.toggleVote$.next(10);
    tick(200);
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Vote failed');
  }));
});