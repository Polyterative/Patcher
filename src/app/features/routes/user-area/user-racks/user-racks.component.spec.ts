import { UserRacksComponent } from './user-racks.component';
import { MatDialog } from '@angular/material/dialog';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { Subject } from 'rxjs';
import { defaultRackMinimalViewConfig } from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';

function mockDialog(): MatDialog {
  return {} as unknown as MatDialog;
}

function mockBackend(): SupabaseService {
  return {} as unknown as SupabaseService;
}

function mockDataService(): UserAreaDataService {
  return {
    updateRackData$: new Subject<string | undefined>()
  } as unknown as UserAreaDataService;
}

describe('UserRacksComponent', () => {
  let comp: UserRacksComponent;
  let ds: UserAreaDataService;

  beforeEach(() => {
    ds = mockDataService();
    comp = new UserRacksComponent(
      mockDialog(),
      mockBackend(),
      ds,
    );
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('emits updateRackData$ on construction', () => {
    let emitted = false;
    const ds2 = mockDataService();
    ds2.updateRackData$.subscribe(() => emitted = true);
    new UserRacksComponent(mockDialog(), mockBackend(), ds2);
    expect(emitted).toBeTrue();
  });

  it('rackMinimalViewConfig is a copy of defaultRackMinimalViewConfig', () => {
    expect(comp.rackMinimalViewConfig).toEqual(defaultRackMinimalViewConfig);
  });

  it('globalSearchQuery defaults to empty string', () => {
    expect(comp.globalSearchQuery).toBe('');
  });

  it('globalSearchQuery input can be assigned', () => {
    comp.globalSearchQuery = 'filter text';
    expect(comp.globalSearchQuery).toBe('filter text');
  });

  it('dataService is the injected mock', () => {
    expect(comp.dataService).toBe(ds);
  });
});
