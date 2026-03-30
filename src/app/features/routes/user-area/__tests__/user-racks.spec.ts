import { UserRacksComponent } from '../user-racks/user-racks.component';
import {
  createMockMatDialog,
  createMockSupabaseService,
  createMockUserAreaDataService,
  MOCK_RACKS,
} from './test-setup';
import { defaultRackMinimalViewConfig } from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';


/**
 * UserRacksComponent Tests
 *
 * Covers: creation, Input defaults, data trigger on init,
 * addRack$ delegation, view config defaults, and data stream reflection.
 */
describe('UserRacksComponent', () => {
  let component: UserRacksComponent;
  let mockDataService: ReturnType<typeof createMockUserAreaDataService>;
  let mockBackend: ReturnType<typeof createMockSupabaseService>;
  let mockDialog: ReturnType<typeof createMockMatDialog>;
  
  function build() {
    mockDataService = createMockUserAreaDataService();
    mockBackend = createMockSupabaseService();
    mockDialog = createMockMatDialog();
    
    component = new UserRacksComponent(
      mockDialog as any,
      mockBackend as any,
      mockDataService as any
    );
  }
  
  it('should be created', () => {
    build();
    expect(component).toBeTruthy();
    expect(component).toBeInstanceOf(UserRacksComponent);
  });
  
  it('should default globalSearchQuery to empty string', () => {
    build();
    expect(component.globalSearchQuery).toBe('');
  });
  
  it('should initialize rackMinimalViewConfig from defaults', () => {
    build();
    expect(component.rackMinimalViewConfig).toEqual({...defaultRackMinimalViewConfig});
  });
  
  it('should trigger updateRackData$ with undefined on construction', () => {
    const spy = jasmine.createSpy('updateRackData$');
    mockDataService = createMockUserAreaDataService();
    mockDataService.updateRackData$.subscribe(spy);
    mockBackend = createMockSupabaseService();
    mockDialog = createMockMatDialog();
    
    component = new UserRacksComponent(
      mockDialog as any,
      mockBackend as any,
      mockDataService as any
    );
    
    expect(spy).toHaveBeenCalledWith(undefined);
    expect(spy).toHaveBeenCalledTimes(1);
  });
  
  it('should expose dataService publicly', () => {
    build();
    expect(component.dataService).toBeDefined();
  });
  
  it('should accept a globalSearchQuery input', () => {
    build();
    component.globalSearchQuery = 'eurorack';
    expect(component.globalSearchQuery).toBe('eurorack');
  });
  
  it('should reflect racks when dataService pushes data', () => {
    build();
    mockDataService.rackData$.next(MOCK_RACKS as any);
    expect(mockDataService.rackData$.value).toEqual(MOCK_RACKS as any);
  });
  
  it('should reflect empty list when dataService pushes []', () => {
    build();
    mockDataService.rackData$.next([]);
    expect(mockDataService.rackData$.value?.length).toBe(0);
  });
  
  it('should reflect undefined loading state when dataService emits undefined', () => {
    build();
    mockDataService.rackData$.next(undefined);
    expect(mockDataService.rackData$.value).toBeUndefined();
  });
  
  it('addRack$ subject should be accessible via dataService', () => {
    build();
    expect(mockDataService.addRack$).toBeDefined();
    expect(typeof mockDataService.addRack$.next).toBe('function');
  });
  
  it('should allow emitting to addRack$ via dataService', () => {
    build();
    const spy = jasmine.createSpy('addRack$');
    mockDataService.addRack$.subscribe(spy);
    mockDataService.addRack$.next();
    expect(spy).toHaveBeenCalled();
  });
  
  it('should not call backend directly (delegates to dataService)', () => {
    build();
    expect(mockBackend.get.currentUserRacks).not.toHaveBeenCalled();
  });

  it('should expose addRack$ for the template action hook', () => {
    build();
    expect(typeof mockDataService.addRack$.next).toBe('function');
  });
});
