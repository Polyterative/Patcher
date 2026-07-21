import {
  BehaviorSubject,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DbComment } from 'src/app/models/comment';
import { DbModule, MinimalModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import { RichUserModel, SimpleUserModel } from 'src/app/features/backend/supabase.types';
import { CurrentUserContributorStats } from 'src/app/features/backend/supabase-queries';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from '../user-area-data.service';
import { PublicUser } from 'src/app/models/user';
import { MinimalManufacturer } from 'src/app/models/manufacturer';
import { Standard } from 'src/app/models/standard';


// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CREATED = '2024-01-01T00:00:00.000Z';
const MOCK_UPDATED = '2024-01-02T00:00:00.000Z';

const MOCK_AUTHOR: PublicUser = {
  id: 'user-123',
  username: 'testuser',
};

const MOCK_MANUFACTURER: MinimalManufacturer = {
  id: 1,
  name: 'Test Instruments',
};

const MOCK_STANDARD: Standard = {
  id: 0,
  name: 'Eurorack',
};

export const MOCK_USER_PROFILE = {
  id: 'user-123',
  username: 'testuser',
  public: false,
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const MOCK_MODULES: MinimalModule[] = [
  {
    id: 1,
    name: 'VCO Alpha',
    hp: 8,
    description: 'Oscillator',
    public: false,
    manufacturer: MOCK_MANUFACTURER,
    manufacturerId: MOCK_MANUFACTURER.id,
    standard: MOCK_STANDARD,
    tags: [],
    panels: [],
    created: MOCK_CREATED,
    updated: MOCK_UPDATED,
  },
  {
    id: 2,
    name: 'VCF Beta',
    hp: 12,
    description: 'Filter',
    public: false,
    manufacturer: MOCK_MANUFACTURER,
    manufacturerId: MOCK_MANUFACTURER.id,
    standard: MOCK_STANDARD,
    tags: [],
    panels: [],
    created: MOCK_CREATED,
    updated: MOCK_UPDATED,
  },
];

export const MOCK_PATCHES: Patch[] = [
  {
    id: 10,
    author: MOCK_AUTHOR,
    name: 'Patch One',
    description: 'First patch',
    public: false,
    created: MOCK_CREATED,
    updated: MOCK_UPDATED,
  },
  {
    id: 11,
    author: MOCK_AUTHOR,
    name: 'Patch Two',
    description: 'Second patch',
    public: false,
    created: MOCK_CREATED,
    updated: MOCK_UPDATED,
  },
];

export const MOCK_RACKS: Rack[] = [
  {
    id: 20,
    name: 'Rack Alpha',
    hp: 104,
    rows: 3,
    author: MOCK_AUTHOR,
    locked: false,
    public: false,
    created: MOCK_CREATED,
    updated: MOCK_UPDATED,
  },
  {
    id: 21,
    name: 'Rack Beta',
    hp: 84,
    rows: 2,
    author: MOCK_AUTHOR,
    locked: false,
    public: false,
    created: MOCK_CREATED,
    updated: MOCK_UPDATED,
  },
];

// ─── Mock factories ───────────────────────────────────────────────────────────

/**
 * Creates a mock UserManagementService with all user-area-relevant observables.
 */
export function createMockUserManagementService() {
  const loggedUser$ = new ReplaySubject<SimpleUserModel | undefined>(1);
  const loggedUserFullProfile$ = new ReplaySubject<RichUserModel | undefined>(1);
  
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
  const modulesData$ = new BehaviorSubject<MinimalModule[] | undefined>(undefined);
  const patchesData$ = new BehaviorSubject<Patch[] | undefined>(undefined);
  const rackData$ = new BehaviorSubject<Rack[] | undefined>(undefined);
  const manualsData$ = new BehaviorSubject<DbModule[] | undefined>(undefined);
  const commentsData$ = new BehaviorSubject<DbComment[] | undefined>(undefined);
  const contributorStats$ = new BehaviorSubject<CurrentUserContributorStats | undefined>(undefined);
  const moduleCollectionFilter$ = new BehaviorSubject<'MY_MODULES' | 'WISHLIST' | 'FOR_SALE'>('MY_MODULES');
  const activeTagFilter$ = new BehaviorSubject<string | null>(null);
  
  const updateModulesData$ = new Subject<void>();
  const updatePatchesData$ = new Subject<void>();
  const updateRackData$ = new Subject<string | undefined>();
  const updateManualsData$ = new Subject<void>();
  const updateCommentsData$ = new Subject<void>();
  const updateContributorStats$ = new Subject<void>();
  const addPatch$ = new Subject<void>();
  const addRack$ = new Subject<void>();
  const addModulesToCollection$ = new Subject<void>();
  const selectModuleCollectionFilter$ = new Subject<'MY_MODULES' | 'WISHLIST' | 'FOR_SALE'>();
  const selectPatchTagFilter$ = new Subject<string | null>();
  selectModuleCollectionFilter$.subscribe(filter => moduleCollectionFilter$.next(filter));
  selectPatchTagFilter$.subscribe(tag => activeTagFilter$.next(tag));
  
  return {
    modulesData$,
    patchesData$,
    rackData$,
    manualsData$,
    commentsData$,
    contributorStats$,
    moduleCollectionFilter$,
    activeTagFilter$,
    updateModulesData$,
    updatePatchesData$,
    updateRackData$,
    updateManualsData$,
    updateCommentsData$,
    updateContributorStats$,
    addPatch$,
    addRack$,
    addModulesToCollection$,
    selectModuleCollectionFilter$,
    selectPatchTagFilter$,
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
    isDev: false,
    preferredPanelColor$: preferredPanelColor$.asObservable(),
    setPreferredPanelColor: jasmine.createSpy('setPreferredPanelColor'),
    _preferredPanelColor$: preferredPanelColor$,
  };
}

export function createMockAppShellLayoutService() {
  return {
    wideShell$: of(false)
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

export function asMatDialog(dialog: ReturnType<typeof createMockMatDialog>): MatDialog {
  return dialog as unknown as MatDialog;
}

export function asSupabaseService(backend: ReturnType<typeof createMockSupabaseService>): SupabaseService {
  return backend as unknown as SupabaseService;
}

export function asUserAreaDataService(dataService: ReturnType<typeof createMockUserAreaDataService>): UserAreaDataService {
  return dataService as unknown as UserAreaDataService;
}
