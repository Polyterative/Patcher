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
  type QueryListRowsResult,
  type QuerySingleRowResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type AddManufacturerDraft = Parameters<SupabaseService['add']['manufacturers']>[0][number];
type AddModuleDraft = Parameters<SupabaseService['add']['modules']>[0][number];
type ManufacturerResultRow = Pick<SupabaseTableRow<'manufacturers'>, 'id' | 'name'>;
type ModuleMutationRow = Pick<SupabaseTableRow<'modules'>, 'id'>;
type ModulePanelInsert = SupabaseTableInsert<'module_panels'>;
type ModuleTagInsert = SupabaseTableInsert<'module_tags'>;
type ModuleTagLinkResultRow = Pick<SupabaseTableRow<'module_tags'>, 'id'>;
type PatchModuleInstanceResultRow = Pick<
  SupabaseTableRow<'patch_module_instances'>,
  'id' | 'instance_label' | 'module_id' | 'patch_id'
>;
type UserModuleTagInsert = SupabaseTableInsert<'user_module_tags'>;

function moduleFixture(data: Pick<AddModuleDraft, 'hp' | 'id' | 'name'>): AddModuleDraft {
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
    manufacturer: {id: 1, name: 'Maker'},
    manufacturerId: 1,
    manualURL: '',
    name: data.name,
    outs: [],
    panels: [],
    powerNeg12: null,
    powerPos12: null,
    powerPos5: null,
    public: true,
    standard: {id: 0, name: '3U'},
    store_url: null,
    switches: [],
    tags: [],
    updated: '2026-07-21T00:00:00Z',
    weight: 0
  };
}

describe('SupabaseService - add extended', () => {
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
  
  describe('add.module_tags', () => {
    it('should upsert module tags and complete', (done) => {
      const moduleTags = [{moduleid: 1, tagid: 2}] satisfies ModuleTagInsert[];
      const mock: SupabaseQueryChain<ModuleTagInsert> = chainable<ModuleTagInsert>(
        {data: null, error: null} satisfies QueryChainResult<ModuleTagInsert>
      );
      const upsertSpy: jasmine.Spy<SupabaseQueryChain<ModuleTagInsert>['upsert']> =
        spyOn(mock, 'upsert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.module_tags(moduleTags).subscribe({
        next: () => {
          expect(upsertSpy).toHaveBeenCalledWith(moduleTags);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.userModuleTag', () => {
    it('should insert tag vote with user id and module tag id', (done) => {
      mockUserSession(service, authUserFixture('voter-1'));
      
      const mock: SupabaseQueryChain<UserModuleTagInsert> = chainable<UserModuleTagInsert>(
        {data: null, error: null} satisfies QueryChainResult<UserModuleTagInsert>
      );
      const insertSpy: jasmine.Spy<SupabaseQueryChain<UserModuleTagInsert>['insert']> =
        spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.userModuleTag(55).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith({
            moduletagid: 55,
            authorid: 'voter-1'
          } satisfies UserModuleTagInsert);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.moduleTagLink', () => {
    it('should insert a module-tag link and return the new id', (done) => {
      mockUserSession(service, authUserFixture('user-x'));
      
      const mock: SupabaseQueryChain<ModuleTagLinkResultRow> = chainable<ModuleTagLinkResultRow>({
        data: {id: 77},
        error: null
      } satisfies QuerySingleRowResult<ModuleTagLinkResultRow>);
      const insertSpy: jasmine.Spy<SupabaseQueryChain<ModuleTagLinkResultRow>['insert']> =
        spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.moduleTagLink(10, 3).subscribe({
        next: (result) => {
          expect(insertSpy).toHaveBeenCalledWith({
            moduleid: 10,
            tagid: 3
          } satisfies ModuleTagInsert);
          expect(result.id).toBe(77);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.manufacturers', () => {
    it('should insert manufacturers and return id+name', (done) => {
      const mockData = [{id: 1, name: 'New Maker'}] satisfies ManufacturerResultRow[];
      const manufacturers = [{name: 'New Maker'}] satisfies AddManufacturerDraft[];
      const mock: SupabaseQueryChain<ManufacturerResultRow> = chainable<ManufacturerResultRow>({
        data: mockData,
        error: null
      } satisfies QueryListRowsResult<ManufacturerResultRow>);
      const insertSpy: jasmine.Spy<SupabaseQueryChain<ManufacturerResultRow>['insert']> =
        spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.manufacturers(manufacturers).subscribe({
        next: (result) => {
          expect(insertSpy).toHaveBeenCalledWith(manufacturers);
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust manufacturers cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<ManufacturerResultRow>({
          data: [],
          error: null
        } satisfies QueryListRowsResult<ManufacturerResultRow>)
      );
      let busted = false;
      service.cacheResetter$.subscribe(keys => {
        if (keys.includes('manufacturers' satisfies CachedEntity)) busted = true;
      });
      
      service.add.manufacturers([{name: 'X'}]).subscribe({
        next: () => {
          expect(busted).toBeTrue();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.panel', () => {
    it('should insert a module panel record', (done) => {
      const panelData = [{
        moduleid: 1,
        color: 0,
        filename: 'panel.jpg',
        description: 'Light'
      }] satisfies ModulePanelInsert[];
      const mock: SupabaseQueryChain<ModulePanelInsert> = chainable<ModulePanelInsert>(
        {data: null, error: null} satisfies QueryChainResult<ModulePanelInsert>
      );
      const insertSpy: jasmine.Spy<SupabaseQueryChain<ModulePanelInsert>['insert']> =
        spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.panel(panelData).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith(panelData);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.patchModuleInstance', () => {
    beforeEach(() => {
      mockUserSession(service, authUserFixture('test-user'));
    });

    it('should insert an instance and return PatchModuleInstance', (done) => {
      const mockInstance = {
        id: 10,
        patch_id: 1,
        module_id: 2,
        instance_label: 'VCO #1'
      } satisfies PatchModuleInstanceResultRow;
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<PatchModuleInstanceResultRow>({
          data: mockInstance,
          error: null
        } satisfies QuerySingleRowResult<PatchModuleInstanceResultRow>)
      );
      
      service.add.patchModuleInstance(1, 2, 'VCO #1').subscribe({
        next: (result) => {
          expect(result.id).toBe(10);
          expect(result.instance_label).toBe('VCO #1');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should default instance_label to null when not provided', (done) => {
      const mock: SupabaseQueryChain<PatchModuleInstanceResultRow> = chainable<PatchModuleInstanceResultRow>({
        data: {id: 5, patch_id: 1, module_id: 2, instance_label: null},
        error: null
      } satisfies QuerySingleRowResult<PatchModuleInstanceResultRow>);
      const insertSpy: jasmine.Spy<SupabaseQueryChain<PatchModuleInstanceResultRow>['insert']> =
        spyOn(mock, 'insert').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.add.patchModuleInstance(1, 2).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith(
            jasmine.objectContaining({instance_label: null})
          );
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('add.modules', () => {
    it('should insert new modules (id=0) and update existing ones (id>0)', (done) => {
      mockUserSession(service, authUserFixture('submitter-1'));
      
      const mock: SupabaseQueryChain<ModuleMutationRow> = chainable<ModuleMutationRow>(
        {data: null, error: null} satisfies QueryChainResult<ModuleMutationRow>
      );
      const insertSpy: jasmine.Spy<SupabaseQueryChain<ModuleMutationRow>['insert']> =
        spyOn(mock, 'insert').and.returnValue(mock);
      const updateSpy: jasmine.Spy<SupabaseQueryChain<ModuleMutationRow>['update']> =
        spyOn(mock, 'update').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      const newModule = moduleFixture({id: 0, name: 'New VCO', hp: 8});
      const existingModule = moduleFixture({id: 99, name: 'Old VCF', hp: 12});
      
      service.add.modules([newModule, existingModule]).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalled();
          expect(updateSpy).toHaveBeenCalled();
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