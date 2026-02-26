import { of } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


describe('SupabaseService - storage', () => {
  let service: SupabaseService;
  let supabaseClient: any;
  let mockBucket: any;
  
  function setupStorageMock(
    uploadResult: any = {data: {path: 'file.jpg'}, error: null},
    removeResult: any = {data: [{name: 'file.jpg'}], error: null}
  ) {
    mockBucket = {
      upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve(uploadResult)),
      remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve(removeResult))
    };
    spyOn(supabaseClient.storage, 'from').and.returnValue(mockBucket);
  }
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('storage.deletePanelFile', () => {
    it('should call remove on the module_panels bucket', (done) => {
      setupStorageMock();
      
      service.storage.deletePanelFile('panel.jpg').subscribe({
        next: () => {
          expect(supabaseClient.storage.from).toHaveBeenCalledWith('module-panels');
          expect(mockBucket.remove).toHaveBeenCalledWith(['panel.jpg']);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust modules, moduleWithId and rackWithId caches', (done) => {
      setupStorageMock();
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.storage.deletePanelFile('test.jpg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('moduleWithId');
          expect(bustedKeys).toContain('rackWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('storage.deleteRackImage', () => {
    it('should normalise filename and call remove on the racks bucket', (done) => {
      setupStorageMock();
      
      service.storage.deleteRackImage('RACK.JPG').subscribe({
        next: () => {
          expect(supabaseClient.storage.from).toHaveBeenCalledWith('racks');
          // cleanUpFileName lowercases
          expect(mockBucket.remove).toHaveBeenCalledWith(['rack.jpg']);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust rackWithId cache', (done) => {
      setupStorageMock();
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.storage.deleteRackImage('rack.jpg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('rackWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('storage.uploadModulePanel', () => {
    it('should return the lowercased filename', (done) => {
      setupStorageMock();
      
      service.storage.uploadModulePanel(new Blob(), 'Panel.JPG').subscribe({
        next: (filename) => {
          expect(filename).toBe('panel.jpg');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should call both upload and remove on module_panels bucket', (done) => {
      setupStorageMock();
      
      service.storage.uploadModulePanel(new Blob(), 'panel.jpg').subscribe({
        next: () => {
          expect(supabaseClient.storage.from).toHaveBeenCalledWith('module-panels');
          expect(mockBucket.upload).toHaveBeenCalled();
          expect(mockBucket.remove).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust module caches after successful upload', (done) => {
      setupStorageMock();
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.storage.uploadModulePanel(new Blob(), 'panel.jpg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('moduleWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('storage.uploadRackImage', () => {
    it('should upload to racks bucket and return a timestamped filename', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      setupStorageMock();
      
      service.storage.uploadRackImage(new Blob(), 'rack.jpg').subscribe({
        next: (filename) => {
          expect(typeof filename).toBe('string');
          expect(filename).toContain('rack');
          expect(mockBucket.upload).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust rackWithId cache', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      setupStorageMock();
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.storage.uploadRackImage(new Blob(), 'rack.jpg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('rackWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});