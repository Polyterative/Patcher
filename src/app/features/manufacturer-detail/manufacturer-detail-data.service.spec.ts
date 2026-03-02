import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  of,
  throwError
} from 'rxjs';
import { ManufacturerDetailDataService } from 'src/app/features/manufacturer-detail/manufacturer-detail-data.service';


describe('ManufacturerDetailDataService', () => {
  function build() {
    const mockManufacturer = {data: {id: 1, name: 'Doepfer', logo: null, websiteURL: 'https://doepfer.de', adminUser: null}};
    const mockModules = [{id: 10, name: 'A-110-1', manufacturer: {id: 1, name: 'Doepfer'}}, {
      id: 11,
      name: 'A-118',
      manufacturer: {id: 1, name: 'Doepfer'}
    }];
    
    const backend = {
      get: {
        manufacturerWithId: jasmine.createSpy('manufacturerWithId').and.returnValue(of(mockManufacturer)),
        modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(of(mockModules))
      }
    };
    
    const snackBar = {open: jasmine.createSpy('open')};
    
    const service = new ManufacturerDetailDataService(backend as any, snackBar as any);
    
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
      let result: any;
      service.manufacturerData$.subscribe(m => result = m);
      service.updateManufacturer$.next(1);
      tick();
      expect(result).toEqual(mockManufacturer.data);
      service.ngOnDestroy();
    }));
    
    it('should set modulesData$ to the returned modules list', fakeAsync(() => {
      const {service, mockModules} = build();
      let result: any;
      service.modulesData$.subscribe(m => result = m);
      service.updateManufacturer$.next(1);
      tick();
      expect(result).toEqual(mockModules);
      service.ngOnDestroy();
    }));
    
    it('should reset to null when a new id is triggered before data loads', fakeAsync(() => {
      const {service} = build();
      const manufacturerValues: any[] = [];
      const modulesValues: any[] = [];
      service.manufacturerData$.subscribe(v => manufacturerValues.push(v));
      service.modulesData$.subscribe(v => modulesValues.push(v));
      service.updateManufacturer$.next(1);
      tick();
      // Trigger again — should see null between resets
      service.updateManufacturer$.next(2);
      tick();
      // Should have had null emitted between the two loads
      expect(manufacturerValues).toContain(null);
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