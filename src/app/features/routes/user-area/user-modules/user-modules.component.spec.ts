import {
  UserModulesComponent,
  userModulesDefaultViewConfig
} from './user-modules.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { Subject, BehaviorSubject } from 'rxjs';

function mockBackend(): SupabaseService {
  return {} as unknown as SupabaseService;
}

function mockDataService(): UserAreaDataService {
  return {
    updateModulesData$: new Subject<void>(),
    modulesData$: new BehaviorSubject(undefined)
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
});

describe('userModulesDefaultViewConfig', () => {
  it('hideAddModulesButton is false', () => {
    expect(userModulesDefaultViewConfig.hideAddModulesButton).toBeFalse();
  });
});
