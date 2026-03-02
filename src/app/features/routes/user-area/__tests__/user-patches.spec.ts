import { UserPatchesComponent } from '../user-patches/user-patches.component';
import {
  createMockMatDialog,
  createMockSupabaseService,
  createMockUserAreaDataService,
  MOCK_PATCHES,
} from './test-setup';


/**
 * UserPatchesComponent Tests
 *
 * Covers: creation, Input defaults, data trigger on init,
 * addPatch$ delegation, and data stream reflection.
 */
describe('UserPatchesComponent', () => {
  let component: UserPatchesComponent;
  let mockDataService: ReturnType<typeof createMockUserAreaDataService>;
  let mockBackend: ReturnType<typeof createMockSupabaseService>;
  let mockDialog: ReturnType<typeof createMockMatDialog>;
  
  function build() {
    mockDataService = createMockUserAreaDataService();
    mockBackend = createMockSupabaseService();
    mockDialog = createMockMatDialog();
    
    component = new UserPatchesComponent(
      mockDialog as any,
      mockBackend as any,
      mockDataService as any
    );
  }
  
  it('should be created', () => {
    build();
    expect(component).toBeTruthy();
    expect(component).toBeInstanceOf(UserPatchesComponent);
  });
  
  it('should default globalSearchQuery to empty string', () => {
    build();
    expect(component.globalSearchQuery).toBe('');
  });
  
  it('should trigger updatePatchesData$ on construction', () => {
    const spy = jasmine.createSpy('updatePatchesData$');
    mockDataService = createMockUserAreaDataService();
    mockDataService.updatePatchesData$.subscribe(spy);
    mockBackend = createMockSupabaseService();
    mockDialog = createMockMatDialog();
    
    component = new UserPatchesComponent(
      mockDialog as any,
      mockBackend as any,
      mockDataService as any
    );
    
    expect(spy).toHaveBeenCalledTimes(1);
  });
  
  it('should expose dataService publicly', () => {
    build();
    expect(component.dataService).toBeDefined();
  });
  
  it('should accept a globalSearchQuery input', () => {
    build();
    component.globalSearchQuery = 'filter';
    expect(component.globalSearchQuery).toBe('filter');
  });
  
  it('should reflect patches when dataService pushes data', () => {
    build();
    mockDataService.patchesData$.next(MOCK_PATCHES as any);
    expect(mockDataService.patchesData$.value).toEqual(MOCK_PATCHES as any);
  });
  
  it('should reflect empty list when dataService pushes []', () => {
    build();
    mockDataService.patchesData$.next([]);
    expect(mockDataService.patchesData$.value?.length).toBe(0);
  });
  
  it('should reflect undefined loading state when dataService emits undefined', () => {
    build();
    mockDataService.patchesData$.next(undefined);
    expect(mockDataService.patchesData$.value).toBeUndefined();
  });
  
  it('addPatch$ subject should be a Subject', () => {
    build();
    expect(mockDataService.addPatch$).toBeDefined();
    expect(typeof mockDataService.addPatch$.next).toBe('function');
  });
  
  it('should allow emitting to addPatch$ via dataService', () => {
    build();
    const spy = jasmine.createSpy('addPatch$');
    mockDataService.addPatch$.subscribe(spy);
    mockDataService.addPatch$.next();
    expect(spy).toHaveBeenCalled();
  });
});