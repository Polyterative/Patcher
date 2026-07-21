import type { PatchModuleInstance } from 'src/app/models/connection';
import type { DbModule } from 'src/app/models/module';
import type { Patch } from 'src/app/models/patch';
import type { Rack } from 'src/app/models/rack';
import { SupabaseService } from '../../supabase.service';
import type { CachedEntity } from '../../supabase.cache';
import type {
  SupabaseTableInsert,
  SupabaseTableRow
} from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type PatchModuleInstanceInsert = Parameters<SupabaseService['add']['patchModuleInstances']>[0][number];
type PatchModuleInstanceResultRow = Pick<PatchModuleInstance, 'id' | 'instance_label' | 'module_id' | 'patch_id'>;
type ModuleUpsertPayload = SupabaseTableInsert<'modules'>;
type CurrentUserRackRow = Pick<Rack, 'id' | 'name'> & Pick<SupabaseTableRow<'racks'>, 'authorid'>;

function moduleFixture(data: Pick<DbModule, 'hp' | 'id' | 'name' | 'standard'>): DbModule {
  return {
    additional: null,
    created: '2026-07-21T00:00:00Z',
    depth: 0,
    description: '',
    hp: data.hp,
    id: data.id,
    ins: [],
    isApproved: false,
    isComplete: false,
    isDIY: false,
    manufacturer: {id: 2, name: 'Maker'},
    manufacturerId: 2,
    manualURL: '',
    name: data.name,
    outs: [],
    panels: [],
    powerNeg12: null,
    powerPos12: null,
    powerPos5: null,
    public: true,
    standard: data.standard,
    store_url: null,
    switches: [],
    tags: [],
    updated: '2026-07-21T00:00:00Z',
    weight: 0
  };
}

function firstModuleUpsertRows(
  upsertSpy: jasmine.Spy<SupabaseQueryChain<ModuleUpsertPayload>['upsert']>
): readonly Record<string, unknown>[] {
  const values = upsertSpy.calls.first().args[0];
  if (!Array.isArray(values)) {
    fail('Expected update.modules to upsert an array payload.');
    return [];
  }

  return values;
}

describe('SupabaseService - add misc and update bulk', () => {
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
  
  describe('add.patchModuleInstances (batch)', () => {
    beforeEach(() => {
      mockUserSession(service, authUserFixture('test-user'));
    });

    it('should insert multiple instances in a single call', (done) => {
      const mockRows = [
        {id: 1, patch_id: 10, module_id: 1, instance_label: 'VCO #1'},
        {id: 2, patch_id: 10, module_id: 2, instance_label: 'VCF #1'}
      ] satisfies PatchModuleInstanceResultRow[];
      const mock: SupabaseQueryChain<PatchModuleInstanceResultRow> = chainable<PatchModuleInstanceResultRow>(
        {data: mockRows, error: null} satisfies QueryChainResult<PatchModuleInstanceResultRow>
      );
      const insertSpy: jasmine.Spy<SupabaseQueryChain<PatchModuleInstanceResultRow>['insert']> =
        spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const rows = [
        {patch_id: 10, module_id: 1, instance_label: 'VCO #1'},
        {patch_id: 10, module_id: 2, instance_label: 'VCF #1'}
      ] satisfies PatchModuleInstanceInsert[];
      
      service.add.patchModuleInstances(rows).subscribe({
        next: (result: PatchModuleInstance[]) => {
          expect(insertSpy).toHaveBeenCalledWith(rows);
          expect(result).toEqual(mockRows);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust patchConnections and patchModuleInstances caches', (done) => {
      const mockRows = [{id: 1, patch_id: 1, module_id: 1, instance_label: null}] satisfies PatchModuleInstanceResultRow[];
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<PatchModuleInstanceResultRow>(
          {data: mockRows, error: null} satisfies QueryChainResult<PatchModuleInstanceResultRow>
        )
      );
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
      
      service.add.patchModuleInstances([{patch_id: 1, module_id: 1, instance_label: null}]).subscribe({
        next: () => {
          expect(bustedKeys).toContain('patchConnections');
          expect(bustedKeys).toContain('patchModuleInstances');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should default instance_label to null when omitted', (done) => {
      const mockRows = [{id: 5, patch_id: 2, module_id: 3, instance_label: null}] satisfies PatchModuleInstanceResultRow[];
      const mock: SupabaseQueryChain<PatchModuleInstanceResultRow> = chainable<PatchModuleInstanceResultRow>(
        {data: mockRows, error: null} satisfies QueryChainResult<PatchModuleInstanceResultRow>
      );
      const insertSpy: jasmine.Spy<SupabaseQueryChain<PatchModuleInstanceResultRow>['insert']> =
        spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.patchModuleInstances([{patch_id: 2, module_id: 3, instance_label: null}]).subscribe({
        next: () => {
          const sentRows = insertSpy.calls.first().args[0] as PatchModuleInstanceInsert[];
          expect(sentRows[0].instance_label).toBeNull();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('update.modules (bulk upsert)', () => {
    it('should upsert a list of modules and bust caches', (done) => {
      const mock: SupabaseQueryChain<ModuleUpsertPayload> = chainable<ModuleUpsertPayload>(
        {data: null, error: null} satisfies QueryChainResult<ModuleUpsertPayload>
      );
      const upsertSpy: jasmine.Spy<SupabaseQueryChain<ModuleUpsertPayload>['upsert']> =
        spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const modules = [
        moduleFixture({id: 1, name: 'VCO', hp: 8, standard: {id: 1, name: 'Intellijel 1U'}})
      ];
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
      
      service.update.modules(modules).subscribe({
        next: () => {
          expect(upsertSpy).toHaveBeenCalled();
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
    
    it('should transform nested standard object to id before upsert', (done) => {
      const mock: SupabaseQueryChain<ModuleUpsertPayload> = chainable<ModuleUpsertPayload>(
        {data: null, error: null} satisfies QueryChainResult<ModuleUpsertPayload>
      );
      const upsertSpy: jasmine.Spy<SupabaseQueryChain<ModuleUpsertPayload>['upsert']> =
        spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const modules = [moduleFixture({id: 5, name: 'VCF', hp: 10, standard: {id: 3, name: 'Buchla'}})];
      
      service.update.modules(modules).subscribe({
        next: () => {
          const upsertedData = firstModuleUpsertRows(upsertSpy);
          expect(upsertedData[0]['standard']).toBe(3);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should strip manufacturer, ins, outs, created and updated fields', (done) => {
      const mock: SupabaseQueryChain<ModuleUpsertPayload> = chainable<ModuleUpsertPayload>(
        {data: null, error: null} satisfies QueryChainResult<ModuleUpsertPayload>
      );
      const upsertSpy: jasmine.Spy<SupabaseQueryChain<ModuleUpsertPayload>['upsert']> =
        spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const modules = [moduleFixture({id: 7, name: 'LFO', hp: 4, standard: {id: 0, name: '3U'}})];
      
      service.update.modules(modules).subscribe({
        next: () => {
          const upsertedData = firstModuleUpsertRows(upsertSpy);
          expect(upsertedData[0]['manufacturer']).toBeUndefined();
          expect(upsertedData[0]['ins']).toBeUndefined();
          expect(upsertedData[0]['outs']).toBeUndefined();
          expect(upsertedData[0]['created']).toBeUndefined();
          expect(upsertedData[0]['updated']).toBeUndefined();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.currentUserPatches', () => {
    it('should return empty array when user is not logged in', (done) => {
      mockUserSession(service, null);
      
      service.get.currentUserPatches().subscribe({
        next: (result: Patch[]) => {
          expect(Array.isArray(result)).toBeTrue();
          expect(result.length).toBe(0);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.currentUserRacks', () => {
    it('should use the session authorid when available', (done) => {
      const getUserSessionSpy = mockUserSession(service, authUserFixture('session-user'));
      const rackRows = [{id: 1, name: 'My Rack', authorid: 'session-user'}] satisfies CurrentUserRackRow[];
      
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<CurrentUserRackRow>({data: rackRows, error: null} satisfies QueryChainResult<CurrentUserRackRow>)
      );
      
      service.get.currentUserRacks().subscribe({
        next: () => {
          expect(getUserSessionSpy).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return an empty array when no session user is available', (done) => {
      mockUserSession(service, null);
      
      service.get.currentUserRacks().subscribe({
        next: (result: Rack[]) => {
          expect(Array.isArray(result)).toBeTrue();
          expect(result.length).toBe(0);
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
