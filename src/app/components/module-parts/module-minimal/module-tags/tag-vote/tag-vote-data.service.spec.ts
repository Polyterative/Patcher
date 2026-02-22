import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  of,
  ReplaySubject
} from 'rxjs';
import {
  TagVoteCount,
  TagVoteDataService
} from 'src/app/components/module-parts/module-minimal/module-tags/tag-vote/tag-vote-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';


const PRELOADED_COUNTS: TagVoteCount[] = [
  {moduleTagId: 10, count: 3},
  {moduleTagId: 11, count: 1}
];

const MOCK_ALL_TAGS = [
  {id: 1, name: 'VCO', type: 0},
  {id: 2, name: 'Filter', type: 0},
];

function setupTest(userOverride?: any) {
  const loggedUser$ = new ReplaySubject<any>(1);
  loggedUser$.next(userOverride !== undefined ? userOverride : {id: 'user-1', email: 'test@test.com', created_at: '', updated_at: ''});

  const mockBackend = {
    get: {
      myVotes: jasmine.createSpy('myVotes').and.returnValue(of([10])),
      allTags: jasmine.createSpy('allTags').and.returnValue(of(MOCK_ALL_TAGS))
    },
    add: {
      userModuleTag: jasmine.createSpy('add.userModuleTag').and.returnValue(of({})),
      moduleTagLink: jasmine.createSpy('add.moduleTagLink').and.returnValue(of({id: 99}))
    },
    delete: {
      userModuleTag: jasmine.createSpy('delete.userModuleTag').and.returnValue(of({}))
    }
  };

  const mockUserService = {loggedUser$};
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

  TestBed.configureTestingModule({
    providers: [
      TagVoteDataService,
      {provide: SupabaseService, useValue: mockBackend},
      {provide: UserManagementService, useValue: mockUserService},
      {provide: MatSnackBar, useValue: mockSnackBar}
    ]
  });

  return {
    service: TestBed.inject(TagVoteDataService),
    mockBackend,
    mockSnackBar,
    loggedUser$
  };
}

function cleanup() {
  TestBed.resetTestingModule();
}

describe('TagVoteDataService', () => {
  afterEach(() => cleanup());
  
  describe('API surface', () => {
    it('should expose tagVotes$ Observable', () => {
      const {service} = setupTest();
      expect(service.tagVotes$).toBeDefined();
      expect(typeof service.tagVotes$.subscribe).toBe('function');
    });
    
    it('should expose myVotes$ Observable', () => {
      const {service} = setupTest();
      expect(service.myVotes$).toBeDefined();
      expect(typeof service.myVotes$.subscribe).toBe('function');
    });
    
    it('should expose allTags$ Observable', () => {
      const {service} = setupTest();
      expect(service.allTags$).toBeDefined();
      expect(typeof service.allTags$.subscribe).toBe('function');
    });
    
    it('should expose loadVotes$ ReplaySubject', () => {
      const {service} = setupTest();
      expect(service.loadVotes$).toBeDefined();
      expect(typeof service.loadVotes$.next).toBe('function');
    });
    
    it('should expose toggleVote$ Subject', () => {
      const {service} = setupTest();
      expect(service.toggleVote$).toBeDefined();
      expect(typeof service.toggleVote$.next).toBe('function');
    });
    
    it('should expose proposeTag$ Subject', () => {
      const {service} = setupTest();
      expect(service.proposeTag$).toBeDefined();
      expect(typeof service.proposeTag$.next).toBe('function');
    });
    
    it('should expose proposedTags$ Observable', () => {
      const {service} = setupTest();
      expect(service.proposedTags$).toBeDefined();
      expect(typeof service.proposedTags$.subscribe).toBe('function');
    });
  });
  
  describe('loadVotes$ handler', () => {
    it('should populate tagVotes$ from preloaded counts without a backend call', () => {
      const {service} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      let map: Map<number, number> | undefined;
      service.tagVotes$.subscribe(m => {
        map = m;
      });
      expect(map!.get(10)).toBe(3);
      expect(map!.get(11)).toBe(1);
    });
    
    
    it('should call myVotes() with no args when user is logged in', () => {
      const {service, mockBackend} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      expect(mockBackend.get.myVotes).toHaveBeenCalledWith();
    });
    
    it('should populate myVotes$ with voted tag IDs after load', (done) => {
      const {service} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      service.myVotes$.subscribe(set => {
        if (set.size > 0) {
          expect(set.has(10)).toBeTrue();
          expect(set.has(11)).toBeFalse();
          done();
        }
      });
    });
    
    it('should skip myVotes() and set empty myVotes$ when user is not logged in', () => {
      const {service, mockBackend} = setupTest(null);
      service.loadVotes$.next(PRELOADED_COUNTS);
      expect(mockBackend.get.myVotes).not.toHaveBeenCalled();
      let set: Set<number> | undefined;
      service.myVotes$.subscribe(s => {
        set = s;
      });
      expect(set!.size).toBe(0);
    });
  });
  
  describe('toggleVote$ handler — optimistic update', () => {
    it('should add a vote optimistically when tag was not voted', (done) => {
      const {service} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      
      setTimeout(() => {
        const countsBefore = new Map(service['_tagVotes$'].getValue());
        service.toggleVote$.next(11); // tag 11 not in myVotes
        
        service.tagVotes$.subscribe(map => {
          const newCount = map.get(11);
          if (newCount !== undefined && newCount > (countsBefore.get(11) ?? 0)) {
            expect(newCount).toBe((countsBefore.get(11) ?? 0) + 1);
            done();
          }
        });
      }, 50);
    });
    
    it('should remove a vote optimistically when tag was already voted', (done) => {
      const {service} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      
      setTimeout(() => {
        const countsBefore = new Map(service['_tagVotes$'].getValue());
        service.toggleVote$.next(10); // tag 10 IS in myVotes
        
        service.tagVotes$.subscribe(map => {
          const newCount = map.get(10);
          if (newCount !== undefined && newCount < (countsBefore.get(10) ?? 0)) {
            expect(newCount).toBe((countsBefore.get(10) ?? 0) - 1);
            done();
          }
        });
      }, 50);
    });
    
    it('should call add.userModuleTag for a new vote', (done) => {
      const {service, mockBackend} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      
      setTimeout(() => {
        service.toggleVote$.next(11); // not voted yet
        setTimeout(() => {
          expect(mockBackend.add.userModuleTag).toHaveBeenCalledWith(11);
          done();
        }, 200);
      }, 50);
    });
    
    it('should call delete.userModuleTag for a retracted vote', (done) => {
      const {service, mockBackend} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      
      setTimeout(() => {
        service.toggleVote$.next(10); // already voted
        setTimeout(() => {
          expect(mockBackend.delete.userModuleTag).toHaveBeenCalledWith(10);
          done();
        }, 200);
      }, 50);
    });
    
    it('should not toggle when user is not logged in', () => {
      const {service, mockBackend} = setupTest(null);
      service.toggleVote$.next(10);
      expect(mockBackend.add.userModuleTag).not.toHaveBeenCalled();
      expect(mockBackend.delete.userModuleTag).not.toHaveBeenCalled();
    });
  });
  
  describe('auth gate', () => {
    it('should clear myVotes$ when user logs out', (done) => {
      const {service, loggedUser$} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      
      setTimeout(() => {
        loggedUser$.next(null); // simulate logout
        
        service.myVotes$.subscribe(set => {
          if (set.size === 0) {
            expect(set.size).toBe(0);
            done();
          }
        });
      }, 50);
    });
  });
  
  describe('allTags$ — loads global tag list', () => {
    it('should call get.allTags() on construction', () => {
      const {mockBackend} = setupTest();
      expect(mockBackend.get.allTags).toHaveBeenCalled();
    });
    
    it('should populate allTags$ with the returned tags', (done) => {
      const {service} = setupTest();
      service.allTags$.subscribe(tags => {
        if (tags.length > 0) {
          expect(tags.length).toBe(MOCK_ALL_TAGS.length);
          expect(tags[0].name).toBe('VCO');
          done();
        }
      });
    });
  });
  
  describe('proposeTag$ handler — contribute tag + vote', () => {
    it('should call add.moduleTagLink with moduleId and tagId', (done) => {
      const {service, mockBackend} = setupTest();
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      setTimeout(() => {
        expect(mockBackend.add.moduleTagLink).toHaveBeenCalledWith(42, 1);
        done();
      }, 50);
    });
    
    it('should call add.userModuleTag with the returned moduleTagId', (done) => {
      const {service, mockBackend} = setupTest();
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      setTimeout(() => {
        expect(mockBackend.add.userModuleTag).toHaveBeenCalledWith(99);
        done();
      }, 50);
    });
    
    it('should optimistically add the new tag to tagVotes$ with count=1', (done) => {
      const {service} = setupTest();
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      setTimeout(() => {
        service.tagVotes$.subscribe(map => {
          if (map.has(99)) {
            expect(map.get(99)).toBe(1);
            done();
          }
        });
      }, 50);
    });
    
    it('should optimistically add the new moduleTagId to myVotes$', (done) => {
      const {service} = setupTest();
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      setTimeout(() => {
        service.myVotes$.subscribe(set => {
          if (set.has(99)) {
            expect(set.has(99)).toBeTrue();
            done();
          }
        });
      }, 50);
    });
    
    it('should not call moduleTagLink when user is not logged in', (done) => {
      const {service, mockBackend} = setupTest(null);
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      setTimeout(() => {
        expect(mockBackend.add.moduleTagLink).not.toHaveBeenCalled();
        done();
      }, 50);
    });
    
    it('should add the full Tag object to proposedTags$ immediately after moduleTagLink succeeds', (done) => {
      const {service} = setupTest();
      service.proposeTag$.next({moduleId: 42, tagId: 1}); // tagId 1 = 'VCO' in MOCK_ALL_TAGS
      
      setTimeout(() => {
        service.proposedTags$.subscribe(proposed => {
          if (proposed.length > 0) {
            expect(proposed[0].moduleTagId).toBe(99);
            expect(proposed[0].tag.name).toBe('VCO');
            done();
          }
        });
      }, 50);
    });
    
    it('should remove the tag from proposedTags$ when userModuleTag call fails (rollback)', (done) => {
      const {service, mockBackend} = setupTest();
      const {throwError} = require('rxjs');
      mockBackend.add.userModuleTag.and.returnValue(throwError(() => new Error('network error')));
      
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      
      setTimeout(() => {
        service.proposedTags$.subscribe(proposed => {
          expect(proposed.length).toBe(0);
          done();
        });
      }, 50);
    });
    
    it('should apply optimistic update BEFORE userModuleTag backend call completes', (done) => {
      const {service, mockBackend} = setupTest();
      // Make userModuleTag never resolve to simulate slow network
      const pending$ = new ReplaySubject(1); // never emits
      mockBackend.add.userModuleTag.and.returnValue(pending$);
      
      service.proposeTag$.next({moduleId: 42, tagId: 1});

      setTimeout(() => {
        let hasVote = false;
        let isInMyVotes = false;
        service.tagVotes$.subscribe(m => {
          hasVote = m.get(99) === 1;
        });
        service.myVotes$.subscribe(s => {
          isInMyVotes = s.has(99);
        });
        expect(hasVote).toBeTrue();
        expect(isInMyVotes).toBeTrue();
        done();
      }, 50);
    });
    
    it('should rollback optimistic update when userModuleTag call fails', (done) => {
      const {service, mockBackend} = setupTest();
      const {throwError} = require('rxjs');
      mockBackend.add.userModuleTag.and.returnValue(throwError(() => new Error('network error')));
      
      service.proposeTag$.next({moduleId: 42, tagId: 1});

      setTimeout(() => {
        let hasVote = false;
        let isInMyVotes = false;
        service.tagVotes$.subscribe(m => {
          hasVote = m.has(99);
        });
        service.myVotes$.subscribe(s => {
          isInMyVotes = s.has(99);
        });
        expect(hasVote).toBeFalse();
        expect(isInMyVotes).toBeFalse();
        done();
      }, 50);
    });
  });
  
  // ---------------------------------------------------------------------------
  // Regression tests
  // ---------------------------------------------------------------------------
  
  describe('regression: toggleVote$ count floor', () => {
    it('should not let a vote count go below 0', (done) => {
      const {service} = setupTest();
      service.loadVotes$.next([{moduleTagId: 11, count: 0}]);
      
      setTimeout(() => {
        service['_myVotes$'].next(new Set([11]));
        service.toggleVote$.next(11);
        
        setTimeout(() => {
          let count: number | undefined;
          service.tagVotes$.subscribe(m => {
            count = m.get(11);
          });
          expect(count).toBe(0);
          done();
        }, 200);
      }, 50);
    });
  });
  
  describe('regression: toggleVote$ debounce deduplication', () => {
    it('should only fire once when the same tag is clicked twice rapidly', (done) => {
      const {service, mockBackend} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS);
      
      setTimeout(() => {
        service.toggleVote$.next(11);
        service.toggleVote$.next(11);
        
        setTimeout(() => {
          const calls = mockBackend.add.userModuleTag.calls.allArgs()
            .filter((args: any[]) => args[0] === 11);
          expect(calls.length).toBe(1);
          done();
        }, 300);
      }, 50);
    });
  });
  
  describe('regression: loadVotes$ count correction post-auth', () => {
    it('should bump count to 1 when myVotes includes a tag with preloaded count=0', (done) => {
      const {service} = setupTest();
      service.loadVotes$.next([
        {moduleTagId: 10, count: 0},
        {moduleTagId: 11, count: 2}
      ]);
      
      service.tagVotes$.subscribe(map => {
        if (map.get(10) === 1) {
          expect(map.get(10)).toBe(1);
          done();
        }
      });
    });
    
    it('should not modify count when it is already > 0', (done) => {
      const {service} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS); // tag 10 count=3
      
      setTimeout(() => {
        let count: number | undefined;
        service.tagVotes$.subscribe(m => {
          count = m.get(10);
        });
        expect(count).toBe(3);
        done();
      }, 100);
    });
  });
  
  describe('regression: loadVotes$ resets state on second load', () => {
    it('should replace preloaded counts when loadVotes$ fires again', (done) => {
      const {service} = setupTest();
      service.loadVotes$.next(PRELOADED_COUNTS); // tags 10 & 11
      
      setTimeout(() => {
        // Second load for a different module — only tag 20
        service.loadVotes$.next([{moduleTagId: 20, count: 5}]);
        
        setTimeout(() => {
          let map: Map<number, number> | undefined;
          service.tagVotes$.subscribe(m => {
            map = m;
          });
          // New module's tag is present with correct count
          expect(map!.has(20)).toBeTrue();
          expect(map!.get(20)).toBe(5);
          // Tag 11 (not in user's votes) is gone
          expect(map!.has(11)).toBeFalse();
          done();
        }, 100);
      }, 50);
    });
  });
  
  describe('regression: proposeTag$ failure isolation', () => {
    it('should not add to proposedTags$ when moduleTagLink fails', (done) => {
      const {service, mockBackend} = setupTest();
      const {throwError} = require('rxjs');
      mockBackend.add.moduleTagLink.and.returnValue(throwError(() => new Error('db error')));
      
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      
      setTimeout(() => {
        let proposed: any[] = [];
        service.proposedTags$.subscribe(p => {
          proposed = p;
        });
        expect(proposed.length).toBe(0);
        done();
      }, 50);
    });
    
    it('should not add to myVotes$ when moduleTagLink fails', (done) => {
      const {service, mockBackend} = setupTest();
      const {throwError} = require('rxjs');
      mockBackend.add.moduleTagLink.and.returnValue(throwError(() => new Error('db error')));
      
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      
      setTimeout(() => {
        let myVotes: Set<number> = new Set();
        service.myVotes$.subscribe(s => {
          myVotes = s;
        });
        expect(myVotes.has(99)).toBeFalse();
        done();
      }, 50);
    });
  });
  
  describe('regression: proposedTags$ survives logout', () => {
    it('should keep proposedTags$ intact when user logs out (UI-local state)', (done) => {
      const {service, loggedUser$} = setupTest();
      service.proposeTag$.next({moduleId: 42, tagId: 1});
      
      setTimeout(() => {
        loggedUser$.next(null);
        
        setTimeout(() => {
          let proposed: any[] = [];
          service.proposedTags$.subscribe(p => {
            proposed = p;
          });
          expect(proposed.length).toBe(1);
          done();
        }, 50);
      }, 50);
    });
  });
  
  describe('regression: isLoggedIn$ tracks user state', () => {
    it('should emit true when user is present', (done) => {
      const {service} = setupTest();
      service.isLoggedIn$.subscribe(v => {
        if (v === true) {
          expect(v).toBeTrue();
          done();
        }
      });
    });
    
    it('should emit false when user is null', (done) => {
      const {service} = setupTest(null);
      service.isLoggedIn$.subscribe(v => {
        if (v === false) {
          expect(v).toBeFalse();
          done();
        }
      });
    });
    
    it('should transition from true to false on logout', (done) => {
      const {service, loggedUser$} = setupTest();
      const emitted: boolean[] = [];
      
      service.isLoggedIn$.subscribe(v => {
        emitted.push(v);
        if (emitted.length === 2) {
          expect(emitted[0]).toBeTrue();
          expect(emitted[1]).toBeFalse();
          done();
        }
      });
      
      setTimeout(() => loggedUser$.next(null), 20);
    });
  });
});