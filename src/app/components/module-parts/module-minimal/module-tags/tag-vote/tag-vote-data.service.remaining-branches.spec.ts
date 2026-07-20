import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Observable,
  of,
  ReplaySubject,
  throwError
} from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SimpleUserModel } from 'src/app/features/backend/supabase.types';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { Tag, TagType } from 'src/app/models/tag';
import { TagVoteDataService } from './tag-vote-data.service';
import { TagVoteCount } from './tag-vote-data.types';

interface ModuleTagLinkResult {
  id: number;
}

interface TagVoteBackendDouble {
  get: {
    allTags: jasmine.Spy<() => Observable<Tag[]>>;
    myVotes: jasmine.Spy<() => Observable<number[]>>;
  };
  add: {
    userModuleTag: jasmine.Spy<(moduleTagId: number) => Observable<Record<string, never>>>;
    moduleTagLink: jasmine.Spy<(moduleId: number, tagId: number) => Observable<ModuleTagLinkResult>>;
  };
  delete: {
    userModuleTag: jasmine.Spy<(moduleTagId: number) => Observable<Record<string, never>>>;
  };
}

interface TagVoteServiceSetup {
  service: TagVoteDataService;
  backend: TagVoteBackendDouble;
}

const defaultUser: SimpleUserModel = {
  id: 'u1',
  email: 'user@example.com',
  created_at: '',
  updated_at: ''
};

const emptyMutationResult: Record<string, never> = {};
const defaultTags: Tag[] = [{id: 1, name: 'VCO', type: TagType.Source}];


describe('TagVoteDataService - Remaining Branches', () => {
  function setup(
    user: SimpleUserModel | null = defaultUser,
    allTagsResponse: Observable<Tag[]> = of(defaultTags)
  ): TagVoteServiceSetup {
    const loggedUser$ = new ReplaySubject<SimpleUserModel | null>(1);
    loggedUser$.next(user);
    
    const backend: TagVoteBackendDouble = {
      get: {
        allTags: jasmine.createSpy<() => Observable<Tag[]>>('allTags').and.returnValue(allTagsResponse),
        myVotes: jasmine.createSpy<() => Observable<number[]>>('myVotes').and.returnValue(of([10]))
      },
      add: {
        userModuleTag: jasmine.createSpy<(moduleTagId: number) => Observable<Record<string, never>>>('userModuleTag').and.returnValue(of(emptyMutationResult)),
        moduleTagLink: jasmine.createSpy<(moduleId: number, tagId: number) => Observable<ModuleTagLinkResult>>('moduleTagLink').and.returnValue(of({id: 100}))
      },
      delete: {
        userModuleTag: jasmine.createSpy<(moduleTagId: number) => Observable<Record<string, never>>>('delete.userModuleTag').and.returnValue(of(emptyMutationResult))
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
    const {service} = setup(defaultUser, throwError(() => new Error('tags fail')));
    
    expect(service).toBeTruthy();
  });
  
  it('shows load-votes error when myVotes call fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = setup();
    backend.get.myVotes.and.returnValue(throwError(() => new Error('myVotes fail')));
    
    const counts: TagVoteCount[] = [{moduleTagId: 10, count: 1}];
    service.loadVotes$.next(counts);
    
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
  
  it('shows vote-failed error when toggle backend call fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = setup();
    backend.add.userModuleTag.and.returnValue(throwError(() => new Error('vote fail')));
    
    service.toggleVote$.next(10);
    tick(200);
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Vote failed');
  }));

  it('calls delete.userModuleTag when user already has the vote', fakeAsync(() => {
    const {service, backend} = setup();
    // Seed: user already has vote for moduleTagId=10
    service.loadVotes$.next([{moduleTagId: 10, count: 2}]);
    tick();
    // The real "already voted" check requires myVotes to return [10]
    // backend.get.myVotes already returns of([10]) by default
    service.toggleVote$.next(10);
    tick(200);
    expect(backend.delete.userModuleTag).toHaveBeenCalledWith(10);
  }));
});