import { UserPatchesComponent } from './user-patches.component';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { type CachedEntity } from 'src/app/features/backend/supabase.cache';

describe('UserPatchesComponent', () => {
  let comp: UserPatchesComponent;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockBackend: SupabaseService;
  let mockDataService: jasmine.SpyObj<UserAreaDataService>;

  beforeEach(() => {
    mockDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    mockBackend = jasmine.createSpyObj<SupabaseService>('SupabaseService', [], {
      cacheResetter$: new Subject<CachedEntity[]>()
    });
    mockDataService = jasmine.createSpyObj<UserAreaDataService>(
      'UserAreaDataService',
      ['connectDiscovery'],
      { updatePatchesData$: new Subject<void>() }
    );
    spyOn(mockDataService.updatePatchesData$, 'next').and.callThrough();
    comp = new UserPatchesComponent(
      mockDialog,
      mockBackend,
      mockDataService,
    );
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('calls updatePatchesData$.next() in constructor', () => {
    expect(mockDataService.updatePatchesData$.next).toHaveBeenCalledOnceWith();
  });

  it('globalSearchQuery defaults to empty string', () => {
    expect(comp.globalSearchQuery).toBe('');
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

  it('globalSearchQuery input can be assigned', () => {
    comp.globalSearchQuery = 'bass';
    expect(comp.globalSearchQuery).toBe('bass');
  });

  it('hides Cool from visible filters unless the parent opts in', () => {
    expect(comp.visibleFilters().map(filter => filter.value)).toEqual(['PERSONAL']);
  });

  it('exposes the Cool filter when the parent opts in', () => {
    comp.showCoolFilter = true;

    expect(comp.visibleFilters().map(filter => filter.value)).toEqual(['PERSONAL', 'COOL']);
  });
});
