import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import { of } from 'rxjs';


/**
 * Database Integration Tests - User Patches with Privacy
 *
 * Tests for patch privacy feature implemented 2026-02-18
 *
 * Feature Requirements:
 * - Patches should have a `public` field (boolean)
 * - New patches default to public: true
 * - Users can toggle privacy via requestPatchPrivacyStatusChange$
 * - Private patches show lock icon, public patches show public icon
 * - Privacy state tracked via isCurrentPatchPrivate$
 */
describe('SupabaseService - Patch Privacy Integration', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should create new patches with public: true by default', (done) => {
    // Mock user session
    spyOn(service as any, 'getUserSession$').and.returnValue(of({
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const supabaseClient = (service as any).supabase;
    let insertedData: any;
    
    // Spy on the insert call to capture what's being sent
    spyOn(supabaseClient, 'from').and.returnValue({
      insert: (data: any) => {
        insertedData = data;
        return Promise.resolve({
          data: [{id: 1, ...data}],
          error: null
        });
      }
    });
    
    service.add.patch({name: 'Test Patch'}).subscribe({
      next: () => {
        // Verify public field is set to true
        expect(insertedData.public).withContext(
          'New patches must default to public: true'
        ).toBe(true);
        
        expect(insertedData.name).toBe('Test Patch');
        expect(insertedData.authorid).toBe('test-user-id');
        
        done();
      },
      error: (err) => {
        fail('Should not error: ' + err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should retrieve patches with public field', (done) => {
    const mockPatchData = {
      id: 1,
      name: 'Test Patch',
      description: 'Test description',
      public: false,  // Private patch
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      authorid: 'test-user-id',
      author: {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com'
      }
    };
    
    const supabaseClient = (service as any).supabase;
    spyOn(supabaseClient, 'from').and.returnValue({
      select: () => ({
        filter: () => ({
          single: () => Promise.resolve({
            data: mockPatchData,
            error: null
          })
        })
      })
    });
    
    service.get.patchWithId(1).subscribe({
      next: (result: any) => {
        expect(result.data).toBeDefined();
        expect(result.data.public).withContext(
          'Patch data must include public field'
        ).toBe(false);
        expect(result.data.name).toBe('Test Patch');
        
        done();
      },
      error: (err) => {
        fail('Should not error: ' + err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should update patch privacy status', (done) => {
    const testPatch = {
      id: 1,
      name: 'Test Patch',
      description: 'Test',
      public: true,
      authorid: 'test-user-id',
      author: {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com'
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    const supabaseClient = (service as any).supabase;
    let updatedData: any;
    
    spyOn(supabaseClient, 'from').and.returnValue({
      update: (data: any) => {
        updatedData = data;
        return {
          eq: () => ({
            single: () => Promise.resolve({
              data: {...testPatch, ...data},
              error: null
            })
          })
        };
      }
    });
    
    // Toggle privacy (public -> private)
    const patchToUpdate = {...testPatch, public: false};
    
    service.update.patch(patchToUpdate).subscribe({
      next: () => {
        // Verify the public field was updated
        expect(updatedData.public).withContext(
          'Patch privacy field should be updated'
        ).toBe(false);
        
        done();
      },
      error: (err) => {
        fail('Should not error: ' + err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should return array of patches with public field (not response object)', (done) => {
    // Mock user session
    spyOn(service as any, 'getUserSession$').and.returnValue(of({
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const mockPatchData = [
      {
        id: 1,
        name: 'Public Patch',
        description: 'Public',
        public: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        authorid: 'test-user-id',
        author: {id: 'test-user-id', username: 'testuser', email: 'test@example.com'}
      },
      {
        id: 2,
        name: 'Private Patch',
        description: 'Private',
        public: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        authorid: 'test-user-id',
        author: {id: 'test-user-id', username: 'testuser', email: 'test@example.com'}
      }
    ];
    
    const supabaseClient = (service as any).supabase;
    spyOn(supabaseClient, 'from').and.returnValue({
      select: () => ({
        filter: () => ({
          order: () => Promise.resolve({
            data: mockPatchData,
            error: null
          })
        })
      })
    });
    
    service.get.currentUserPatches().subscribe({
      next: (result: any) => {
        // Verify it's an array
        expect(Array.isArray(result)).withContext(
          'currentUserPatches() must return an array'
        ).toBe(true);
        
        // Verify patches have public field
        expect(result.length).toBe(2);
        expect(result[0].public).toBe(true);
        expect(result[1].public).toBe(false);
        
        done();
      },
      error: (err) => {
        fail('Should not error: ' + err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

/**
 * Regression Tests - Patch Browser Public Filtering
 *
 * Regression: 2026-02-19 — Private patches were visible in the public patch
 * browser because GET.patches did not apply a `public = true` filter.
 */
describe('SupabaseService - Patch Browser Public Filtering (regression)', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should apply public=true filter when fetching patches for the browser', (done) => {
    const supabaseClient = (service as any).supabase;
    const filterSpy = jasmine.createSpy('filter').and.returnValue({
      order: () => ({
        order: () => ({
          range: () => Promise.resolve({data: [], count: 0, error: null})
        })
      })
    });
    
    spyOn(supabaseClient, 'from').and.returnValue({
      select: () => ({filter: filterSpy})
    });
    
    (service as any).getPatches(0, 19).subscribe({
      next: () => {
        expect(filterSpy).withContext(
          'GET.patches must filter by public=true to exclude private patches from the browser'
        ).toHaveBeenCalledWith('public', 'eq', true);
        done();
      },
      error: (err: any) => {
        fail('Should not error: ' + err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should not return private patches from GET.patches', (done) => {
    const supabaseClient = (service as any).supabase;
    
    const mockPublicOnly = [{id: 1, name: 'Public Patch', public: true}];
    
    // If the public filter is missing, the mock leaks private patches through
    spyOn(supabaseClient, 'from').and.returnValue({
      select: () => ({
        filter: (col: string, op: string, val: any) => {
          if (col !== 'public' || op !== 'eq' || val !== true) {
            return {
              order: () => ({
                order: () => ({
                  range: () => Promise.resolve({
                    data: [
                      {id: 1, name: 'Public Patch', public: true},
                      {id: 2, name: 'Private Patch', public: false}
                    ],
                    count: 2, error: null
                  })
                })
              })
            };
          }
          return {
            order: () => ({
              order: () => ({
                range: () => Promise.resolve({data: mockPublicOnly, count: 1, error: null})
              })
            })
          };
        }
      })
    });
    
    (service as any).getPatches(0, 19).subscribe({
      next: (result: any) => {
        const patches: any[] = result.data ?? [];
        const hasPrivate = patches.some((p: any) => p.public === false);
        expect(hasPrivate).withContext(
          'Private patches must not appear in the public patch browser'
        ).toBe(false);
        expect(patches.length).toBe(1);
        done();
      },
      error: (err: any) => {
        fail('Should not error: ' + err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});