import {
  BehaviorSubject,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import { MinimalModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';


// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_USER_PROFILE = {
  id: 'user-123',
  username: 'testuser',
  public: false,
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const MOCK_MODULES: Partial<MinimalModule>[] = [
  {id: 1, name: 'VCO Alpha', hp: 8, description: 'Oscillator'},
  {id: 2, name: 'VCF Beta', hp: 12, description: 'Filter'},
];

export const MOCK_PATCHES: Partial<Patch>[] = [
  {id: 10, name: 'Patch One', description: 'First patch'},
  {id: 11, name: 'Patch Two', description: 'Second patch'},
];

export const MOCK_RACKS: Partial<Rack>[] = [
  {id: 20, name: 'Rack Alpha', hp: 104, rows: 3},
  {id: 21, name: 'Rack Beta', hp: 84, rows: 2},
];

// ─── Mock factories ───────────────────────────────────────────────────────────

/**
 * Creates a mock UserManagementService with all user-area-relevant observables.
 */
export function createMockUserManagementService() {
  const loggedUser$ = new ReplaySubject<any>(1);
  const loggedUserFullProfile$ = new ReplaySubject<any>(1);
  
  loggedUser$.next(undefined);
  loggedUserFullProfile$.next(undefined);
  
  return {
    loggedUser$: loggedUser$.asObservable(),
    loggedUserFullProfile$: loggedUserFullProfile$.asObservable(),
    updateProfileVisibility$: jasmine.createSpy('updateProfileVisibility$').and.returnValue(of(void 0)),
    // internal subjects for test control
    _loggedUser$: loggedUser$,
    _loggedUserFullProfile$: loggedUserFullProfile$,
  };
}

/**
 * Creates a mock UserAreaDataService that mirrors all BehaviorSubjects and
 * action Subjects needed by UserAreaRootComponent and its children.
 */
export function createMockUserAreaDataService() {
  const modulesData$ = new BehaviorSubject<any[] | undefined>(undefined);
  const patchesData$ = new BehaviorSubject<any[] | undefined>(undefined);
  const rackData$ = new BehaviorSubject<any[] | undefined>(undefined);
  const manualsData$ = new BehaviorSubject<any[] | undefined>(undefined);
  const commentsData$ = new BehaviorSubject<any[] | undefined>(undefined);
  const contributorStats$ = new BehaviorSubject<any | undefined>(undefined);
  
  const updateModulesData$ = new Subject<void>();
  const updatePatchesData$ = new Subject<void>();
  const updateRackData$ = new Subject<string | undefined>();
  const updateManualsData$ = new Subject<void>();
  const updateCommentsData$ = new Subject<void>();
  const updateContributorStats$ = new Subject<void>();
  const addPatch$ = new Subject<void>();
  const addRack$ = new Subject<void>();
  const addModulesToCollection$ = new Subject<void>();
  
  return {
    modulesData$,
    patchesData$,
    rackData$,
    manualsData$,
    commentsData$,
    contributorStats$,
    updateModulesData$,
    updatePatchesData$,
    updateRackData$,
    updateManualsData$,
    updateCommentsData$,
    updateContributorStats$,
    addPatch$,
    addRack$,
    addModulesToCollection$,
    connectDiscovery: jasmine.createSpy('connectDiscovery'),
    resetUiState: jasmine.createSpy('resetUiState'),
  };
}

/**
 * Creates a mock SupabaseService covering read paths used by user-area components.
 */
export function createMockSupabaseService() {
  return {
    GET: {
      currentUserComments: jasmine.createSpy('currentUserComments').and.returnValue(of([])),
      currentUserModules: jasmine.createSpy('currentUserModules').and.returnValue(of([])),
      currentUserContributorStats: jasmine.createSpy('currentUserContributorStats').and.returnValue(of({
        modulesSubmitted: 0,
        approvedModules: 0,
        pendingModules: 0,
        commentsPosted: 0,
        moduleFlagsSubmitted: 0
      })),
    },
    get: {
      currentUserPatches: jasmine.createSpy('currentUserPatches').and.returnValue(of([])),
      currentUserRacks: jasmine.createSpy('currentUserRacks').and.returnValue(of([])),
    },
  };
}

/**
 * Creates a mock SeoAndUtilsService.
 */
export function createMockSeoAndUtilsService() {
  return {
    updateSeo: jasmine.createSpy('updateSeo'),
  };
}

export function createMockUrlCreatorService() {
  return {
    copyLinkToClipboard: jasmine.createSpy('copyLinkToClipboard'),
  };
}

export function createMockDiscoveryTipService() {
  return {
    updateUserAreaSnapshot: jasmine.createSpy('updateUserAreaSnapshot'),
    recordAction: jasmine.createSpy('recordAction'),
  };
}

/**
 * Creates a mock AppStateService.
 */
export function createMockAppStateService() {
  const preferredPanelColor$ = new BehaviorSubject<number | null>(null);
  return {
    preferredPanelColor$: preferredPanelColor$.asObservable(),
    setPreferredPanelColor: jasmine.createSpy('setPreferredPanelColor'),
    _preferredPanelColor$: preferredPanelColor$,
  };
}

/**
 * Creates a mock MatDialog.
 */
export function createMockMatDialog() {
  return {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(true),
    }),
  };
}
