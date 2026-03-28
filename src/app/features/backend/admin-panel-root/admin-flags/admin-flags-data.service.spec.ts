import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  AdminFlagRow,
  AdminFlagsDataService
} from './admin-flags-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';


const makeFlag = (partial: Partial<AdminFlagRow>): AdminFlagRow => ({
  id:         1,
  module_id:  10,
  module:     {id: 10, name: 'Test Module'},
  user_id:    'user-1',
  category:   'wrong-specs',
  note:       null,
  created_at: '2026-01-01T00:00:00Z',
  resolved:   false,
  ...partial
});

const OPEN_WRONG  = makeFlag({id: 1, category: 'wrong-specs', resolved: false});
const OPEN_DUP    = makeFlag({id: 2, category: 'duplicate', resolved: false});
const RESOLVED    = makeFlag({id: 3, category: 'wrong-specs', resolved: true});
const ALL_FLAGS   = [OPEN_WRONG, OPEN_DUP, RESOLVED];

function setupTest() {
  const mockGetAllFlags = jasmine.createSpy('get.allModuleFlags').and.returnValue(of(ALL_FLAGS));
  const mockBackend = {
    get:    {allModuleFlags: mockGetAllFlags},
    update: {moduleFlagResolved: jasmine.createSpy().and.returnValue(of(null))},
    delete: {moduleFlag: jasmine.createSpy().and.returnValue(of(null))}
  };
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

  TestBed.configureTestingModule({
    providers: [
      AdminFlagsDataService,
      {provide: SupabaseService, useValue: mockBackend},
      {provide: MatSnackBar, useValue: mockSnackBar}
    ]
  });

  const service = TestBed.inject(AdminFlagsDataService);
  return {service, mockBackend, mockSnackBar};
}


function cleanup() { TestBed.resetTestingModule(); }

describe('AdminFlagsDataService', () => {
  afterEach(() => cleanup());

  describe('statusFilter$', () => {
    it('should default to "open"', done => {
      const {service} = setupTest();
      service.statusFilter$.pipe(take(1)).subscribe(v => {
        expect(v).toBe('open');
        done();
      });
    });
  });

  describe('categoryFilter$', () => {
    it('should default to null', done => {
      const {service} = setupTest();
      service.categoryFilter$.pipe(take(1)).subscribe(v => {
        expect(v).toBeNull();
        done();
      });
    });
  });

  describe('openFlagCount$', () => {
    it('should count unresolved flags from ALL flags regardless of filter', done => {
      const {service} = setupTest();
      service.openFlagCount$.pipe(take(1)).subscribe(count => {
        expect(count).toBe(2);
        done();
      });
    });
  });

  describe('filteredFlags$ — status filter', () => {
    it('should return only open flags when status is "open"', done => {
      const {service} = setupTest();
      service.statusFilter$.next('open');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.every(f => !f.resolved)).toBeTrue();
        expect(flags.length).toBe(2);
        done();
      });
    });

    it('should return only resolved flags when status is "resolved"', done => {
      const {service} = setupTest();
      service.statusFilter$.next('resolved');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.every(f => f.resolved)).toBeTrue();
        expect(flags.length).toBe(1);
        done();
      });
    });

    it('should return all flags when status is "all"', done => {
      const {service} = setupTest();
      service.statusFilter$.next('all');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.length).toBe(3);
        done();
      });
    });
  });

  describe('filteredFlags$ — category filter', () => {
    it('should return only matching category when set', done => {
      const {service} = setupTest();
      service.statusFilter$.next('all');
      service.categoryFilter$.next('wrong-specs');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.every(f => f.category === 'wrong-specs')).toBeTrue();
        expect(flags.length).toBe(2);
        done();
      });
    });

    it('should return all categories when category filter is null', done => {
      const {service} = setupTest();
      service.statusFilter$.next('all');
      service.categoryFilter$.next(null);
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.length).toBe(3);
        done();
      });
    });
  });

  describe('filteredFlags$ — combined status + category filter', () => {
    it('should apply both status and category filters simultaneously', done => {
      const {service} = setupTest();
      service.statusFilter$.next('open');
      service.categoryFilter$.next('duplicate');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.length).toBe(1);
        expect(flags[0].id).toBe(2);
        done();
      });
    });

    it('should return empty array when no flags match combined filter', done => {
      const {service} = setupTest();
      service.statusFilter$.next('resolved');
      service.categoryFilter$.next('duplicate');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.length).toBe(0);
        done();
      });
    });
  });
});
