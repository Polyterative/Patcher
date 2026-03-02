import { UserManagementComponent } from '../user-management.component';
import {
  cleanupComponentTest,
  setupComponentTest
} from './test-setup';


/**
 * Initialization Tests
 *
 * Covers: component creation, SEO calls, input binding,
 * initial form states, and observable wiring.
 */
describe('UserManagementComponent - Initialization', () => {
  let component: UserManagementComponent;
  let mockUserManagementService: any;
  let mockSeoAndUtilsService: any;
  
  beforeEach(() => {
    const setup = setupComponentTest();
    component = setup.component;
    mockUserManagementService = setup.mockUserManagementService;
    mockSeoAndUtilsService = setup.mockSeoAndUtilsService;
  });
  
  afterEach(() => cleanupComponentTest());
  
  it('should be created', () => {
    expect(component).toBeTruthy();
    expect(component).toBeInstanceOf(UserManagementComponent);
  });
  
  it('should default ignoreSeo to false', () => {
    expect(component.ignoreSeo).toBe(false);
  });
  
  it('should call updateSeo on ngOnInit when ignoreSeo is false', () => {
    expect(mockSeoAndUtilsService.updateSeo).toHaveBeenCalledWith(
      {title: 'Account Management', description: 'Personal account management.'},
      'Account Management'
    );
  });
  
  it('should NOT call updateSeo on ngOnInit when ignoreSeo is true', () => {
    cleanupComponentTest();
    const setup = setupComponentTest(true);
    expect(setup.mockSeoAndUtilsService.updateSeo).not.toHaveBeenCalled();
  });
  
  it('should start with editingUsername as false', () => {
    expect(component.editingUsername).toBe(false);
  });
  
  it('should initialize usernameControl with empty value', () => {
    expect(component.usernameControl.value).toBe('');
  });
  
  it('should initialize passwordForm with empty newPassword and confirmPassword', () => {
    expect(component.passwordForm.get('newPassword')!.value).toBe('');
    expect(component.passwordForm.get('confirmPassword')!.value).toBe('');
  });
  
  it('should expose userManagementService publicly', () => {
    expect(component.userManagementService).toBeDefined();
  });
});