import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  ManufacturerDetail,
  ManufacturerDetailDataService
} from 'src/app/features/manufacturer-detail/manufacturer-detail-data.service';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';


describe('ManufacturerDetailDataService', () => {
  interface ManufacturerResponse {
    data: ManufacturerDetail | null;
  }

  type ManufacturerWithId = (id: number) => Observable<ManufacturerResponse>;
  type ModulesBySameManufacturer = (manufacturerId: number, from: number, to: number) => Observable<ModuleList>;

  interface DetailBackendDouble {
    get: {
      manufacturerWithId: jasmine.Spy<ManufacturerWithId>;
      modulesBySameManufacturer: jasmine.Spy<ModulesBySameManufacturer>;
    };
    storage: {
      publicUrlBases: {
        manufacturerLogos: string;
      };
    };
  }

  interface SnackBarDouble {
    open: jasmine.Spy;
  }

  interface AnalyticsDouble {
    capture: jasmine.Spy<(event: string, props?: Record<string, unknown>) => void>;
    identify: jasmine.Spy<AnalyticsService['identify']>;
    reset: jasmine.Spy<AnalyticsService['reset']>;
  }

  function build() {
    const mockManufacturer: ManufacturerResponse = {
      data: {id: 1, name: 'Doepfer', logo: null, websiteURL: 'https://doepfer.de', adminUser: null}
    };
    const mockModules: ModuleList = [
      {
        id: 10,
        name: 'A-110-1',
        description: '',
        hp: 8,
        public: true,
        manufacturer: {id: 1, name: 'Doepfer'},
        manufacturerId: 1,
        standard: {id: 0, name: '3U'},
        tags: [],
        panels: [],
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 11,
        name: 'A-118',
        description: '',
        hp: 8,
        public: true,
        manufacturer: {id: 1, name: 'Doepfer'},
        manufacturerId: 1,
        standard: {id: 0, name: '3U'},
        tags: [],
        panels: [],
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
      },
    ];
    
    const backend = {
      get: {
        manufacturerWithId: jasmine.createSpy<ManufacturerWithId>('manufacturerWithId').and.returnValue(of(mockManufacturer)),
        modulesBySameManufacturer: jasmine.createSpy<ModulesBySameManufacturer>('modulesBySameManufacturer').and.returnValue(of(mockModules))
      },
      storage: {
        publicUrlBases: {
          manufacturerLogos: 'https://cdn.example.test/manufacturer-logos/'
        }
      }
    } satisfies DetailBackendDouble;
    
    const snackBar: SnackBarDouble = {open: jasmine.createSpy('open')};
    const analytics: AnalyticsDouble = {
      capture: jasmine.createSpy<(event: string, props?: Record<string, unknown>) => void>('capture'),
      identify: jasmine.createSpy<AnalyticsService['identify']>('identify'),
      reset: jasmine.createSpy<AnalyticsService['reset']>('reset'),
    };
    
    const service = new ManufacturerDetailDataService(
      backend as unknown as SupabaseService,
      snackBar as unknown as MatSnackBar,
      analytics as unknown as AnalyticsService
    );
    
    return {service, backend, snackBar, mockManufacturer, mockModules};
  }
  
  afterEach(() => {
    // cleanup
  });
  
  describe('API surface', () => {
    it('should expose updateManufacturer$ ReplaySubject', () => {
      const {service} = build();
      expect(service.updateManufacturer$).toBeDefined();
      expect(typeof service.updateManufacturer$.next).toBe('function');
      service.ngOnDestroy();
    });
    
    it('should expose manufacturerData$ Observable', () => {
      const {service} = build();
      expect(service.manufacturerData$).toBeDefined();
      expect(typeof service.manufacturerData$.subscribe).toBe('function');
      service.ngOnDestroy();
    });
    
    it('should expose modulesData$ Observable', () => {
      const {service} = build();
      expect(service.modulesData$).toBeDefined();
      expect(typeof service.modulesData$.subscribe).toBe('function');
      service.ngOnDestroy();
    });
    
    it('should expose isLoading$ Observable', () => {
      const {service} = build();
      expect(service.isLoading$).toBeDefined();
      expect(typeof service.isLoading$.subscribe).toBe('function');
      service.ngOnDestroy();
    });

    it('should expose the backend manufacturer logo storage base', () => {
      const {service} = build();
      expect(service.logoStorageBase).toBe('https://cdn.example.test/manufacturer-logos/');
      service.ngOnDestroy();
    });
  });
  
  describe('updateManufacturer$ handler', () => {
    it('should call backend.get.manufacturerWithId when updateManufacturer$ fires', fakeAsync(() => {
      const {service, backend} = build();
      service.updateManufacturer$.next(1);
      tick();
      expect(backend.get.manufacturerWithId).toHaveBeenCalledWith(1);
      service.ngOnDestroy();
    }));
    
    it('should call backend.get.modulesBySameManufacturer after manufacturer loads', fakeAsync(() => {
      const {service, backend} = build();
      service.updateManufacturer$.next(1);
      tick();
      expect(backend.get.modulesBySameManufacturer).toHaveBeenCalledWith(1, 0, 200);
      service.ngOnDestroy();
    }));
    
    it('should set manufacturerData$ to the returned manufacturer', fakeAsync(() => {
      const {service, mockManufacturer} = build();
      let result: ManufacturerDetail | null | undefined;
      service.manufacturerData$.subscribe(m => result = m);
      service.updateManufacturer$.next(1);
      tick();
      expect(result).toEqual(mockManufacturer.data);
      service.ngOnDestroy();
    }));
    
    it('should set modulesData$ to the returned modules list', fakeAsync(() => {
      const {service, mockModules} = build();
      let result: ModuleList | undefined;
      service.modulesData$.subscribe(m => result = m);
      service.updateManufacturer$.next(1);
      tick();
      expect(result).toEqual(mockModules);
      service.ngOnDestroy();
    }));
    
    it('should reset to null when a new id is triggered before data loads', fakeAsync(() => {
      const {service} = build();
      const manufacturerValues: (ManufacturerDetail | null)[] = [];
      const modulesValues: ModuleList[] = [];
      service.manufacturerData$.subscribe(v => manufacturerValues.push(v));
      service.modulesData$.subscribe(v => modulesValues.push(v));
      service.updateManufacturer$.next(1);
      tick();
      // Trigger again — should see null between resets
      service.updateManufacturer$.next(2);
      tick();
      // Should have had null emitted between the two loads
      expect(manufacturerValues).toContain(null);
      expect(modulesValues).toContain(null);
      service.ngOnDestroy();
    }));
    
    it('should set isLoading$ to false after successful load', fakeAsync(() => {
      const {service} = build();
      const loadingValues: boolean[] = [];
      service.isLoading$.subscribe(v => loadingValues.push(v));
      service.updateManufacturer$.next(1);
      tick();
      expect(loadingValues[loadingValues.length - 1]).toBe(false);
      service.ngOnDestroy();
    }));
  });
  
  describe('error handling', () => {
    it('should not throw when backend.get.manufacturerWithId errors', fakeAsync(() => {
      const {service, backend, snackBar} = build();
      backend.get.manufacturerWithId.and.returnValue(throwError(() => new Error('Network error')));
      expect(() => {
        service.updateManufacturer$.next(1);
        tick();
      }).not.toThrow();
      service.ngOnDestroy();
    }));
    
    it('should set isLoading$ to false after error', fakeAsync(() => {
      const {service, backend} = build();
      backend.get.manufacturerWithId.and.returnValue(throwError(() => new Error('err')));
      const loadingValues: boolean[] = [];
      service.isLoading$.subscribe(v => loadingValues.push(v));
      service.updateManufacturer$.next(1);
      tick();
      expect(loadingValues[loadingValues.length - 1]).toBe(false);
      service.ngOnDestroy();
    }));
  });
});