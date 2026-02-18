import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import { of } from 'rxjs';


/**
 * CRUD Operations Integration Tests
 *
 * Tests for Create, Read, Update, Delete operations.
 * These tests validate the full lifecycle of data operations,
 * including user context, data transformation, and side effects.
 *
 * IMPORTANT: These tests use mocked Supabase clients to avoid
 * actual database modifications during testing.
 */
describe('SupabaseService - CRUD Operations', () => {
  let service: SupabaseService;
  let mockSnackBar: any;
  let supabaseClient: any;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    mockSnackBar = setup.mockSnackBar;
    supabaseClient = (service as any).supabase;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  // ============================================================================
  // CREATE Operations
  // ============================================================================
  
  describe('add.comment', () => {
    it('should create comment with current user context', (done) => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const insertSpy = jasmine.createSpy('insert').and.returnValue(
        Promise.resolve({data: {id: 1}, error: null})
      );
      
      spyOn(supabaseClient, 'from').and.returnValue({
        insert: insertSpy
      });
      
      const commentData = {
        entityId: 42,
        entityType: 1,
        content: 'Test comment'
      };
      
      service.add.comment(commentData).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith({
            entityId: 42,
            entityType: 1,
            content: 'Test comment',
            authorId: 'user-123'
          });
          done();
        },
        error: (err) => {
          fail(`Should not have errored: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should use current user as author automatically', (done) => {
      const mockUser = {
        id: 'auto-user-456',
        email: 'auto@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      let capturedAuthorId: string | undefined;
      const insertSpy = jasmine.createSpy('insert').and.callFake((data: any) => {
        capturedAuthorId = data.authorId;
        return Promise.resolve({data: {id: 1}, error: null});
      });
      
      spyOn(supabaseClient, 'from').and.returnValue({
        insert: insertSpy
      });
      
      service.add.comment({
        entityId: 1,
        entityType: 1,
        content: 'Test'
      }).subscribe({
        next: () => {
          expect(capturedAuthorId).toBe('auto-user-456');
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.userModule', () => {
    it('should add module to current user collection', (done) => {
      const mockUser = {
        id: 'user-789',
        email: 'collector@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const insertSpy = jasmine.createSpy('insert').and.returnValue(
        Promise.resolve({data: null, error: null})
      );
      
      spyOn(supabaseClient, 'from').and.returnValue({
        insert: insertSpy
      });
      
      service.add.userModule(42).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith({
            moduleid: 42,
            profileid: 'user-789'
          });
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.patch', () => {
    it('should create patch with user as author', (done) => {
      const mockUser = {
        id: 'patch-creator',
        email: 'creator@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const insertSpy = jasmine.createSpy('insert').and.returnValue(
        Promise.resolve({data: {id: 99}, error: null})
      );
      
      spyOn(supabaseClient, 'from').and.returnValue({
        insert: insertSpy
      });
      
      service.add.patch({name: 'My Awesome Patch'}).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith({
            name: 'My Awesome Patch',
            authorid: 'patch-creator',
            public: true
          });
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.rackModule', () => {
    it('should add module to rack with position', (done) => {
      const insertSpy = jasmine.createSpy('insert').and.returnValue(
        Promise.resolve({data: {id: 1}, error: null})
      );
      
      spyOn(supabaseClient, 'from').and.returnValue({
        insert: insertSpy
      });
      
      service.add.rackModule(10, 5, 2, 3).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith({
            moduleid: 10,
            rackid: 5,
            row: 2,
            column: 3
          });
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should allow optional row and column', (done) => {
      const insertSpy = jasmine.createSpy('insert').and.returnValue(
        Promise.resolve({data: {id: 1}, error: null})
      );
      
      spyOn(supabaseClient, 'from').and.returnValue({
        insert: insertSpy
      });
      
      service.add.rackModule(10, 5).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith({
            moduleid: 10,
            rackid: 5,
            row: undefined,
            column: undefined
          });
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ============================================================================
  // UPDATE Operations
  // ============================================================================
  
  describe('update.module', () => {
    it('should strip undefined and null values before update', (done) => {
      const updateSpy = jasmine.createSpy('update').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue(
            Promise.resolve({data: [{id: 1}], error: null})
          )
        })
      });
      
      spyOn(supabaseClient, 'from').and.returnValue({
        update: updateSpy
      });
      
      service.update.module({
        id: 1,
        name: 'Updated Module',
        description: null,
        hp: undefined
      }).subscribe({
        next: () => {
          const callArgs = updateSpy.calls.first().args[0];
          expect(callArgs.name).toBe('Updated Module');
          expect(callArgs.description).toBeUndefined();
          expect(callArgs.hp).toBeUndefined();
          expect(callArgs.updated).toBeDefined(); // Should add timestamp
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should transform nested objects to IDs', (done) => {
      const updateSpy = jasmine.createSpy('update').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue(
            Promise.resolve({data: [{id: 1}], error: null})
          )
        })
      });
      
      spyOn(supabaseClient, 'from').and.returnValue({
        update: updateSpy
      });
      
      service.update.module({
        id: 1,
        standard: {id: 5, name: 'Eurorack'} as any
      }).subscribe({
        next: () => {
          const callArgs = updateSpy.calls.first().args[0];
          expect(callArgs.standard).toBe(5);
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should strip non-updatable fields', (done) => {
      const updateSpy = jasmine.createSpy('update').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue(
            Promise.resolve({data: [{id: 1}], error: null})
          )
        })
      });
      
      spyOn(supabaseClient, 'from').and.returnValue({
        update: updateSpy
      });
      
      service.update.module({
        id: 1,
        name: 'Test',
        ins: [] as any,
        outs: [] as any,
        tags: [] as any,
        panels: [] as any,
        manufacturer: {id: 1} as any
      }).subscribe({
        next: () => {
          const callArgs = updateSpy.calls.first().args[0];
          expect(callArgs.ins).toBeUndefined();
          expect(callArgs.outs).toBeUndefined();
          expect(callArgs.tags).toBeUndefined();
          expect(callArgs.panels).toBeUndefined();
          expect(callArgs.manufacturer).toBeUndefined();
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('update.rack', () => {
    it('should update rack with explicit fields only', (done) => {
      const upsertSpy = jasmine.createSpy('upsert').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue(
          Promise.resolve({data: [{id: 1}], error: null})
        )
      });
      
      spyOn(supabaseClient, 'from').and.returnValue({
        upsert: upsertSpy
      });
      
      const rackData = {
        id: 1,
        name: 'My Rack',
        description: 'Test rack',
        rows: 2,
        hp: 104,
        locked: false,
        public: true,
        image: null,
        author: {id: 'user-1', username: 'test'}
      };
      
      service.update.rack(rackData as any).subscribe({
        next: () => {
          const callArgs = upsertSpy.calls.first().args[0];
          expect(callArgs.id).toBe(1);
          expect(callArgs.authorid).toBe('user-1');
          expect(callArgs.name).toBe('My Rack');
          expect(callArgs.rows).toBe(2);
          expect(callArgs.hp).toBe(104);
          // Should not include unintended properties
          expect(callArgs.author).toBeUndefined();
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ============================================================================
  // DELETE Operations
  // ============================================================================
  
  describe('delete.comment', () => {
    it('should delete comment by id', (done) => {
      const filterSpy = jasmine.createSpy('filter').and.returnValue(
        Promise.resolve({data: null, error: null})
      );
      const deleteSpy = jasmine.createSpy('delete').and.returnValue({
        filter: filterSpy
      });
      
      spyOn(supabaseClient, 'from').and.returnValue({
        delete: deleteSpy
      });
      
      service.delete.comment(42).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 42);
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.userModule', () => {
    it('should delete module from user collection with user context', (done) => {
      const mockUser = {
        id: 'user-delete',
        email: 'delete@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      let userModulesDeleteCalled = false;
      let commentsDeleteCalled = false;
      
      // Mock the 'from' method to return different behavior based on table
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'user_modules') {
          userModulesDeleteCalled = true;
          return {
            delete: () => ({
              filter: (field: string, op: string, value: any) => {
                expect(field).toBe('profileid');
                expect(value).toBe('user-delete');
                return {
                  filter: (field2: string, op2: string, value2: any) => {
                    expect(field2).toBe('moduleid');
                    expect(value2).toBe(99);
                    return Promise.resolve({data: null, error: null});
                  }
                };
              }
            })
          };
        } else if (table === 'comments') {
          commentsDeleteCalled = true;
          return {
            delete: () => ({
              filter: () => ({
                filter: () => Promise.resolve({data: null, error: null})
              })
            })
          };
        }
        return {};
      });
      
      service.delete.userModule(99).subscribe({
        next: () => {
          expect(userModulesDeleteCalled).toBe(true);
          expect(commentsDeleteCalled).toBe(true);
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.rackedModule', () => {
    it('should delete racked module by id', (done) => {
      const filterSpy = jasmine.createSpy('filter').and.returnValue(
        Promise.resolve({data: null, error: null})
      );
      const deleteSpy = jasmine.createSpy('delete').and.returnValue({
        filter: filterSpy
      });
      
      spyOn(supabaseClient, 'from').and.returnValue({
        delete: deleteSpy
      });
      
      service.delete.rackedModule(7).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 7);
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ============================================================================
  // Complex Operations
  // ============================================================================
  
  describe('add.moduleINs and add.moduleOUTs', () => {
    it('should batch insert CVs with module association', (done) => {
      const cvData = [
        {id: 1, name: 'CV 1', type: 'input'},
        {id: 2, name: 'CV 2', type: 'input'}
      ];
      
      const insertSpy = jasmine.createSpy('insert').and.returnValue(
        Promise.resolve({data: null, error: null})
      );
      
      spyOn(supabaseClient, 'from').and.returnValue({
        insert: insertSpy
      });
      
      service.add.moduleINs(cvData as any, 42).subscribe({
        next: () => {
          const callArgs = insertSpy.calls.first().args[0];
          expect(callArgs.length).toBe(2);
          expect(callArgs[0].moduleid).toBe(42);
          expect(callArgs[1].moduleid).toBe(42);
          expect(callArgs[0].name).toBe('CV 1');
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should handle empty CV arrays', (done) => {
      const insertSpy = jasmine.createSpy('insert').and.returnValue(
        Promise.resolve({data: null, error: null})
      );
      
      spyOn(supabaseClient, 'from').and.returnValue({
        insert: insertSpy
      });
      
      service.add.moduleOUTs([], 42).subscribe({
        next: () => {
          const callArgs = insertSpy.calls.first().args[0];
          expect(callArgs.length).toBe(0);
          done();
        },
        error: (err) => {
          fail(`Error: ${ err }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ============================================================================
  // Method Availability
  // ============================================================================
  
  describe('CRUD API completeness', () => {
    it('should have all expected add methods', () => {
      const expectedAddMethods = [
        'comment', 'module_tags', 'userModule', 'rackModule',
        'rack', 'patch', 'modules', 'moduleINs', 'moduleOUTs',
        'manufacturers', 'panel'
      ];
      
      expectedAddMethods.forEach(method => {
        expect(typeof (service.add as any)[method]).toBe('function',
          `add.${ method } should exist`);
      });
    });
    
    it('should have all expected update methods', () => {
      const expectedUpdateMethods = [
        'module', 'rackedModules', 'rack', 'patch', 'patchConnections'
      ];
      
      expectedUpdateMethods.forEach(method => {
        expect(typeof (service.update as any)[method]).toBe('function',
          `update.${ method } should exist`);
      });
    });
    
    it('should have all expected delete methods', () => {
      const expectedDeleteMethods = [
        'comment', 'commentsForRack', 'module', 'userModule',
        'rackedModule', 'modulesOfRack', 'patch', 'patchConnectionsForPatch',
        'userPatch', 'userRack', 'modules', 'manufacturers', 'modulePanel'
      ];
      
      expectedDeleteMethods.forEach(method => {
        expect(typeof (service.delete as any)[method]).toBe('function',
          `delete.${ method } should exist`);
      });
    });
  });
});