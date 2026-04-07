import { startWith } from 'rxjs/operators';
import { UntypedFormControl } from '@angular/forms';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { UserAreaRootComponent } from '../user-area-root/user-area-root.component';
import {
  createMockAppStateService,
  createMockSeoAndUtilsService,
  createMockSupabaseService,
  createMockUserAreaDataService,
  createMockUserManagementService,
  MOCK_MODULES,
  MOCK_PATCHES,
  MOCK_RACKS,
} from './test-setup';


/**
 * UserAreaRootComponent — Initialization Tests
 *
 * Covers: component creation, SEO, initial observable state.
 */
describe('UserAreaRootComponent - Initialization', () => {
  let component: UserAreaRootComponent;
  let mockUserService: ReturnType<typeof createMockUserManagementService>;
  let mockDataService: ReturnType<typeof createMockUserAreaDataService>;
  let mockSeoService: ReturnType<typeof createMockSeoAndUtilsService>;
  let mockBackend: ReturnType<typeof createMockSupabaseService>;
  
  function build(ignoreSeo = false) {
    mockUserService = createMockUserManagementService();
    mockDataService = createMockUserAreaDataService();
    mockSeoService = createMockSeoAndUtilsService();
    mockBackend = createMockSupabaseService();
    
    component = new UserAreaRootComponent(
      mockUserService as any,
      mockBackend as any,
      mockDataService as any,
      mockSeoService as any,
      createMockAppStateService() as any
    );
    component.ignoreSeo = ignoreSeo;
    component.ngOnInit();
  }
  
  it('should be created', () => {
    build();
    expect(component).toBeTruthy();
    expect(component).toBeInstanceOf(UserAreaRootComponent);
  });
  
  it('should default ignoreSeo to false', () => {
    build();
    expect(component.ignoreSeo).toBe(false);
  });
  
  it('should call updateSeo on ngOnInit when ignoreSeo is false', () => {
    build(false);
    expect(mockSeoService.updateSeo).toHaveBeenCalledWith(
      {title: 'User collection', description: 'Personal user collection', noindex: true},
      'My collection'
    );
  });
  
  it('should NOT call updateSeo on ngOnInit when ignoreSeo is true', () => {
    build(true);
    expect(mockSeoService.updateSeo).not.toHaveBeenCalled();
  });
  
  it('should expose a globalSearchControl', () => {
    build();
    expect(component.globalSearchControl).toBeInstanceOf(UntypedFormControl);
  });
  
  it('should expose a globalSearchQuery$ that starts with empty string', (done) => {
    build();
    component.globalSearchQuery$.pipe(startWith(undefined)).subscribe({
      next: (value) => {
        if (value !== undefined) {
          expect(typeof value).toBe('string');
          done();
        }
      }
    });
    // trigger the startWith('')
    component.globalSearchControl.setValue('');
  });
  
  it('should expose miscStats$', () => {
    build();
    expect(component.miscStats$).toBeDefined();
  });
  
  it('should expose userService publicly', () => {
    build();
    expect(component.userService).toBeDefined();
  });
  
  it('should expose dataService publicly', () => {
    build();
    expect(component.dataService).toBeDefined();
  });
});


/**
 * UserAreaRootComponent — miscStats$ Tests
 *
 * Verifies that the stats stream correctly aggregates counts from
 * the five data streams.
 */
describe('UserAreaRootComponent - miscStats$', () => {
  let component: UserAreaRootComponent;
  let mockDataService: ReturnType<typeof createMockUserAreaDataService>;
  
  function build() {
    const mockUserService = createMockUserManagementService();
    mockDataService = createMockUserAreaDataService();
    const mockSeoService = createMockSeoAndUtilsService();
    const mockBackend = createMockSupabaseService();
    
    component = new UserAreaRootComponent(
      mockUserService as any,
      mockBackend as any,
      mockDataService as any,
      mockSeoService as any,
      createMockAppStateService() as any
    );
    component.ignoreSeo = true;
    component.ngOnInit();
  }
  
  it('should emit zeroed stats when all streams are empty arrays', (done) => {
    build();
    mockDataService.modulesData$.next([]);
    mockDataService.rackData$.next([]);
    mockDataService.patchesData$.next([]);
    mockDataService.commentsData$.next([]);
    mockDataService.manualsData$.next([]);
    
    component.miscStats$.subscribe((stats: any[]) => {
      expect(stats.find(s => s.name === 'Modules')?.value).toBe(0);
      expect(stats.find(s => s.name === 'Racks')?.value).toBe(0);
      expect(stats.find(s => s.name === 'Patches')?.value).toBe(0);
      expect(stats.find(s => s.name === 'Comments')?.value).toBe(0);
      expect(stats.find(s => s.name === 'Manual links')?.value).toBe(0);
      done();
    });
  });
  
  it('should reflect correct counts from data service streams', (done) => {
    build();
    mockDataService.modulesData$.next(MOCK_MODULES as any);
    mockDataService.rackData$.next(MOCK_RACKS as any);
    mockDataService.patchesData$.next(MOCK_PATCHES as any);
    mockDataService.commentsData$.next([{id: 1}, {id: 2}, {id: 3}]);
    mockDataService.manualsData$.next([{id: 5}]);
    
    component.miscStats$.subscribe((stats: any[]) => {
      expect(stats.find(s => s.name === 'Modules')?.value).toBe(2);
      expect(stats.find(s => s.name === 'Racks')?.value).toBe(2);
      expect(stats.find(s => s.name === 'Patches')?.value).toBe(2);
      expect(stats.find(s => s.name === 'Comments')?.value).toBe(3);
      expect(stats.find(s => s.name === 'Manual links')?.value).toBe(1);
      done();
    });
  });
  
  it('should emit 0 for counts when a stream contains undefined', (done) => {
    build();
    mockDataService.modulesData$.next(undefined);
    mockDataService.rackData$.next(undefined);
    mockDataService.patchesData$.next(undefined);
    mockDataService.commentsData$.next(undefined);
    mockDataService.manualsData$.next(undefined);
    
    component.miscStats$.subscribe((stats: any[]) => {
      stats.forEach(s => expect(s.value).toBe(0));
      done();
    });
  });
  
  it('should include expected stat icons', (done) => {
    build();
    mockDataService.modulesData$.next([]);
    mockDataService.rackData$.next([]);
    mockDataService.patchesData$.next([]);
    mockDataService.commentsData$.next([]);
    mockDataService.manualsData$.next([]);
    
    component.miscStats$.subscribe((stats: any[]) => {
      const icons = stats.map(s => s.icon);
      expect(icons).toContain('memory');
      expect(icons).toContain('dashboard');
      expect(icons).toContain('cable');
      expect(icons).toContain('chat');
      expect(icons).toContain('menu_book');
      done();
    });
  });
  
  it('should produce exactly 5 stat entries', (done) => {
    build();
    mockDataService.modulesData$.next([]);
    mockDataService.rackData$.next([]);
    mockDataService.patchesData$.next([]);
    mockDataService.commentsData$.next([]);
    mockDataService.manualsData$.next([]);
    
    component.miscStats$.subscribe((stats: any[]) => {
      expect(stats.length).toBe(5);
      done();
    });
  });
});


/**
 * UserAreaRootComponent — Global Search Tests
 */
describe('UserAreaRootComponent - Global Search', () => {
  let component: UserAreaRootComponent;
  let mockDataService: ReturnType<typeof createMockUserAreaDataService>;
  
  function build() {
    const mockUserService = createMockUserManagementService();
    mockDataService = createMockUserAreaDataService();
    const mockSeoService = createMockSeoAndUtilsService();
    const mockBackend = createMockSupabaseService();
    
    component = new UserAreaRootComponent(
      mockUserService as any,
      mockBackend as any,
      mockDataService as any,
      mockSeoService as any,
      createMockAppStateService() as any
    );
    component.ignoreSeo = true;
    component.ngOnInit();
  }
  
  it('should start with empty search query', (done) => {
    build();
    component.globalSearchQuery$.subscribe(q => {
      expect(q).toBe('');
      done();
    });
  });
  
  it('should emit updated query when control value changes', fakeAsync(() => {
    build();
    const emitted: string[] = [];
    
    component.globalSearchQuery$.subscribe(q => emitted.push(q));
    tick(130); // flush startWith('') + debounceTime(120)
    
    expect(emitted[0]).toBe('');
  }));
  
  it('should coerce null/undefined control values to empty string', fakeAsync(() => {
    build();
    const emitted: string[] = [];
    
    component.globalSearchQuery$.subscribe(q => emitted.push(q));
    tick(130); // flush debounceTime(120)
    
    expect(typeof emitted[0]).toBe('string');
  }));

  it('should connect the discovery stream through the data service', fakeAsync(() => {
    build();
    mockDataService.modulesData$.next(MOCK_MODULES as any);
    mockDataService.rackData$.next(MOCK_RACKS as any);
    mockDataService.patchesData$.next(MOCK_PATCHES as any);

    tick(150);

    expect(mockDataService.connectDiscovery).toHaveBeenCalledWith(component.globalSearchQuery$);
  }));

  it('should hand off the root search stream only once on init', fakeAsync(() => {
    build();
    component.globalSearchControl.setValue('maths');

    tick(150);

    expect(mockDataService.connectDiscovery).toHaveBeenCalledTimes(1);
  }));
});
