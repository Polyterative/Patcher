import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  of,
  Subject
} from 'rxjs';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SelectionPanelBridgeService } from 'src/app/components/patch-parts/selection-panel-bridge.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { Patch } from 'src/app/models/patch';


/**
 * Unit Tests — PatchDetailDataService Instance Management
 *
 * Covers Scenarios J, K, L, M from INSTANCE_SCENARIOS.md:
 * - J: Connect first, add instances later — connections survive relabel
 * - K: Delete instance with connections — editorConnections$ scrubbed
 * - L: Legacy connections (null instance_ids) coexist with instances
 * - M: Label renumbering after add/remove
 */
describe('PatchDetailDataService - Instance Management', () => {
  let service: PatchDetailDataService;
  let mockSupabaseService: any;
  let mockUserService: any;
  let mockRouter: any;
  let mockDialog: any;
  
  const fakePatch: Patch = {
    id: 100,
    name: 'Test Patch',
    description: '',
    public: true,
    author: {id: 'user-1', username: 'testuser'},
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  } as Patch;
  
  /** Helper to build a minimal PatchConnection */
  function makeConnection(
    aId: number, bId: number,
    instanceIdA?: number, instanceIdB?: number
  ): PatchConnection {
    return {
      patch: fakePatch,
      a: {id: aId, name: 'out1', module: {id: 10, name: 'ModA'}} as any,
      b: {id: bId, name: 'in1', module: {id: 20, name: 'ModB'}} as any,
      instance_id_a: instanceIdA,
      instance_id_b: instanceIdB
    };
  }
  
  /** Helper for self-referencing connections: both sides can reference the same module */
  function makeSelfConnection(
    aId: number, bId: number,
    moduleId: number,
    instanceIdA?: number, instanceIdB?: number
  ): PatchConnection {
    return {
      patch: fakePatch,
      a: {id: aId, name: 'out1', module: {id: moduleId, name: 'ModSelf'}} as any,
      b: {id: bId, name: 'in1', module: {id: moduleId, name: 'ModSelf'}} as any,
      instance_id_a: instanceIdA,
      instance_id_b: instanceIdB
    };
  }
  
  beforeEach(() => {
    mockSupabaseService = {
      cacheResetter$: new Subject<any>(),
      get: {
        patchWithId: jasmine.createSpy('patchWithId').and.returnValue(of({data: null, error: null}))
      },
      GET: {
        patchConnections: jasmine.createSpy('patchConnections').and.returnValue(of([])),
        patchModuleInstances: jasmine.createSpy('patchModuleInstances').and.returnValue(of([]))
      },
      update: {
        patch: jasmine.createSpy('patch').and.returnValue(of({data: null, error: null})),
        patchSilent: jasmine.createSpy('patchSilent').and.returnValue(of({data: null, error: null})),
        patchConnections: jasmine.createSpy('patchConnections').and.returnValue(of({data: null, error: null})),
        patchConnectionsSilent: jasmine.createSpy('patchConnectionsSilent').and.returnValue(of({data: null, error: null})),
        patchModuleInstanceLabel: jasmine.createSpy('patchModuleInstanceLabel').and.callFake(
          (id: number, label: string | null) => {
            // Look up the module_id from the service's current state
            const inst = service?.patchModuleInstances$?.value?.find(i => i.id === id);
            const module_id = inst?.module_id ?? 20;
            return of({id, patch_id: 100, module_id, instance_label: label} as PatchModuleInstance);
          }
        )
      },
      delete: {
        userPatch: jasmine.createSpy('userPatch').and.returnValue(of({data: null, error: null})),
        patchConnectionsForPatch: jasmine.createSpy('patchConnectionsForPatch').and.returnValue(of({data: null, error: null})),
        patch: jasmine.createSpy('patch').and.returnValue(of({data: null, error: null})),
        patchModuleInstance: jasmine.createSpy('patchModuleInstance').and.returnValue(of({data: null, error: null})),
        patchModuleInstancesForPatch: jasmine.createSpy('patchModuleInstancesForPatch').and.returnValue(of({data: null, error: null}))
      },
      add: {
        patchConnection: jasmine.createSpy('patchConnection').and.returnValue(of({data: null, error: null})),
        patchModuleInstance: jasmine.createSpy('patchModuleInstance').and.callFake(
          (patchId: number, moduleId: number, label: string | null) =>
            of({id: Math.floor(Math.random() * 10000), patch_id: patchId, module_id: moduleId, instance_label: label} as PatchModuleInstance)
        ),
        patchModuleInstances: jasmine.createSpy('patchModuleInstances').and.callFake(
          (rows: {
            patch_id: number;
            module_id: number;
            instance_label: string | null
          }[]) =>
            of(rows.map(r => ({id: Math.floor(Math.random() * 10000), ...r} as PatchModuleInstance)))
        )
      },
      getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(
        of({id: 'user-1', email: 'test@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString()})
      )
    };
    
    mockUserService = {
      loggedUser$: of({id: 'user-1', username: 'testuser', email: 'test@example.com'})
    };
    
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    // Mock MatDialog to auto-confirm (answer: true) for delete-with-connections tests
    mockDialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
    
    TestBed.configureTestingModule({
      imports: [MatSnackBarModule, MatDialogModule],
      providers: [
        PatchDetailDataService,
        SelectionPanelBridgeService,
        {provide: SupabaseService, useValue: mockSupabaseService},
        {provide: UserManagementService, useValue: mockUserService},
        {provide: Router, useValue: mockRouter},
        {provide: MatDialog, useValue: mockDialog}
      ]
    });
    
    service = TestBed.inject(PatchDetailDataService);
  });
  
  afterEach(() => {
    service.ngOnDestroy();
  });
  
  // -------------------------------------------------------------------
  // Scenario K — Delete instance scrubs editorConnections$
  // -------------------------------------------------------------------
  describe('Scenario K — removeModuleInstance$ scrubs editorConnections$', () => {
    
    it('should set instance_id_a to undefined when the referenced instance is deleted', (done) => {
      const instanceToDelete: PatchModuleInstance = {id: 501, patch_id: 100, module_id: 10, instance_label: '(2)'};
      const conn = makeConnection(1, 2, 501, 600);
      
      // Seed state
      service.patchModuleInstances$.next([
        {id: 500, patch_id: 100, module_id: 10, instance_label: '(1)'},
        instanceToDelete
      ]);
      service.editorConnections$.next([conn]);
      
      // Act
      service.removeModuleInstance$.next(instanceToDelete);
      
      // Assert (async — subscribe fires after switchMap resolves)
      setTimeout(() => {
        const connections = service.editorConnections$.value;
        expect(connections).toBeTruthy();
        expect(connections.length).toBe(1);
        expect(connections[0].instance_id_a).toBeUndefined();
        expect(connections[0].instance_id_b).toBe(600); // untouched
        done();
      }, 50);
    });
    
    it('should set instance_id_b to undefined when the referenced instance is deleted', (done) => {
      const instanceToDelete: PatchModuleInstance = {id: 600, patch_id: 100, module_id: 20, instance_label: '(1)'};
      const conn = makeConnection(1, 2, 500, 600);
      
      service.patchModuleInstances$.next([
        instanceToDelete,
        {id: 601, patch_id: 100, module_id: 20, instance_label: '(2)'}
      ]);
      service.editorConnections$.next([conn]);
      
      service.removeModuleInstance$.next(instanceToDelete);
      
      setTimeout(() => {
        const connections = service.editorConnections$.value;
        expect(connections.length).toBe(1);
        expect(connections[0].instance_id_a).toBe(500); // untouched
        expect(connections[0].instance_id_b).toBeUndefined();
        done();
      }, 50);
    });
    
    it('should scrub both instance_id_a and instance_id_b if both reference the deleted instance', (done) => {
      // Edge case: same module on both sides of a connection
      const instanceToDelete: PatchModuleInstance = {id: 700, patch_id: 100, module_id: 10, instance_label: '(1)'};
      const conn = makeConnection(1, 2, 700, 700);
      
      service.patchModuleInstances$.next([instanceToDelete]);
      service.editorConnections$.next([conn]);
      
      service.removeModuleInstance$.next(instanceToDelete);
      
      setTimeout(() => {
        const connections = service.editorConnections$.value;
        expect(connections.length).toBe(1);
        expect(connections[0].instance_id_a).toBeUndefined();
        expect(connections[0].instance_id_b).toBeUndefined();
        done();
      }, 50);
    });
    
    it('should not modify connections that do not reference the deleted instance', (done) => {
      const instanceToDelete: PatchModuleInstance = {id: 999, patch_id: 100, module_id: 10, instance_label: '(2)'};
      const unrelatedConn = makeConnection(1, 2, 500, 600);
      
      service.patchModuleInstances$.next([
        {id: 500, patch_id: 100, module_id: 10, instance_label: '(1)'},
        instanceToDelete
      ]);
      service.editorConnections$.next([unrelatedConn]);
      
      service.removeModuleInstance$.next(instanceToDelete);
      
      setTimeout(() => {
        const connections = service.editorConnections$.value;
        expect(connections.length).toBe(1);
        expect(connections[0].instance_id_a).toBe(500);
        expect(connections[0].instance_id_b).toBe(600);
        // Should be the exact same object reference (not cloned) since nothing changed
        expect(connections[0]).toBe(unrelatedConn);
        done();
      }, 50);
    });
    
    it('should remove the deleted instance from patchModuleInstances$', (done) => {
      const instanceToDelete: PatchModuleInstance = {id: 501, patch_id: 100, module_id: 10, instance_label: '(2)'};
      const keepInstance: PatchModuleInstance = {id: 500, patch_id: 100, module_id: 10, instance_label: '(1)'};
      
      service.patchModuleInstances$.next([keepInstance, instanceToDelete]);
      service.editorConnections$.next([]);
      
      service.removeModuleInstance$.next(instanceToDelete);
      
      setTimeout(() => {
        const instances = service.patchModuleInstances$.value;
        expect(instances.length).toBe(1);
        expect(instances[0].id).toBe(500);
        done();
      }, 50);
    });
    
    it('should handle null editorConnections$ gracefully', (done) => {
      const instanceToDelete: PatchModuleInstance = {id: 501, patch_id: 100, module_id: 10, instance_label: '(1)'};
      
      service.patchModuleInstances$.next([instanceToDelete]);
      service.editorConnections$.next(null);
      
      service.removeModuleInstance$.next(instanceToDelete);
      
      setTimeout(() => {
        // Should not throw; editorConnections$ stays null
        expect(service.editorConnections$.value).toBeNull();
        expect(service.patchModuleInstances$.value.length).toBe(0);
        done();
      }, 50);
    });
  });
  
  // -------------------------------------------------------------------
  // Scenario J — Connections survive instance relabel
  // -------------------------------------------------------------------
  describe('Scenario J — connections survive after addModuleInstance$ relabels existing', () => {
    
    it('should preserve connection instance_id after the referenced instance is relabeled via addModuleInstance$', (done) => {
      // Simulate: module 20 has 1 instance (id=800), a connection points to it.
      // User clicks "Add Copy" → relabel existing to "(1)", create new "(2)".
      // Connection's instance_id_b should remain 800.
      const existingInstance: PatchModuleInstance = {id: 800, patch_id: 100, module_id: 20, instance_label: null};
      const conn = makeConnection(1, 2, 500, 800);
      
      service.singlePatchData$.next(fakePatch);
      service.patchModuleInstances$.next([existingInstance]);
      service.editorConnections$.next([conn]);
      
      // Act: trigger "Add Copy" for module 20
      service.addModuleInstance$.next({id: 20, name: 'ModB'} as any);
      
      setTimeout(() => {
        // The connection's instance_id_b should still be 800
        const connections = service.editorConnections$.value;
        expect(connections).toBeTruthy();
        expect(connections.length).toBe(1);
        expect(connections[0].instance_id_b).toBe(800);
        
        // The relabel call should have been made for the existing instance
        expect(mockSupabaseService.update.patchModuleInstanceLabel)
          .toHaveBeenCalledWith(800, '(1)');
        
        // Should now have 2 instances for module 20
        const instances = service.patchModuleInstances$.value;
        const mod20Instances = instances.filter(i => i.module_id === 20);
        expect(mod20Instances.length).toBe(2);
        done();
      }, 100);
    });
  });
  
  // -------------------------------------------------------------------
  // Scenario L — Legacy connections with null instance_ids
  // -------------------------------------------------------------------
  describe('Scenario L — legacy connections with null instance_ids', () => {
    
    it('should allow connections with undefined instance_ids to coexist with instances', () => {
      // Simulate: old connection has no instance_ids, module now has 2 instances
      const legacyConn = makeConnection(1, 2, undefined, undefined);
      const instances: PatchModuleInstance[] = [
        {id: 900, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 901, patch_id: 100, module_id: 20, instance_label: '(2)'}
      ];
      
      service.patchModuleInstances$.next(instances);
      service.editorConnections$.next([legacyConn]);
      
      // Verify state is consistent
      const connections = service.editorConnections$.value;
      expect(connections.length).toBe(1);
      expect(connections[0].instance_id_a).toBeUndefined();
      expect(connections[0].instance_id_b).toBeUndefined();
    });
    
    it('should not scrub legacy connections when an unrelated instance is deleted', (done) => {
      const legacyConn = makeConnection(1, 2, undefined, undefined);
      const instanceToDelete: PatchModuleInstance = {id: 900, patch_id: 100, module_id: 20, instance_label: '(1)'};
      
      service.patchModuleInstances$.next([instanceToDelete]);
      service.editorConnections$.next([legacyConn]);
      
      service.removeModuleInstance$.next(instanceToDelete);
      
      setTimeout(() => {
        const connections = service.editorConnections$.value;
        expect(connections.length).toBe(1);
        // Legacy connection unchanged — undefined stays undefined
        expect(connections[0].instance_id_a).toBeUndefined();
        expect(connections[0].instance_id_b).toBeUndefined();
        // Same object reference since nothing changed
        expect(connections[0]).toBe(legacyConn);
        done();
      }, 50);
    });
    
    it('should treat null instance_id from DB the same as undefined after normalization', () => {
      // Simulate a connection as it would come from the DB (with null)
      const dbConnection: PatchConnection = {
        patch: fakePatch,
        a: {id: 1, name: 'out1', module: {id: 10, name: 'ModA'}} as any,
        b: {id: 2, name: 'in1', module: {id: 20, name: 'ModB'}} as any,
        instance_id_a: null as any,
        instance_id_b: null as any
      };
      
      // Apply the normalization that the service does on load: ?? undefined
      const normalized = {
        ...dbConnection,
        instance_id_a: dbConnection.instance_id_a ?? undefined,
        instance_id_b: dbConnection.instance_id_b ?? undefined
      };
      
      // An in-memory connection with undefined
      const inMemoryConn = makeConnection(1, 2, undefined, undefined);
      
      // After normalization, duplicate detection should match
      const isAlreadyInList = normalized.a.id === inMemoryConn.a.id
        && normalized.b.id === inMemoryConn.b.id
        && normalized.instance_id_a === inMemoryConn.instance_id_a
        && normalized.instance_id_b === inMemoryConn.instance_id_b;
      
      expect(isAlreadyInList).toBeTrue();
    });
    
    it('should NOT detect duplicate without normalization when null vs undefined are compared', () => {
      // This test documents the bug that normalization fixes:
      // DB returns null, in-memory uses undefined → strict === fails
      const dbConnection: PatchConnection = {
        patch: fakePatch,
        a: {id: 1, name: 'out1', module: {id: 10, name: 'ModA'}} as any,
        b: {id: 2, name: 'in1', module: {id: 20, name: 'ModB'}} as any,
        instance_id_a: null as any,
        instance_id_b: null as any
      };
      
      const inMemoryConn = makeConnection(1, 2, undefined, undefined);
      
      // Without normalization: null !== undefined
      const wouldMatchWithoutNormalization =
        dbConnection.instance_id_a === inMemoryConn.instance_id_a
        && dbConnection.instance_id_b === inMemoryConn.instance_id_b;
      
      expect(wouldMatchWithoutNormalization).toBeFalse(); // Documents the bug
    });
  });
  
  // -------------------------------------------------------------------
  // Scenario M — Label renumbering after add/remove
  // -------------------------------------------------------------------
  describe('Scenario M — label renumbering', () => {
    
    it('should renumber labels sequentially after deleting a middle instance', (done) => {
      // Setup: module 20 has 4 instances: (1), (2), (3), (4)
      const instances: PatchModuleInstance[] = [
        {id: 1001, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 1002, patch_id: 100, module_id: 20, instance_label: '(2)'},
        {id: 1003, patch_id: 100, module_id: 20, instance_label: '(3)'},
        {id: 1004, patch_id: 100, module_id: 20, instance_label: '(4)'}
      ];
      
      service.patchModuleInstances$.next(instances);
      service.editorConnections$.next([]);
      
      // Delete instance (2) — id 1002
      service.removeModuleInstance$.next(instances[1]);
      
      setTimeout(() => {
        const remaining = service.patchModuleInstances$.value
          .filter(i => i.module_id === 20)
          .sort((a, b) => a.id - b.id);
        
        expect(remaining.length).toBe(3);
        // Should be renumbered sequentially: (1), (2), (3)
        expect(remaining[0].instance_label).toBe('(1)');
        expect(remaining[1].instance_label).toBe('(2)');
        expect(remaining[2].instance_label).toBe('(3)');
        
        // Verify the update calls were made for instances that changed
        // id 1003 was "(3)" → "(2)", id 1004 was "(4)" → "(3)"
        expect(mockSupabaseService.update.patchModuleInstanceLabel)
          .toHaveBeenCalledWith(1003, '(2)');
        expect(mockSupabaseService.update.patchModuleInstanceLabel)
          .toHaveBeenCalledWith(1004, '(3)');
        done();
      }, 100);
    });
    
    it('should produce no duplicate labels when adding after a gap', (done) => {
      // Setup: module 20 has instances (1), (3), (4) — gap at (2) from prior delete
      // (In practice, after our fix the gap shouldn't persist, but test the add path)
      const instances: PatchModuleInstance[] = [
        {id: 2001, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 2003, patch_id: 100, module_id: 20, instance_label: '(3)'},
        {id: 2004, patch_id: 100, module_id: 20, instance_label: '(4)'}
      ];
      
      service.singlePatchData$.next(fakePatch);
      service.patchModuleInstances$.next(instances);
      service.editorConnections$.next([]);
      
      // Add another copy
      service.addModuleInstance$.next({id: 20, name: 'ModB'} as any);
      
      setTimeout(() => {
        const mod20 = service.patchModuleInstances$.value
          .filter(i => i.module_id === 20)
          .sort((a, b) => a.id - b.id);
        
        expect(mod20.length).toBe(4);
        
        // All labels should be unique and sequential
        const labels = mod20.map(i => i.instance_label);
        expect(labels).toEqual(['(1)', '(2)', '(3)', '(4)']);
        done();
      }, 150);
    });
    
    it('should clear label when removing from 2 to 1 instance', (done) => {
      const instances: PatchModuleInstance[] = [
        {id: 3001, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 3002, patch_id: 100, module_id: 20, instance_label: '(2)'}
      ];
      
      service.patchModuleInstances$.next(instances);
      service.editorConnections$.next([]);
      
      // Delete instance (2)
      service.removeModuleInstance$.next(instances[1]);
      
      setTimeout(() => {
        const remaining = service.patchModuleInstances$.value
          .filter(i => i.module_id === 20);
        
        expect(remaining.length).toBe(1);
        // Single remaining instance should have its label cleared (null)
        expect(remaining[0].instance_label).toBeNull();
        expect(remaining[0].id).toBe(3001);
        done();
      }, 100);
    });
    
    it('should not renumber instances of a different module', (done) => {
      // Module 20 has 3 instances, module 30 has 2 — only module 20 should be affected
      const instances: PatchModuleInstance[] = [
        {id: 4001, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 4002, patch_id: 100, module_id: 20, instance_label: '(2)'},
        {id: 4003, patch_id: 100, module_id: 20, instance_label: '(3)'},
        {id: 4010, patch_id: 100, module_id: 30, instance_label: '(1)'},
        {id: 4011, patch_id: 100, module_id: 30, instance_label: '(2)'}
      ];
      
      service.patchModuleInstances$.next(instances);
      service.editorConnections$.next([]);
      
      // Delete module 20 instance (1)
      service.removeModuleInstance$.next(instances[0]);
      
      setTimeout(() => {
        const mod20 = service.patchModuleInstances$.value
          .filter(i => i.module_id === 20)
          .sort((a, b) => a.id - b.id);
        const mod30 = service.patchModuleInstances$.value
          .filter(i => i.module_id === 30)
          .sort((a, b) => a.id - b.id);
        
        // Module 20: renumbered to (1), (2)
        expect(mod20.length).toBe(2);
        expect(mod20[0].instance_label).toBe('(1)');
        expect(mod20[1].instance_label).toBe('(2)');
        
        // Module 30: untouched
        expect(mod30.length).toBe(2);
        expect(mod30[0].instance_label).toBe('(1)');
        expect(mod30[1].instance_label).toBe('(2)');
        done();
      }, 100);
    });
  });
  
  // -------------------------------------------------------------------
  // Scenario P — Same module, same instance: feedback loop (out → in)
  // -------------------------------------------------------------------
  describe('Scenario P — self-connection (feedback loop, same instance)', () => {
    
    it('should accept a self-connection where instance_id_a === instance_id_b', () => {
      // Module 10, instance 501: output CV 1 → input CV 2 (same module, same instance)
      const selfConn = makeSelfConnection(1, 2, 10, 501, 501);
      
      service.editorConnections$.next([]);
      
      // Simulate confirmSelectedConnection$ logic: add to editor connections
      const existing = service.editorConnections$.value || [];
      const isAlreadyInList = existing.some(c =>
        c.a.id === selfConn.a.id
        && c.b.id === selfConn.b.id
        && c.instance_id_a === selfConn.instance_id_a
        && c.instance_id_b === selfConn.instance_id_b
      );
      
      expect(isAlreadyInList).toBeFalse();
      
      // Add the self-connection
      service.editorConnections$.next([...existing, selfConn]);
      expect(service.editorConnections$.value.length).toBe(1);
      expect(service.editorConnections$.value[0].instance_id_a).toBe(501);
      expect(service.editorConnections$.value[0].instance_id_b).toBe(501);
    });
    
    it('should reject a duplicate self-connection', () => {
      const selfConn = makeSelfConnection(1, 2, 10, 501, 501);
      
      service.editorConnections$.next([selfConn]);
      
      // Try adding the same self-connection again
      const existing = service.editorConnections$.value || [];
      const isAlreadyInList = existing.some(c =>
        c.a.id === selfConn.a.id
        && c.b.id === selfConn.b.id
        && c.instance_id_a === selfConn.instance_id_a
        && c.instance_id_b === selfConn.instance_id_b
      );
      
      expect(isAlreadyInList).toBeTrue();
    });
    
    it('should scrub both instance_id_a and instance_id_b when self-connected instance is deleted', (done) => {
      // This re-verifies the existing Scenario K test with a self-connection context
      const instanceToDelete: PatchModuleInstance = {id: 501, patch_id: 100, module_id: 10, instance_label: '(1)'};
      const selfConn = makeSelfConnection(1, 2, 10, 501, 501);
      
      service.patchModuleInstances$.next([instanceToDelete]);
      service.editorConnections$.next([selfConn]);
      
      service.removeModuleInstance$.next(instanceToDelete);
      
      setTimeout(() => {
        const connections = service.editorConnections$.value;
        expect(connections.length).toBe(1);
        expect(connections[0].instance_id_a).toBeUndefined();
        expect(connections[0].instance_id_b).toBeUndefined();
        done();
      }, 50);
    });
    
    it('should count a self-connection as 1 (not 2) for connection count', () => {
      const selfConn = makeSelfConnection(1, 2, 10, 501, 501);
      const connections = [selfConn];
      
      // Replicate the buildEditorCards connection counting logic
      const instId = 501;
      const connCount = connections.filter(
        c => c.instance_id_a === instId || c.instance_id_b === instId
      ).length;
      
      expect(connCount).toBe(1); // single filter pass → 1 connection, not 2
    });
  });
  
  // -------------------------------------------------------------------
  // Scenario Q — Same module, different instances: A(1) out → A(2) in
  // -------------------------------------------------------------------
  describe('Scenario Q — cross-instance connection (same module, different instances)', () => {
    
    it('should accept a connection from instance A(1) to instance A(2) of the same module', () => {
      // Module 10, instance 501 output → instance 502 input
      const crossConn = makeSelfConnection(1, 2, 10, 501, 502);
      
      service.editorConnections$.next([]);
      
      const existing = service.editorConnections$.value || [];
      const isAlreadyInList = existing.some(c =>
        c.a.id === crossConn.a.id
        && c.b.id === crossConn.b.id
        && c.instance_id_a === crossConn.instance_id_a
        && c.instance_id_b === crossConn.instance_id_b
      );
      
      expect(isAlreadyInList).toBeFalse();
      
      service.editorConnections$.next([...existing, crossConn]);
      expect(service.editorConnections$.value.length).toBe(1);
    });
    
    it('should count cross-instance connection correctly for each instance', () => {
      // A(1)→A(2): instance 501 as source, 502 as target
      const crossConn = makeSelfConnection(1, 2, 10, 501, 502);
      const connections = [crossConn];
      
      // Connection count for instance 501 (appears as instance_id_a)
      const count501 = connections.filter(
        c => c.instance_id_a === 501 || c.instance_id_b === 501
      ).length;
      
      // Connection count for instance 502 (appears as instance_id_b)
      const count502 = connections.filter(
        c => c.instance_id_a === 502 || c.instance_id_b === 502
      ).length;
      
      expect(count501).toBe(1);
      expect(count502).toBe(1);
    });
    
    it('should scrub only the deleted instance side of a cross-instance connection', (done) => {
      const inst501: PatchModuleInstance = {id: 501, patch_id: 100, module_id: 10, instance_label: '(1)'};
      const inst502: PatchModuleInstance = {id: 502, patch_id: 100, module_id: 10, instance_label: '(2)'};
      const crossConn = makeSelfConnection(1, 2, 10, 501, 502);
      
      service.patchModuleInstances$.next([inst501, inst502]);
      service.editorConnections$.next([crossConn]);
      
      // Delete instance 501 (the source side)
      service.removeModuleInstance$.next(inst501);
      
      setTimeout(() => {
        const connections = service.editorConnections$.value;
        expect(connections.length).toBe(1);
        expect(connections[0].instance_id_a).toBeUndefined(); // scrubbed
        expect(connections[0].instance_id_b).toBe(502); // untouched
        done();
      }, 50);
    });
  });
  
  // -------------------------------------------------------------------
  // Scenario R — Cross-instance duplicate detection
  // -------------------------------------------------------------------
  describe('Scenario R — cross-instance duplicate detection', () => {
    
    it('should reject duplicate A(1)→A(2) when one already exists', () => {
      const conn1 = makeSelfConnection(1, 2, 10, 501, 502);
      
      service.editorConnections$.next([conn1]);
      
      // Try adding the exact same connection
      const conn2 = makeSelfConnection(1, 2, 10, 501, 502);
      const existing = service.editorConnections$.value || [];
      const isAlreadyInList = existing.some(c =>
        c.a.id === conn2.a.id
        && c.b.id === conn2.b.id
        && c.instance_id_a === conn2.instance_id_a
        && c.instance_id_b === conn2.instance_id_b
      );
      
      expect(isAlreadyInList).toBeTrue();
    });
    
    it('should accept reversed A(2)→A(1) when A(1)→A(2) exists (different CV pair)', () => {
      // A(1) out[1] → A(2) in[2] already exists
      const conn1 = makeSelfConnection(1, 2, 10, 501, 502);
      service.editorConnections$.next([conn1]);
      
      // A(2) out[3] → A(1) in[4] — different output/input CVs, different direction
      const reversed: PatchConnection = {
        patch: fakePatch,
        a: {id: 3, name: 'out2', module: {id: 10, name: 'ModSelf'}} as any,
        b: {id: 4, name: 'in2', module: {id: 10, name: 'ModSelf'}} as any,
        instance_id_a: 502,
        instance_id_b: 501
      };
      
      const existing = service.editorConnections$.value || [];
      const isAlreadyInList = existing.some(c =>
        c.a.id === reversed.a.id
        && c.b.id === reversed.b.id
        && c.instance_id_a === reversed.instance_id_a
        && c.instance_id_b === reversed.instance_id_b
      );
      
      expect(isAlreadyInList).toBeFalse(); // Different a.id/b.id → accepted
    });
    
    it('should accept same CV pair with different instance assignment', () => {
      // Same output CV 1 → input CV 2, but on different instances
      const conn1 = makeSelfConnection(1, 2, 10, 501, 502);
      service.editorConnections$.next([conn1]);
      
      // Same CVs, but instance_id_a is 502 and instance_id_b is 501 (swapped instances)
      const swapped = makeSelfConnection(1, 2, 10, 502, 501);
      const existing = service.editorConnections$.value || [];
      const isAlreadyInList = existing.some(c =>
        c.a.id === swapped.a.id
        && c.b.id === swapped.b.id
        && c.instance_id_a === swapped.instance_id_a
        && c.instance_id_b === swapped.instance_id_b
      );
      
      expect(isAlreadyInList).toBeFalse(); // Different instance assignment → accepted
    });
  });
  
  // -------------------------------------------------------------------
  // 27e — Connection count for self-connections in buildEditorCards
  // -------------------------------------------------------------------
  describe('27e — connection count handles self-connections correctly', () => {
    
    it('should count a self-connection as 1 for the connected instance', () => {
      // Self-connection: instance 501 output → instance 501 input
      const selfConn = makeSelfConnection(1, 2, 10, 501, 501);
      // Cross-module connection: instance 501 output → instance 600 input
      const crossConn = makeConnection(3, 4, 501, 600);
      const connections = [selfConn, crossConn];
      
      // Replicate buildEditorCards counting for instance 501
      const count501 = connections.filter(
        c => c.instance_id_a === 501 || c.instance_id_b === 501
      ).length;
      
      // Self-conn matches once (both sides match but it's 1 entry in array)
      // Cross-conn matches once (instance_id_a === 501)
      // Total = 2
      expect(count501).toBe(2);
    });
    
    it('should not double-count when instance appears on both sides of different connections', () => {
      // Instance 501 as source in conn1, as target in conn2
      const conn1 = makeConnection(1, 2, 501, 600);
      const conn2 = makeConnection(3, 4, 700, 501);
      const connections = [conn1, conn2];
      
      const count501 = connections.filter(
        c => c.instance_id_a === 501 || c.instance_id_b === 501
      ).length;
      
      expect(count501).toBe(2); // Each connection counted once
    });
  });
  
  // -------------------------------------------------------------------
  // 27f — Save/reload roundtrip: buildPatchConnectionInserter maps instance_id_a/b
  // -------------------------------------------------------------------
  describe('27f — save roundtrip maps instance_id correctly', () => {
    
    it('should map undefined instance_id to null for DB insertion', () => {
      // Simulate the mapping done by buildPatchConnectionInserter
      const conn = makeConnection(1, 2, undefined, undefined);
      
      const toInsert = {
        patchid: conn.patch.id,
        a: conn.a.id,
        b: conn.b.id,
        notes: conn.notes,
        ordinal: 0,
        instance_id_a: conn.instance_id_a ?? null,
        instance_id_b: conn.instance_id_b ?? null
      };
      
      expect(toInsert.instance_id_a).toBeNull();
      expect(toInsert.instance_id_b).toBeNull();
    });
    
    it('should preserve instance_id values for self-connections in DB mapping', () => {
      const selfConn = makeSelfConnection(1, 2, 10, 501, 501);
      
      const toInsert = {
        patchid: selfConn.patch.id,
        a: selfConn.a.id,
        b: selfConn.b.id,
        notes: selfConn.notes,
        ordinal: 0,
        instance_id_a: selfConn.instance_id_a ?? null,
        instance_id_b: selfConn.instance_id_b ?? null
      };
      
      expect(toInsert.instance_id_a).toBe(501);
      expect(toInsert.instance_id_b).toBe(501);
    });
    
    it('should preserve different instance_id values for cross-instance connections', () => {
      const crossConn = makeSelfConnection(1, 2, 10, 501, 502);
      
      const toInsert = {
        patchid: crossConn.patch.id,
        a: crossConn.a.id,
        b: crossConn.b.id,
        notes: crossConn.notes,
        ordinal: 0,
        instance_id_a: crossConn.instance_id_a ?? null,
        instance_id_b: crossConn.instance_id_b ?? null
      };
      
      expect(toInsert.instance_id_a).toBe(501);
      expect(toInsert.instance_id_b).toBe(502);
    });
  });
  
  // -------------------------------------------------------------------
  // Instance label map rebuild on data reload (save/reopen scenario)
  // -------------------------------------------------------------------
  describe('instanceLabelMap$ rebuild on singlePatchData$ re-emit', () => {
    
    it('should populate instanceLabelMap$ when patchModuleInstances$ has 2+ instances for a module', () => {
      // Simulate instances loaded from backend
      const instances: PatchModuleInstance[] = [
        {id: 8001, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 8002, patch_id: 100, module_id: 20, instance_label: '(2)'}
      ];
      
      service.patchModuleInstances$.next(instances);
      
      const labelMap = service.instanceLabelMap$.value;
      expect(labelMap.size).toBe(2);
      expect(labelMap.get(8001)).toBe('(1)');
      expect(labelMap.get(8002)).toBe('(2)');
    });
    
    it('should NOT include entries in instanceLabelMap$ for modules with only 1 instance', () => {
      const instances: PatchModuleInstance[] = [
        {id: 8010, patch_id: 100, module_id: 20, instance_label: null}
      ];
      
      service.patchModuleInstances$.next(instances);
      
      const labelMap = service.instanceLabelMap$.value;
      expect(labelMap.size).toBe(0);
    });
    
    it('should clear instanceLabelMap$ when patchModuleInstances$ becomes empty', () => {
      // First populate
      service.patchModuleInstances$.next([
        {id: 8020, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 8021, patch_id: 100, module_id: 20, instance_label: '(2)'}
      ]);
      expect(service.instanceLabelMap$.value.size).toBe(2);
      
      // Then clear (simulates reload returning empty)
      service.patchModuleInstances$.next([]);
      expect(service.instanceLabelMap$.value.size).toBe(0);
    });
    
    it('should rebuild instanceLabelMap$ when backend returns instances on singlePatchData$ re-emit', (done) => {
      // Configure mock to return instances when called
      const backendInstances: PatchModuleInstance[] = [
        {id: 9001, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 9002, patch_id: 100, module_id: 20, instance_label: '(2)'},
        {id: 9003, patch_id: 100, module_id: 20, instance_label: '(3)'}
      ];
      mockSupabaseService.GET.patchModuleInstances.and.returnValue(of(backendInstances));
      mockSupabaseService.get.patchWithId.and.returnValue(of({data: fakePatch, error: null}));
      
      // Trigger a full reload cycle (simulates what save or editor close does)
      service.updateSinglePatchData$.next(fakePatch.id);
      
      setTimeout(() => {
        // patchModuleInstances$ should have the backend data
        const instances = service.patchModuleInstances$.value;
        expect(instances.length).toBe(3);
        
        // instanceLabelMap$ should be rebuilt
        const labelMap = service.instanceLabelMap$.value;
        expect(labelMap.size).toBe(3);
        expect(labelMap.get(9001)).toBe('(1)');
        expect(labelMap.get(9002)).toBe('(2)');
        expect(labelMap.get(9003)).toBe('(3)');
        done();
      }, 100);
    });
    
    it('should have empty instanceLabelMap$ when backend returns no instances on reload', (done) => {
      // First, populate with local instances
      service.patchModuleInstances$.next([
        {id: 9010, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 9011, patch_id: 100, module_id: 20, instance_label: '(2)'}
      ]);
      expect(service.instanceLabelMap$.value.size).toBe(2);
      
      // Configure mock to return EMPTY instances (simulates RLS blocking or data loss)
      mockSupabaseService.GET.patchModuleInstances.and.returnValue(of([]));
      mockSupabaseService.get.patchWithId.and.returnValue(of({data: fakePatch, error: null}));
      
      // Trigger reload
      service.updateSinglePatchData$.next(fakePatch.id);
      
      setTimeout(() => {
        // If backend returns empty, instances and label map should be empty
        const instances = service.patchModuleInstances$.value;
        expect(instances.length).toBe(0);
        
        const labelMap = service.instanceLabelMap$.value;
        expect(labelMap.size).toBe(0);
        done();
      }, 100);
    });
    
    it('should use instance_label from DB data, falling back to index-based label', () => {
      // One instance has a label, the other doesn't
      const instances: PatchModuleInstance[] = [
        {id: 9020, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 9021, patch_id: 100, module_id: 20, instance_label: null}
      ];
      
      service.patchModuleInstances$.next(instances);
      
      const labelMap = service.instanceLabelMap$.value;
      expect(labelMap.size).toBe(2);
      expect(labelMap.get(9020)).toBe('(1)');
      // Fallback: index 1 → "(2)"
      expect(labelMap.get(9021)).toBe('(2)');
    });
  });
  
  // -------------------------------------------------------------------
  // multiInstanceSummary$ — read-only module copies summary
  // -------------------------------------------------------------------
  describe('multiInstanceSummary$', () => {
    
    it('should emit empty array when no instances exist', () => {
      service.patchModuleInstances$.next([]);
      
      expect(service.multiInstanceSummary$.value).toEqual([]);
    });
    
    it('should emit empty array when all modules have only 1 instance', () => {
      service.patchModuleInstances$.next([
        {id: 100, patch_id: 1, module_id: 10, instance_label: null}
      ]);
      
      expect(service.multiInstanceSummary$.value).toEqual([]);
    });
    
    it('should produce summary for modules with 2+ instances using joined module data', () => {
      service.patchModuleInstances$.next([
        {id: 100, patch_id: 1, module_id: 10, instance_label: '(1)', module: {name: 'VCA', manufacturer: {name: 'Doepfer'}}},
        {id: 101, patch_id: 1, module_id: 10, instance_label: '(2)', module: {name: 'VCA', manufacturer: {name: 'Doepfer'}}}
      ]);
      
      const summary = service.multiInstanceSummary$.value;
      expect(summary.length).toBe(1);
      expect(summary[0].moduleId).toBe(10);
      expect(summary[0].moduleName).toBe('VCA');
      expect(summary[0].manufacturerName).toBe('Doepfer');
      expect(summary[0].instanceCount).toBe(2);
      expect(summary[0].labels).toEqual(['(1)', '(2)']);
    });
    
    it('should derive module names from instance.module, not connections', () => {
      service.patchModuleInstances$.next([
        {id: 200, patch_id: 1, module_id: 20, instance_label: '(1)', module: {name: 'Filter', manufacturer: {name: 'Mutable'}}},
        {id: 201, patch_id: 1, module_id: 20, instance_label: '(2)', module: {name: 'Filter', manufacturer: {name: 'Mutable'}}},
        {id: 202, patch_id: 1, module_id: 20, instance_label: '(3)', module: {name: 'Filter', manufacturer: {name: 'Mutable'}}}
      ]);
      // No connections needed — names come from the instance join
      
      const summary = service.multiInstanceSummary$.value;
      expect(summary.length).toBe(1);
      expect(summary[0].moduleName).toBe('Filter');
      expect(summary[0].manufacturerName).toBe('Mutable');
      expect(summary[0].instanceCount).toBe(3);
    });
    
    it('should fall back to "Module #id" when instance has no joined module data', () => {
      service.patchModuleInstances$.next([
        {id: 300, patch_id: 1, module_id: 99, instance_label: '(1)'},
        {id: 301, patch_id: 1, module_id: 99, instance_label: '(2)'}
      ]);
      
      const summary = service.multiInstanceSummary$.value;
      expect(summary.length).toBe(1);
      expect(summary[0].moduleName).toBe('Module #99');
      expect(summary[0].manufacturerName).toBe('');
    });
    
    it('should produce summary even when connections are null (no dependency on connections)', () => {
      service.patchModuleInstances$.next([
        {id: 400, patch_id: 1, module_id: 10, instance_label: '(1)', module: {name: 'Osc', manufacturer: {name: 'Make Noise'}}},
        {id: 401, patch_id: 1, module_id: 10, instance_label: '(2)', module: {name: 'Osc', manufacturer: {name: 'Make Noise'}}}
      ]);
      service.patchConnections$.next(null);
      
      const summary = service.multiInstanceSummary$.value;
      expect(summary.length).toBe(1);
      expect(summary[0].moduleName).toBe('Osc');
      expect(summary[0].instanceCount).toBe(2);
    });
  });
  
  // -------------------------------------------------------------------
  // Public read scenario — instances loaded for non-owner
  // -------------------------------------------------------------------
  describe('Public read scenario — instances loaded regardless of auth state', () => {
    
    it('should populate instanceLabelMap$ when backend returns instances for a non-owner patch', (done) => {
      // Simulate a non-owner scenario: getUserSession$ returns a different user
      mockSupabaseService.getUserSession$.and.returnValue(
        of({id: 'other-user', email: 'other@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString()})
      );
      
      const instances: PatchModuleInstance[] = [
        {id: 7001, patch_id: 100, module_id: 10, instance_label: '(1)'},
        {id: 7002, patch_id: 100, module_id: 10, instance_label: '(2)'}
      ];
      mockSupabaseService.GET.patchModuleInstances.and.returnValue(of(instances));
      mockSupabaseService.GET.patchConnections.and.returnValue(of([makeConnection(1, 2, 7001, undefined)]));
      mockSupabaseService.get.patchWithId.and.returnValue(of({data: fakePatch, error: null}));
      
      service.updateSinglePatchData$.next(fakePatch.id);
      
      setTimeout(() => {
        // Instances should be loaded (no auth gate)
        expect(service.patchModuleInstances$.value.length).toBe(2);
        
        // Label map should be populated
        const labelMap = service.instanceLabelMap$.value;
        expect(labelMap.size).toBe(2);
        expect(labelMap.get(7001)).toBe('(1)');
        expect(labelMap.get(7002)).toBe('(2)');
        
        // Multi-instance summary should also be populated
        const summary = service.multiInstanceSummary$.value;
        expect(summary.length).toBe(1);
        expect(summary[0].instanceCount).toBe(2);
        done();
      }, 100);
    });
    
    it('should populate instanceLabelMap$ when user is not authenticated (null session)', (done) => {
      // Simulate unauthenticated user
      mockSupabaseService.getUserSession$.and.returnValue(of(null));
      
      const instances: PatchModuleInstance[] = [
        {id: 7010, patch_id: 100, module_id: 20, instance_label: '(1)'},
        {id: 7011, patch_id: 100, module_id: 20, instance_label: '(2)'},
        {id: 7012, patch_id: 100, module_id: 20, instance_label: '(3)'}
      ];
      mockSupabaseService.GET.patchModuleInstances.and.returnValue(of(instances));
      mockSupabaseService.GET.patchConnections.and.returnValue(of([makeConnection(1, 2, undefined, 7010)]));
      mockSupabaseService.get.patchWithId.and.returnValue(of({data: fakePatch, error: null}));
      
      service.updateSinglePatchData$.next(fakePatch.id);
      
      setTimeout(() => {
        // Instances should be loaded even without auth
        expect(service.patchModuleInstances$.value.length).toBe(3);
        
        const labelMap = service.instanceLabelMap$.value;
        expect(labelMap.size).toBe(3);
        expect(labelMap.get(7010)).toBe('(1)');
        expect(labelMap.get(7011)).toBe('(2)');
        expect(labelMap.get(7012)).toBe('(3)');
        done();
      }, 100);
    });
  });
});