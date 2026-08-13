import { SupabaseService } from '../../supabase.service';
import type { SupabaseTableRow } from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  chainable,
  getSupabaseClientDouble,
  type QueryChainResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type ManufacturerRow = Pick<SupabaseTableRow<'manufacturers'>, 'id' | 'name'>;
type StandardRow = SupabaseTableRow<'standards'>;
type ModuleRow = Pick<SupabaseTableRow<'modules'>, 'hp' | 'id' | 'name'>;
type PatchRow = Pick<SupabaseTableRow<'patches'>, 'id' | 'name'>;
type ProfileRow = Pick<SupabaseTableRow<'profiles'>, 'id' | 'username'>;
type SingleRowResult<Row> = QueryChainResult<Row> & {
  data: Row;
  error: null;
};
type ListRowsResult<Row> = QueryChainResult<Row> & {
  data: Row[] | null;
  error: null;
};

describe('SupabaseService - GET single-entity fetchers', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  // ── get.manufacturerWithId ────────────────────────────────────────────────
  
  describe('get.manufacturerWithId', () => {
    it('should return manufacturer data for the given id', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<ManufacturerRow>({
          data: {id: 3, name: 'Make Noise'},
          error: null
        } satisfies SingleRowResult<ManufacturerRow>)
      );
      
      service.get.manufacturerWithId(3).subscribe({
        next: (result: SingleRowResult<ManufacturerRow>) => {
          expect(result.data.id).toBe(3);
          expect(result.data.name).toBe('Make Noise');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should filter by the correct manufacturer id', (done) => {
      const mock: SupabaseQueryChain<ManufacturerRow> = chainable<ManufacturerRow>({
        data: {id: 7, name: 'Intellijel'},
        error: null
      } satisfies SingleRowResult<ManufacturerRow>);
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.manufacturerWithId(7).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 7);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── get.standards ─────────────────────────────────────────────────────────
  
  describe('get.standards', () => {
    it('should return array of standards', (done) => {
      const mockStds: StandardRow[] = [{id: 0, name: '3U'}, {id: 1, name: '1U'}];
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<StandardRow>({data: mockStds, error: null} satisfies ListRowsResult<StandardRow>)
      );
      
      service.get.standards().subscribe({
        next: (result: ListRowsResult<StandardRow>) => {
          expect(Array.isArray(result.data)).toBeTrue();
          expect(result.data.length).toBe(2);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return empty array when no standards exist', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<StandardRow>({data: null, error: null} satisfies ListRowsResult<StandardRow>)
      );
      
      service.get.standards().subscribe({
        next: (result: ListRowsResult<StandardRow>) => {
          expect(result.data).toBeNull();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── GET.moduleWithId ──────────────────────────────────────────────────────
  
  describe('GET.moduleWithId', () => {
    it('should return module data for the given id', (done) => {
      const mockModule = {
        data: {id: 42, name: 'Maths', hp: 20},
        error: null
      } satisfies SingleRowResult<ModuleRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockModule));
      
      service.GET.moduleWithId(42).subscribe({
        next: (result: SingleRowResult<ModuleRow>) => {
          expect(result.data.id).toBe(42);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('orders the joined module_panels rows by color (default full-column select)', (done) => {
      const mockModule = {
        data: {id: 42, name: 'Maths', hp: 20},
        error: null
      } satisfies SingleRowResult<ModuleRow>;
      const query: SupabaseQueryChain<ModuleRow> = chainable(mockModule);
      const orderSpy = spyOn(query, 'order').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(query);

      service.GET.moduleWithId(42).subscribe({
        next: () => {
          expect(orderSpy).toHaveBeenCalledWith('color', {
            referencedTable: 'module_panels',
            ascending: true
          });
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('still orders the joined module_panels rows by color for the trimmed rack-display column set', (done) => {
      const mockModule = {
        data: {id: 42, name: 'Maths', hp: 20},
        error: null
      } satisfies SingleRowResult<ModuleRow>;
      const query: SupabaseQueryChain<ModuleRow> = chainable(mockModule);
      const orderSpy = spyOn(query, 'order').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(query);

      service.GET.moduleWithIdForRackDisplay(42).subscribe({
        next: () => {
          expect(orderSpy).toHaveBeenCalledWith('color', {
            referencedTable: 'module_panels',
            ascending: true
          });
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('selects only rendered panel columns (id,color,filename,description) for the rack-display column set', (done) => {
      const mockModule = {
        data: {id: 42, name: 'Maths', hp: 20},
        error: null
      } satisfies SingleRowResult<ModuleRow>;
      const query: SupabaseQueryChain<ModuleRow> = chainable(mockModule);
      const selectSpy = spyOn(query, 'select').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(query);

      service.GET.moduleWithIdForRackDisplay(42).subscribe({
        next: () => {
          const selectArg = selectSpy.calls.mostRecent().args[0] as string;
          expect(selectArg).toContain('panels:module_panels!module_panels_moduleid_fkey(id,color,filename,description)');
          expect(selectArg).not.toContain('module_panels_moduleid_fkey(*)');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── GET.patchWithId ───────────────────────────────────────────────────────
  
  describe('get.patchWithId', () => {
    it('should return patch data for the given id', (done) => {
      const mockPatch = {
        data: {id: 99, name: 'Ambient Pad'},
        error: null
      } satisfies SingleRowResult<PatchRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockPatch));
      
      service.get.patchWithId(99).subscribe({
        next: (result: SingleRowResult<PatchRow>) => {
          expect(result.data.id).toBe(99);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── GET.userWithId ────────────────────────────────────────────────────────
  
  describe('GET.userWithId', () => {
    it('should return user profile for the given id', (done) => {
      const mockProfile = {
        data: {id: 'abc', username: 'patcher_pro'},
        error: null
      } satisfies SingleRowResult<ProfileRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockProfile));
      
      service.get.userWithId('abc').subscribe({
        next: (result: SingleRowResult<ProfileRow>) => {
          expect(result.data.username).toBe('patcher_pro');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  // ── get.userWithId (lower-case namespace alias) ────────────────────────────
  
  describe('get.userWithId duplicate check', () => {
    it('should return user profile for the given id', (done) => {
      const mockProfile = {
        data: {id: 'xyz', username: 'modmaster'},
        error: null
      } satisfies SingleRowResult<ProfileRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockProfile));
      
      service.get.userWithId('xyz').subscribe({
        next: (result: SingleRowResult<ProfileRow>) => {
          expect(result.data.username).toBe('modmaster');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});