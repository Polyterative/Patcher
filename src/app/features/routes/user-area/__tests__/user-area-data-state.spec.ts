import {
  createMockUserAreaDataService,
  MOCK_MODULES,
  MOCK_PATCHES,
  MOCK_RACKS,
} from './test-setup';
import { DbComment } from 'src/app/models/comment';
import { DbModule } from 'src/app/models/module';


/**
 * UserAreaDataService — Observable state propagation tests
 *
 * These tests verify that BehaviorSubject state is correctly
 * observable and that initial/loading states behave as expected,
 * from the perspective of components consuming the service.
 */
describe('UserAreaDataService - Observable State Propagation', () => {
  let dataService: ReturnType<typeof createMockUserAreaDataService>;
  const MOCK_COMMENTS: DbComment[] = [
    {
      id: 1,
      content: 'A useful comment',
      entityId: 10,
      entityType: 1,
      profile: {
        id: 'user-123',
        username: 'testuser',
      },
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-02T00:00:00.000Z',
    },
  ];
  const MOCK_MANUALS: DbModule[] = [
    {
      ...MOCK_MODULES[0],
      id: 2,
      name: 'Manual Module',
      ins: [],
      outs: [],
      switches: [],
      manualURL: 'https://example.test/manual.pdf',
      store_url: null,
      additional: null,
      isComplete: true,
      isApproved: true,
      isDIY: false,
      powerPos12: null,
      powerNeg12: null,
      powerPos5: null,
      depth: 0,
      weight: 0,
    },
  ];
  
  beforeEach(() => {
    dataService = createMockUserAreaDataService();
  });

  
  // ─── Initial state ────────────────────────────────────────────────────────
  
  describe('initial state', () => {
    it('modulesData$ should start as undefined', () => {
      expect(dataService.modulesData$.value).toBeUndefined();
    });
    
    it('patchesData$ should start as undefined', () => {
      expect(dataService.patchesData$.value).toBeUndefined();
    });
    
    it('rackData$ should start as undefined', () => {
      expect(dataService.rackData$.value).toBeUndefined();
    });
    
    it('manualsData$ should start as undefined', () => {
      expect(dataService.manualsData$.value).toBeUndefined();
    });
    
    it('commentsData$ should start as undefined', () => {
      expect(dataService.commentsData$.value).toBeUndefined();
    });
  });

  
  // ─── Modules ──────────────────────────────────────────────────────────────
  
  describe('modulesData$ stream', () => {
    it('should reflect modules pushed by the service', () => {
      dataService.modulesData$.next(MOCK_MODULES);
      expect(dataService.modulesData$.value).toEqual(MOCK_MODULES);
    });
    
    it('should reflect empty array', () => {
      dataService.modulesData$.next([]);
      expect(dataService.modulesData$.value?.length).toBe(0);
    });
    
    it('should transition from loaded to undefined (loading)', () => {
      dataService.modulesData$.next(MOCK_MODULES);
      dataService.modulesData$.next(undefined);
      expect(dataService.modulesData$.value).toBeUndefined();
    });
    
    it('subscribers should receive emitted values', (done) => {
      const received: Array<typeof MOCK_MODULES | undefined> = [];
      dataService.modulesData$.subscribe(v => received.push(v));
      
      dataService.modulesData$.next(MOCK_MODULES);
      
      expect(received).toContain(MOCK_MODULES);
      done();
    });
  });
  
  // ─── Patches ──────────────────────────────────────────────────────────────
  
  describe('patchesData$ stream', () => {
    it('should reflect patches pushed by the service', () => {
      dataService.patchesData$.next(MOCK_PATCHES);
      expect(dataService.patchesData$.value).toEqual(MOCK_PATCHES);
    });
    
    it('should reflect empty array', () => {
      dataService.patchesData$.next([]);
      expect(dataService.patchesData$.value?.length).toBe(0);
    });
    
    it('should transition from loaded to undefined (loading)', () => {
      dataService.patchesData$.next(MOCK_PATCHES);
      dataService.patchesData$.next(undefined);
      expect(dataService.patchesData$.value).toBeUndefined();
    });
  });
  
  // ─── Racks ────────────────────────────────────────────────────────────────
  
  describe('rackData$ stream', () => {
    it('should reflect racks pushed by the service', () => {
      dataService.rackData$.next(MOCK_RACKS);
      expect(dataService.rackData$.value).toEqual(MOCK_RACKS);
    });
    
    it('should reflect empty array', () => {
      dataService.rackData$.next([]);
      expect(dataService.rackData$.value?.length).toBe(0);
    });
    
    it('should transition from loaded to undefined (loading)', () => {
      dataService.rackData$.next(MOCK_RACKS);
      dataService.rackData$.next(undefined);
      expect(dataService.rackData$.value).toBeUndefined();
    });
  });
  
  // ─── Update triggers ──────────────────────────────────────────────────────
  
  describe('update trigger subjects', () => {
    it('updateModulesData$ should be a Subject that can be emitted to', () => {
      const spy = jasmine.createSpy('updateModules');
      dataService.updateModulesData$.subscribe(spy);
      dataService.updateModulesData$.next();
      expect(spy).toHaveBeenCalledTimes(1);
    });
    
    it('updatePatchesData$ should be a Subject that can be emitted to', () => {
      const spy = jasmine.createSpy('updatePatches');
      dataService.updatePatchesData$.subscribe(spy);
      dataService.updatePatchesData$.next();
      expect(spy).toHaveBeenCalledTimes(1);
    });
    
    it('updateRackData$ should be a Subject that carries optional user id', () => {
      const spy = jasmine.createSpy('updateRack');
      dataService.updateRackData$.subscribe(spy);
      dataService.updateRackData$.next(undefined);
      expect(spy).toHaveBeenCalledWith(undefined);
    });
    
    it('updateRackData$ should forward user id string when provided', () => {
      const spy = jasmine.createSpy('updateRack');
      dataService.updateRackData$.subscribe(spy);
      dataService.updateRackData$.next('user-xyz');
      expect(spy).toHaveBeenCalledWith('user-xyz');
    });
    
    it('updateManualsData$ should be emittable', () => {
      const spy = jasmine.createSpy('updateManuals');
      dataService.updateManualsData$.subscribe(spy);
      dataService.updateManualsData$.next();
      expect(spy).toHaveBeenCalledTimes(1);
    });
    
    it('updateCommentsData$ should be emittable', () => {
      const spy = jasmine.createSpy('updateComments');
      dataService.updateCommentsData$.subscribe(spy);
      dataService.updateCommentsData$.next();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  
  // ─── Action subjects ──────────────────────────────────────────────────────
  
  describe('action subjects', () => {
    it('addPatch$ should be emittable', () => {
      const spy = jasmine.createSpy('addPatch');
      dataService.addPatch$.subscribe(spy);
      dataService.addPatch$.next();
      expect(spy).toHaveBeenCalledTimes(1);
    });
    
    it('addRack$ should be emittable', () => {
      const spy = jasmine.createSpy('addRack');
      dataService.addRack$.subscribe(spy);
      dataService.addRack$.next();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  
  // ─── Multi-stream consistency ─────────────────────────────────────────────
  
  describe('multi-stream consistency', () => {
    it('all five data streams should hold their values independently', () => {
      dataService.modulesData$.next(MOCK_MODULES);
      dataService.patchesData$.next(MOCK_PATCHES);
      dataService.rackData$.next(MOCK_RACKS);
      dataService.commentsData$.next(MOCK_COMMENTS);
      dataService.manualsData$.next(MOCK_MANUALS);
      
      expect(dataService.modulesData$.value?.length).toBe(2);
      expect(dataService.patchesData$.value?.length).toBe(2);
      expect(dataService.rackData$.value?.length).toBe(2);
      expect(dataService.commentsData$.value?.length).toBe(1);
      expect(dataService.manualsData$.value?.length).toBe(1);
    });
    
    it('resetting one stream should not affect others', () => {
      dataService.modulesData$.next(MOCK_MODULES);
      dataService.patchesData$.next(MOCK_PATCHES);
      
      dataService.modulesData$.next(undefined);
      
      expect(dataService.modulesData$.value).toBeUndefined();
      expect(dataService.patchesData$.value).toEqual(MOCK_PATCHES);
    });
  });
});
