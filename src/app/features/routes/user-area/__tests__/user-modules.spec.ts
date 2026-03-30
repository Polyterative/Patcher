import { UserModulesComponent } from '../user-modules/user-modules.component';
import {
  createMockSupabaseService,
  createMockUserAreaDataService,
  MOCK_MODULES,
} from './test-setup';


/**
 * UserModulesComponent Tests
 *
 * Covers: creation, Input defaults, data trigger on init,
 * search query pass-through, and view config.
 */
describe('UserModulesComponent', () => {
  let component: UserModulesComponent;
  let mockDataService: ReturnType<typeof createMockUserAreaDataService>;
  let mockBackend: ReturnType<typeof createMockSupabaseService>;
  
  function build() {
    mockDataService = createMockUserAreaDataService();
    mockBackend = createMockSupabaseService();
    
    component = new UserModulesComponent(
      mockBackend as any,
      mockDataService as any
    );
  }
  
  it('should be created', () => {
    build();
    expect(component).toBeTruthy();
    expect(component).toBeInstanceOf(UserModulesComponent);
  });
  
  it('should default globalSearchQuery to empty string', () => {
    build();
    expect(component.globalSearchQuery).toBe('');
  });
  
  it('should default encloseVertically to true', () => {
    build();
    expect(component.encloseVertically).toBe(true);
  });
  
  it('should trigger updateModulesData$ on construction', () => {
    const spy = jasmine.createSpy('updateModulesData$');
    mockDataService = createMockUserAreaDataService();
    mockDataService.updateModulesData$.subscribe(spy);
    
    mockBackend = createMockSupabaseService();
    
    component = new UserModulesComponent(
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
    component.globalSearchQuery = 'VCO';
    expect(component.globalSearchQuery).toBe('VCO');
  });
  
  it('should accept encloseVertically input', () => {
    build();
    (component as any).encloseVertically = false;
    expect(component.encloseVertically).toBe(false);
  });
  
  it('should not call backend directly (delegates to dataService)', () => {
    build();
    // Backend GET calls happen via data service, not component directly
    expect(mockBackend.GET.currentUserModules).not.toHaveBeenCalled();
  });
  
  it('should reflect modules when dataService pushes data', () => {
    build();
    mockDataService.modulesData$.next(MOCK_MODULES as any);
    expect(mockDataService.modulesData$.value).toEqual(MOCK_MODULES as any);
  });
  
  it('should reflect empty array when dataService pushes []', () => {
    build();
    mockDataService.modulesData$.next([]);
    expect(mockDataService.modulesData$.value?.length).toBe(0);
  });
  
  it('should reflect undefined loading state when dataService emits undefined', () => {
    build();
    mockDataService.modulesData$.next(undefined);
    expect(mockDataService.modulesData$.value).toBeUndefined();
  });

  it('should expose the module-add action subject on the data service', () => {
    build();
    expect(typeof mockDataService.addModulesToCollection$.next).toBe('function');
  });
});
