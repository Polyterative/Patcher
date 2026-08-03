import { UserAreaRootComponent } from './user-area-root.component';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { Rack } from 'src/app/models/rack';

const timestamp = '2026-08-03T12:00:00.000Z';

function rackFixture(): Rack {
  return {
    id: 1,
    name: 'Starter rack',
    hp: 84,
    rows: 2,
    public: false,
    author: {
      id: 'user-1',
      username: 'newuser'
    },
    locked: false,
    created: timestamp,
    updated: timestamp
  };
}

function mockUserService(): UserManagementService {
  return {
    updateProfileVisibility$: jasmine.createSpy('updateProfileVisibility$').and.returnValue(of(null))
  } as unknown as UserManagementService;
}

function mockBackend(): SupabaseService {
  return {} as unknown as SupabaseService;
}

function mockDataService(): UserAreaDataService {
  return {
    modulesData$:          new BehaviorSubject(undefined),
    rackData$:             new BehaviorSubject(undefined),
    patchesData$:          new BehaviorSubject(undefined),
    commentsData$:         new BehaviorSubject(undefined),
    manualsData$:          new BehaviorSubject(undefined),
    contributorStats$:     new BehaviorSubject(undefined),
    updateModulesData$:    new Subject<void>(),
    updateRackData$:       new Subject<string | undefined>(),
    updatePatchesData$:    new Subject<void>(),
    updateManualsData$:    new Subject<void>(),
    updateCommentsData$:   new Subject<void>(),
    updateContributorStats$: new Subject<void>(),
    connectDiscovery:      jasmine.createSpy('connectDiscovery'),
    resetUiState:          jasmine.createSpy('resetUiState')
  } as unknown as UserAreaDataService;
}

function mockSeo(): SeoAndUtilsService {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  } as unknown as SeoAndUtilsService;
}

function mockUrlCreator(): UrlCreatorService {
  return {
    copyLinkToClipboard: jasmine.createSpy('copyLinkToClipboard')
  } as unknown as UrlCreatorService;
}

function makeComp(overrides: { ignoreSeo?: boolean } = {}): {
  comp: UserAreaRootComponent;
  ds: UserAreaDataService;
  seo: SeoAndUtilsService;
  userService: UserManagementService;
  urlCreator: UrlCreatorService;
} {
  const ds = mockDataService();
  const seo = mockSeo();
  const userService = mockUserService();
  const urlCreator = mockUrlCreator();
  const comp = new UserAreaRootComponent(userService, mockBackend(), ds, seo, urlCreator, true);
  if (overrides.ignoreSeo !== undefined) comp.ignoreSeo = overrides.ignoreSeo;
  return { comp, ds, seo, userService, urlCreator };
}

describe('UserAreaRootComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });

    it('globalSearchControl starts with empty string', () => {
      const { comp } = makeComp();
      expect(comp.globalSearchControl.value).toBe('');
    });

    it('formTypes is defined', () => {
      expect(makeComp().comp.formTypes).toBeDefined();
    });

    it('ignoreSeo defaults to false', () => {
      expect(makeComp().comp.ignoreSeo).toBeFalse();
    });

    it('contributorStatsEmptyMessage is a non-empty string', () => {
      expect(makeComp().comp.contributorStatsEmptyMessage.length).toBeGreaterThan(0);
    });
  });

  describe('isEmptyWorkspace$', () => {
    it('waits until modules, racks, and patches have all loaded', () => {
      const { comp, ds } = makeComp();
      const values: boolean[] = [];
      comp.isEmptyWorkspace$.subscribe(value => values.push(value));

      ds.modulesData$.next([]);
      ds.rackData$.next([]);

      expect(values).toEqual([]);

      ds.patchesData$.next([]);

      expect(values).toEqual([true]);
    });

    it('is false when any core workspace content exists', () => {
      const { comp, ds } = makeComp();
      const values: boolean[] = [];
      comp.isEmptyWorkspace$.subscribe(value => values.push(value));

      ds.modulesData$.next([]);
      ds.rackData$.next([rackFixture()]);
      ds.patchesData$.next([]);

      expect(values).toEqual([false]);
    });

    it('keeps the last resolved state while a list refreshes', () => {
      const { comp, ds } = makeComp();
      const values: boolean[] = [];
      comp.isEmptyWorkspace$.subscribe(value => values.push(value));

      ds.modulesData$.next([]);
      ds.rackData$.next([]);
      ds.patchesData$.next([]);
      ds.rackData$.next(undefined);

      expect(values).toEqual([true]);
    });
  });

  describe('ngOnInit', () => {
    it('calls updateSeo when ignoreSeo=false', () => {
      const { comp, seo } = makeComp();
      comp.ngOnInit();
      expect(seo.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({ title: 'User collection' }),
        'My collection'
      );
    });

    it('does not call updateSeo when ignoreSeo=true', () => {
      const { comp, seo } = makeComp({ ignoreSeo: true });
      comp.ngOnInit();
      expect(seo.updateSeo).not.toHaveBeenCalled();
    });

    it('calls dataService.connectDiscovery on init', () => {
      const { comp, ds } = makeComp();
      comp.ngOnInit();
      expect(ds.connectDiscovery).toHaveBeenCalled();
    });

    it('requests workspace data on init', () => {
      const { comp, ds } = makeComp();
      spyOn(ds.updateModulesData$, 'next');
      spyOn(ds.updateRackData$, 'next');
      spyOn(ds.updatePatchesData$, 'next');
      spyOn(ds.updateManualsData$, 'next');
      spyOn(ds.updateCommentsData$, 'next');
      spyOn(ds.updateContributorStats$, 'next');

      comp.ngOnInit();

      expect(ds.updateModulesData$.next).toHaveBeenCalled();
      expect(ds.updateRackData$.next).toHaveBeenCalledWith(undefined);
      expect(ds.updatePatchesData$.next).toHaveBeenCalled();
      expect(ds.updateManualsData$.next).toHaveBeenCalled();
      expect(ds.updateCommentsData$.next).toHaveBeenCalled();
      expect(ds.updateContributorStats$.next).toHaveBeenCalled();
    });
  });

  describe('publicProfilePath', () => {
    it('returns /u/<username>', () => {
      expect(makeComp().comp.publicProfilePath('alice')).toBe('/u/alice');
    });
  });

  describe('profileVisibilityDescription', () => {
    it('returns public message when true', () => {
      const msg = makeComp().comp.profileVisibilityDescription(true);
      expect(msg).toContain('Public profile is visible');
    });

    it('returns hidden message when false', () => {
      const msg = makeComp().comp.profileVisibilityDescription(false);
      expect(msg).toContain('hidden from visitors');
    });
  });

  describe('copyPublicProfileLink', () => {
    it('delegates to urlCreatorService.copyLinkToClipboard with correct path', () => {
      const { comp, urlCreator } = makeComp();
      comp.copyPublicProfileLink('bob');
      expect(urlCreator.copyLinkToClipboard).toHaveBeenCalledWith('/u/bob');
    });
  });

  describe('toggleProfileVisibility', () => {
    it('calls userService.updateProfileVisibility$', () => {
      const { comp, userService } = makeComp();
      comp.toggleProfileVisibility(true);
      expect(userService.updateProfileVisibility$).toHaveBeenCalledWith(true);
    });
  });

  describe('ngOnDestroy', () => {
    it('calls dataService.resetUiState', () => {
      const { comp, ds } = makeComp();
      comp.ngOnDestroy();
      expect(ds.resetUiState).toHaveBeenCalled();
    });
  });
});
