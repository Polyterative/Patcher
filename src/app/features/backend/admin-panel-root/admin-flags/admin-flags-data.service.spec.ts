import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Observable,
  of,
  throwError
} from 'rxjs';
import { take } from 'rxjs/operators';
import {
  AdminFlagRow,
  AdminFlagsDataService
} from './admin-flags-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { Database } from 'src/backend/database.types';
import { SupabaseSingleResponse } from 'src/app/features/backend/supabase-db.types';


const makeFlag = (partial: Partial<AdminFlagRow>): AdminFlagRow => ({
  id:         1,
  module_id:  10,
  module:     {id: 10, name: 'Test Module'},
  user_id:    'user-1',
  category:   'wrong-power',
  note:       null,
  created_at: '2026-01-01T00:00:00Z',
  resolved:   false,
  ...partial
});

const OPEN_WRONG  = makeFlag({id: 1, category: 'wrong-power', resolved: false, created_at: '2026-01-01T00:00:00Z'});
const OPEN_DUP    = makeFlag({id: 2, category: 'duplicate', resolved: false, created_at: '2026-03-01T00:00:00Z'});
const RESOLVED    = makeFlag({id: 3, category: 'wrong-power', resolved: true, created_at: '2026-02-01T00:00:00Z'});
const ALL_FLAGS   = [OPEN_WRONG, OPEN_DUP, RESOLVED];

type ReporterProfileRow = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'username'>;
type ReporterProfileResponse = Pick<SupabaseSingleResponse<ReporterProfileRow>, 'data'>;

interface SetupOptions {
  flags?: AdminFlagRow[];
  userLookup?: (id: string) => Observable<ReporterProfileResponse>;
}

function setupTest(options: SetupOptions = {}) {
  const flags = options.flags ?? ALL_FLAGS;
  const userLookup = options.userLookup ?? ((id: string) => of({
    data: {id, username: `user-${ id }`}
  }));
  const mockGetAllFlags = jasmine.createSpy('get.allModuleFlags').and.returnValue(of(flags));
  const mockGetUserWithId = jasmine.createSpy('get.userWithId').and.callFake(userLookup);
  const mockBackend = {
    get:    {allModuleFlags: mockGetAllFlags, userWithId: mockGetUserWithId},
    update: {moduleFlagResolved: jasmine.createSpy().and.returnValue(of(null))},
    delete: {moduleFlag: jasmine.createSpy().and.returnValue(of(null))}
  };
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
  const mockAnalytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture']);

  TestBed.configureTestingModule({
    providers: [
      AdminFlagsDataService,
      {provide: SupabaseService, useValue: mockBackend},
      {provide: MatSnackBar, useValue: mockSnackBar},
      {provide: AnalyticsService, useValue: mockAnalytics}
    ]
  });

  const service = TestBed.inject(AdminFlagsDataService);
  return {service, mockBackend, mockSnackBar, mockAnalytics};
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

    it('should expose grouped category options for review filters', () => {
      const {service} = setupTest();
      expect(service.categoryGroups.map(group => group.label)).toEqual([
        'Module details',
        'Specs and setup',
        'Images and links',
        'Catalogue',
        'Legacy categories'
      ]);
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

  describe('reporter enrichment', () => {
    it('should resolve reporter names for loaded flags', done => {
      const {service, mockBackend} = setupTest();
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags[0].reporterName).toBe('user-user-1');
        expect(mockBackend.get.userWithId).toHaveBeenCalledOnceWith('user-1', 'id,username');
        expect(flags.every(flag => flag.reporterName === 'user-user-1')).toBeTrue();
        done();
      });
    });

    it('should fall back to null reporter name when the profile response has no data', done => {
      const {service} = setupTest({
        userLookup: () => of({data: null})
      });
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.every(flag => flag.reporterName === null)).toBeTrue();
        done();
      });
    });

    it('should fall back to null reporter name when a profile lookup fails', done => {
      const {service} = setupTest({
        userLookup: () => throwError(() => new Error('profile lookup failed'))
      });
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.every(flag => flag.reporterName === null)).toBeTrue();
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
      service.categoryFilter$.next('wrong-power');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.every(f => f.category === 'wrong-power')).toBeTrue();
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

  describe('filteredFlags$ — sort order', () => {
    it('should default to newest-first (desc)', done => {
      const {service} = setupTest();
      service.statusFilter$.next('all');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        const dates = flags.map(f => f.created_at);
        expect(dates[0]).toBe('2026-03-01T00:00:00Z');
        expect(dates[dates.length - 1]).toBe('2026-01-01T00:00:00Z');
        done();
      });
    });

    it('should sort oldest-first when sortOrder$ is "asc"', done => {
      const {service} = setupTest();
      service.statusFilter$.next('all');
      service.sortOrder$.next('asc');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        const dates = flags.map(f => f.created_at);
        expect(dates[0]).toBe('2026-01-01T00:00:00Z');
        expect(dates[dates.length - 1]).toBe('2026-03-01T00:00:00Z');
        done();
      });
    });

    it('should apply sort after filtering', done => {
      const {service} = setupTest();
      service.statusFilter$.next('open');
      service.sortOrder$.next('asc');
      service.filteredFlags$.pipe(take(1)).subscribe(flags => {
        expect(flags.length).toBe(2);
        expect(flags[0].created_at).toBe('2026-01-01T00:00:00Z');
        expect(flags[1].created_at).toBe('2026-03-01T00:00:00Z');
        done();
      });
    });
  });

  describe('category metadata helpers', () => {
    it('should resolve the friendly label for known categories', () => {
      const {service} = setupTest();
      expect(service.getCategoryLabel('panel-image-cropped')).toBe('Panel image cropped incorrectly');
    });

    it('should resolve the group label for known categories', () => {
      const {service} = setupTest();
      expect(service.getCategoryGroupLabel('wrong-power')).toBe('Specs and setup');
    });

    it('should keep legacy categories reviewable', () => {
      const {service} = setupTest();
      expect(service.getCategoryLabel('wrong-specs')).toBe('Wrong specs');
      expect(service.getCategoryTone('wrong-specs')).toBe('legacy');
    });

    describe('admin analytics', () => {
      it('captures resolved and reopened actions', done => {
        const {service, mockAnalytics} = setupTest();
        service.resolveFlag$.next({id: 1, resolved: true});
        service.resolveFlag$.next({id: 1, resolved: false});

        setTimeout(() => {
          expect(mockAnalytics.capture).toHaveBeenCalledWith('admin.action_performed', { action: 'flag_resolved' });
          expect(mockAnalytics.capture).toHaveBeenCalledWith('admin.action_performed', { action: 'flag_reopened' });
          done();
        }, 0);
      });

      it('captures deleted actions', done => {
        const {service, mockAnalytics} = setupTest();
        service.deleteFlag$.next(1);

        setTimeout(() => {
          expect(mockAnalytics.capture).toHaveBeenCalledWith('admin.action_performed', { action: 'flag_deleted' });
          done();
        }, 0);
      });
    });
  });
});
