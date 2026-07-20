import {
  UserModulesComponent,
  userModulesDefaultViewConfig
} from './user-modules.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  UserAreaDataService,
  UserModuleCollectionFilter
} from 'src/app/features/routes/user-area/user-area-data.service';
import { Subject, BehaviorSubject } from 'rxjs';

function mockBackend(): SupabaseService {
  return {} as unknown as SupabaseService;
}

function mockDataService(): UserAreaDataService {
  const moduleCollectionFilter$ = new BehaviorSubject('MY_MODULES');
  const selectModuleCollectionFilter$ = new Subject<UserModuleCollectionFilter>();
  selectModuleCollectionFilter$.subscribe(filter => moduleCollectionFilter$.next(filter));

  return {
    updateModulesData$: new Subject<void>(),
    modulesData$: new BehaviorSubject(undefined),
    moduleCollectionFilter$,
    selectModuleCollectionFilter$
  } as unknown as UserAreaDataService;
}

describe('UserModulesComponent', () => {
  let comp: UserModulesComponent;
  let ds: UserAreaDataService;

  beforeEach(() => {
    ds = mockDataService();
    comp = new UserModulesComponent(mockBackend(), ds);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('emits updateModulesData$ on construction', () => {
    let emitted = false;
    const ds2 = mockDataService();
    ds2.updateModulesData$.subscribe(() => emitted = true);
    new UserModulesComponent(mockBackend(), ds2);
    expect(emitted).toBeTrue();
  });

  it('userModulesComponentViewConfig defaults to userModulesDefaultViewConfig', () => {
    expect(comp.userModulesComponentViewConfig).toEqual(userModulesDefaultViewConfig);
  });

  it('encloseVertically defaults to true', () => {
    expect(comp.encloseVertically).toBeTrue();
  });

  it('globalSearchQuery defaults to empty string', () => {
    expect(comp.globalSearchQuery).toBe('');
  });

  it('hides Cool from visible filters until the feature is enabled', () => {
    expect(comp.visibleFilters().map((filter) => filter.value)).toEqual(['MY_MODULES', 'WISHLIST', 'FOR_SALE']);
    comp.showCoolFilter = true;
    expect(comp.visibleFilters().map((filter) => filter.value)).toEqual(['MY_MODULES', 'WISHLIST', 'FOR_SALE', 'COOL']);
  });

  it('keeps Cool selection local and forwards ownership filters to shared data', () => {
    comp.selectFilter('COOL');
    expect(comp.activeSectionFilter$.value).toBe('COOL');
    expect(ds.moduleCollectionFilter$.value).toBe('MY_MODULES');

    comp.selectFilter('WISHLIST');
    expect(comp.activeSectionFilter$.value).toBe('WISHLIST');
    expect(ds.moduleCollectionFilter$.value).toBe('WISHLIST');
  });
});

describe('userModulesDefaultViewConfig', () => {
  it('hideAddModulesButton is false', () => {
    expect(userModulesDefaultViewConfig.hideAddModulesButton).toBeFalse();
  });
});
