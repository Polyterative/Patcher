import type { PostgrestError } from '@supabase/supabase-js';
import type { ModulePanel } from 'src/app/models/module';
import { SupabaseService } from '../../supabase.service';
import type { CachedEntity } from '../../supabase.cache';
import type { SupabaseTableRow } from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { CommentableEntityTypes } from '../../supabase-comments';
import {
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type QueryListRowsResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type CommentDeleteRow = Pick<SupabaseTableRow<'comments'>, 'id'>;
type ModuleCollectionDeleteRow = Pick<SupabaseTableRow<'module_collections'>, 'id'>;
type ModuleDeleteRow = Pick<SupabaseTableRow<'modules'>, 'id'>;
type ModuleFlagDeleteRow = Pick<SupabaseTableRow<'module_flags'>, 'id'>;
type ModulePanelDeleteRow = Pick<SupabaseTableRow<'module_panels'>, 'id'>;
type PatchConnectionDeleteRow = SupabaseTableRow<'patch_connections'>;
type PatchDeleteRow = Pick<SupabaseTableRow<'patches'>, 'id'>;
type PatchModuleInstanceDeleteRow = Pick<SupabaseTableRow<'patch_module_instances'>, 'id'>;
type RackDeleteRow = Pick<SupabaseTableRow<'racks'>, 'id'>;
type RackModuleDeleteRow = Pick<SupabaseTableRow<'rack_modules'>, 'id'>;
type UserModuleDeleteRow = SupabaseTableRow<'user_modules'>;
type DeleteInValue = Parameters<SupabaseQueryChain<unknown>['in']>[1][number];
type DeleteEqValue = Parameters<SupabaseQueryChain<unknown>['eq']>[1];
type DeleteInCall = {
  table: string;
  column: string;
  ids: DeleteInValue[];
};
type DeleteEqCall = {
  table: string;
  column: string;
  value: DeleteEqValue;
};
type StorageRemoveResult = {
  data: Array<{name?: string}> | null;
  error: null;
};
interface StorageBucketDouble {
  remove(paths: string[]): Promise<StorageRemoveResult>;
}
interface SupabaseStorageDouble {
  from(bucket: string): StorageBucketDouble;
}
type SupabaseClientWithStorageDouble = SupabaseClientDouble & {
  storage: SupabaseStorageDouble;
};

const successfulDelete = {data: null, error: null} satisfies QueryChainResult<never>;
const successfulStorageRemove = {data: [], error: null} satisfies StorageRemoveResult;

function selectedRows<Row>(rows: Row[]) {
  return {data: rows, error: null} satisfies QueryListRowsResult<Row>;
}

function supabaseError(message: string): PostgrestError {
  return {
    code: 'PGRST_TEST',
    details: '',
    hint: '',
    message,
    name: 'PostgrestError'
  };
}

function modulePanelFixture(overrides: Partial<ModulePanel> = {}): ModulePanel {
  return {
    color: 0,
    description: '',
    filename: 'panel.jpg',
    id: 5,
    moduleid: 1,
    ...overrides
  };
}

function getAdvancedSupabaseClientDouble(service: SupabaseService): SupabaseClientWithStorageDouble {
  const client = getSupabaseClientDouble(service);
  if (!hasStorageClientDouble(client)) {
    throw new Error('Supabase test setup did not expose a storage client double.');
  }

  return client;
}

function hasStorageClientDouble(client: SupabaseClientDouble): client is SupabaseClientWithStorageDouble {
  const storage = Reflect.get(client, 'storage');

  return typeof storage === 'object'
    && storage !== null
    && typeof Reflect.get(storage, 'from') === 'function';
}

function createStorageBucketDouble(): StorageBucketDouble {
  const remove = jasmine.createSpy<StorageBucketDouble['remove']>('remove')
    .and.returnValue(Promise.resolve(successfulStorageRemove));

  return {remove};
}

function buildDeleteMock<Row>(
  table: string,
  inCalls: DeleteInCall[],
  eqCalls: DeleteEqCall[]
): SupabaseQueryChain<Row> {
  const mock = chainable<Row>(successfulDelete);
  spyOn(mock, 'in').and.callFake((column: string, ids: readonly DeleteInValue[]) => {
    inCalls.push({table, column, ids: [...ids]});
    return mock;
  });
  spyOn(mock, 'eq').and.callFake((column: string, value: DeleteEqValue) => {
    eqCalls.push({table, column, value});
    return mock;
  });
  return mock;
}

describe('SupabaseService - delete advanced', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientWithStorageDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getAdvancedSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('delete.modulePanel', () => {
    it('should call storage.deletePanelFile then delete the DB row', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mockBucket = createStorageBucketDouble();
      spyOn(supabaseClient.storage, 'from').and.returnValue(mockBucket);

      const mock = chainable<ModulePanelDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<ModulePanelDeleteRow>['filter']> =
        spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      const panelData = modulePanelFixture({id: 10, filename: 'mypanel.jpg'});
      service.delete.modulePanel(panelData).subscribe({
        next: () => {
          expect(mockBucket.remove).toHaveBeenCalledWith(['mypanel.jpg']);
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 10);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should access module_panels table in the DB step', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mockBucket = createStorageBucketDouble();
      spyOn(supabaseClient.storage, 'from').and.returnValue(mockBucket);

      const tablesAccessed: string[] = [];
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        return chainable<ModulePanelDeleteRow>(successfulDelete);
      });

      service.delete.modulePanel(modulePanelFixture()).subscribe({
        next: () => {
          expect(tablesAccessed).toContain('module_panels');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.delete.modulePanel(modulePanelFixture()).subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.allUserData', () => {
    it('should complete the full sequential delete chain', (done) => {
      const mockUser = authUserFixture('delete-me-user');
      mockUserSession(service, mockUser);
      
      const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(chainable(successfulDelete));
      
      service.delete.allUserData().subscribe({
        next: () => {
          expect(fromSpy).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should access all required tables', (done) => {
      const mockUser = authUserFixture('delete-user-42');
      mockUserSession(service, mockUser);
      
      const tablesAccessed: string[] = [];
      let patchCalls = 0;
      let rackCalls = 0;
      let moduleCalls = 0;
      let collectionCalls = 0;
      let commentCalls = 0;
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        if (table === 'patches') {
          patchCalls++;
          return chainable<PatchDeleteRow>(selectedRows(patchCalls === 1 ? [{id: 1}] : []));
        }
        if (table === 'modules') {
          moduleCalls++;
          return chainable<ModuleDeleteRow>(selectedRows(moduleCalls === 1 ? [{id: 3}] : []));
        }
        if (table === 'module_collections') {
          collectionCalls++;
          return chainable<ModuleCollectionDeleteRow>(selectedRows(collectionCalls === 1 ? [{id: 4}] : []));
        }
        if (table === 'racks') {
          rackCalls++;
          return chainable<RackDeleteRow>(selectedRows(rackCalls === 1 ? [{id: 2}] : []));
        }
        if (table === 'comments') {
          commentCalls++;
          return chainable<CommentDeleteRow>(successfulDelete);
        }
        return chainable(successfulDelete);
      });
      
      service.delete.allUserData().subscribe({
        next: () => {
          expect(tablesAccessed).toContain('patch_connections');
          expect(tablesAccessed).toContain('patch_module_instances');
          expect(tablesAccessed).toContain('patches');
          expect(tablesAccessed).toContain('rack_modules');
          expect(tablesAccessed).toContain('racks');
          expect(tablesAccessed).toContain('user_modules');
          expect(tablesAccessed).toContain('comments');
          expect(tablesAccessed).toContain('modules');
          expect(tablesAccessed).toContain('module_flags');
          expect(tablesAccessed).toContain('module_collections');
          expect(tablesAccessed).toContain('module_collection_entries');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust all major caches', (done) => {
      const mockUser = authUserFixture('cache-bust-user');
      mockUserSession(service, mockUser);
      spyOn(supabaseClient, 'from').and.returnValue(chainable(successfulDelete));
      
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
      
      service.delete.allUserData().subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          expect(bustedKeys).toContain('comments');
          expect(bustedKeys).toContain('rackWithId');
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('module_flags');
          expect(bustedKeys).toContain('moduleCollections');
          expect(bustedKeys).toContain('moduleCollectionWithId');
          expect(bustedKeys).toContain('moduleCollectionsByModule');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should resolve owned ids before using .in filters', (done) => {
      const mockUser = authUserFixture('delete-user-ids');
      mockUserSession(service, mockUser);

      const inCalls: DeleteInCall[] = [];
      const eqCalls: DeleteEqCall[] = [];

      const patchSelect = chainable<PatchDeleteRow>(selectedRows([{id: 11}, {id: 12}]));
      const patchConnectionsDelete = buildDeleteMock<PatchConnectionDeleteRow>('patch_connections', inCalls, eqCalls);
      const patchModuleInstancesDelete = buildDeleteMock<PatchModuleInstanceDeleteRow>('patch_module_instances', inCalls, eqCalls);
      const patchDelete = buildDeleteMock<PatchDeleteRow>('patches', inCalls, eqCalls);
      const rackSelect = chainable<RackDeleteRow>(selectedRows([{id: 21}]));
      const rackModulesDelete = buildDeleteMock<RackModuleDeleteRow>('rack_modules', inCalls, eqCalls);
      const rackDelete = buildDeleteMock<RackDeleteRow>('racks', inCalls, eqCalls);
      const moduleSelect = chainable<ModuleDeleteRow>(selectedRows([{id: 31}, {id: 32}]));
      const moduleDelete = buildDeleteMock<ModuleDeleteRow>('modules', inCalls, eqCalls);
      const collectionSelect = chainable<ModuleCollectionDeleteRow>(selectedRows([{id: 41}]));
      const collectionEntriesByCollectionDelete =
        buildDeleteMock<ModuleCollectionDeleteRow>('module_collection_entries', inCalls, eqCalls);
      const collectionEntriesByModuleDelete =
        buildDeleteMock<ModuleCollectionDeleteRow>('module_collection_entries', inCalls, eqCalls);
      const collectionDelete = buildDeleteMock<ModuleCollectionDeleteRow>('module_collections', inCalls, eqCalls);
      const moduleFlagsByModuleDelete = buildDeleteMock<ModuleFlagDeleteRow>('module_flags', inCalls, eqCalls);
      const moduleFlagsByUserDelete = buildDeleteMock<ModuleFlagDeleteRow>('module_flags', inCalls, eqCalls);
      const userModulesDelete = chainable<UserModuleDeleteRow>(successfulDelete);
      const patchCommentsDelete = buildDeleteMock<CommentDeleteRow>('comments', inCalls, eqCalls);
      const rackCommentsDelete = buildDeleteMock<CommentDeleteRow>('comments', inCalls, eqCalls);
      const moduleCommentsDelete = buildDeleteMock<CommentDeleteRow>('comments', inCalls, eqCalls);
      const authorCommentsDelete = chainable<CommentDeleteRow>(successfulDelete);

      let patchCalls = 0;
      let rackCalls = 0;
      let commentCalls = 0;
      let moduleCalls = 0;
      let moduleCollectionCalls = 0;
      let moduleCollectionEntriesCalls = 0;
      let moduleFlagCalls = 0;

      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'patches') {
          patchCalls++;
          return patchCalls === 1 ? patchSelect : patchDelete;
        }
        if (table === 'modules') {
          moduleCalls++;
          return moduleCalls === 1 ? moduleSelect : moduleDelete;
        }
        if (table === 'module_collections') {
          moduleCollectionCalls++;
          return moduleCollectionCalls === 1 ? collectionSelect : collectionDelete;
        }
        if (table === 'module_collection_entries') {
          moduleCollectionEntriesCalls++;
          return moduleCollectionEntriesCalls === 1
            ? collectionEntriesByCollectionDelete
            : collectionEntriesByModuleDelete;
        }
        if (table === 'module_flags') {
          moduleFlagCalls++;
          return moduleFlagCalls === 1 ? moduleFlagsByModuleDelete : moduleFlagsByUserDelete;
        }
        if (table === 'patch_connections') return patchConnectionsDelete;
        if (table === 'patch_module_instances') return patchModuleInstancesDelete;
        if (table === 'racks') {
          rackCalls++;
          return rackCalls === 1 ? rackSelect : rackDelete;
        }
        if (table === 'rack_modules') return rackModulesDelete;
        if (table === 'user_modules') return userModulesDelete;
        if (table === 'comments') {
          commentCalls++;
          if (commentCalls === 1) return patchCommentsDelete;
          if (commentCalls === 2) return rackCommentsDelete;
          if (commentCalls === 3) return moduleCommentsDelete;
          return authorCommentsDelete;
        }
        fail(`Unexpected table access: ${ table }`);
        return chainable(successfulDelete);
      });

      service.delete.allUserData().subscribe({
        next: () => {
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'patch_connections',
            column: 'patchid',
            ids: [11, 12]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'patch_module_instances',
            column: 'patch_id',
            ids: [11, 12]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'patches',
            column: 'id',
            ids: [11, 12]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'rack_modules',
            column: 'rackid',
            ids: [21]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'racks',
            column: 'id',
            ids: [21]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'comments',
            column: 'entityId',
            ids: [11, 12]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'comments',
            column: 'entityId',
            ids: [21]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'module_collection_entries',
            column: 'collection_id',
            ids: [41]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'module_collection_entries',
            column: 'module_id',
            ids: [31, 32]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'module_collections',
            column: 'id',
            ids: [41]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'module_flags',
            column: 'module_id',
            ids: [31, 32]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'comments',
            column: 'entityId',
            ids: [31, 32]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'modules',
            column: 'id',
            ids: [31, 32]
          }));
          expect(eqCalls).toContain(jasmine.objectContaining({
            table: 'comments',
            column: 'entityType',
            value: CommentableEntityTypes.RACK
          }));
          expect(eqCalls).toContain(jasmine.objectContaining({
            table: 'comments',
            column: 'entityType',
            value: CommentableEntityTypes.MODULE
          }));
          expect(eqCalls).toContain(jasmine.objectContaining({
            table: 'module_flags',
            column: 'user_id',
            value: 'delete-user-ids'
          }));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when rack deletion leaves owned rack rows behind', (done) => {
      const mockUser = authUserFixture('delete-user-rack-remains');
      mockUserSession(service, mockUser);

      const patchSelect = chainable<PatchDeleteRow>(selectedRows([]));
      const rackSelect = chainable<RackDeleteRow>(selectedRows([{id: 21}]));
      const rackDelete = chainable<RackDeleteRow>(successfulDelete);
      const rackVerify = chainable<RackDeleteRow>(selectedRows([{id: 21}]));

      let rackCalls = 0;
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'patches') return patchSelect;
        if (table === 'racks') {
          rackCalls++;
          if (rackCalls === 1) return rackSelect;
          if (rackCalls === 2) return rackDelete;
          return rackVerify;
        }
        return chainable(successfulDelete);
      });

      service.delete.allUserData().subscribe({
        next: () => {
          fail('Expected an error when rack rows remain after deletion');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Rack deletion incomplete');
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should propagate Supabase errors during rack cleanup', (done) => {
      const mockUser = authUserFixture('delete-user-rack-error');
      mockUserSession(service, mockUser);

      const patchSelect = chainable<PatchDeleteRow>(selectedRows([]));
      const rackSelect = chainable<RackDeleteRow>(selectedRows([{id: 21}]));
      const rackModulesDelete = chainable<RackModuleDeleteRow>({
        data: null,
        error: supabaseError('rack modules blocked')
      });

      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'patches') return patchSelect;
        if (table === 'racks') return rackSelect;
        if (table === 'rack_modules') return rackModulesDelete;
        return chainable(successfulDelete);
      });

      service.delete.allUserData().subscribe({
        next: () => {
          fail('Expected rack module deletion error to propagate');
          done();
        },
        error: (err) => {
          expect(err.message).toBe('rack modules blocked');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});
