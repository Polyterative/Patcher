import { of, type Observable } from 'rxjs';
import type { CV } from 'src/app/models/cv';
import type {
  DbModule,
  ModulePanel
} from 'src/app/models/module';
import type { Standard } from 'src/app/models/standard';
import { TagType } from 'src/app/models/tag';
import type { CachedEntity } from '../../supabase.cache';
import type {
  SupabaseTableRow,
  SupabaseTableUpdate
} from '../../supabase-db.types';
import type {
  SimpleUserModel,
  SupabaseService
} from '../../supabase.service';
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
  type QueryListRowsResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type ModuleUpdatePayload = Omit<Partial<DbModule>, 'standard'> & {
  id: number;
  standard?: number | Standard | null;
};
type ModuleUpdateRow = Pick<SupabaseTableRow<'modules'>, 'created' | 'id' | 'updated'>;
type ModuleUpdateResult = QueryListRowsResult<ModuleUpdateRow>;
type ModuleUpdateQueryChain = SupabaseQueryChain<ModuleUpdateRow>;
type ModuleUpdateWrite = SupabaseTableUpdate<'modules'>;
type ModuleUpdateSpy = jasmine.Spy<(values: ModuleUpdateWrite) => ModuleUpdateQueryChain>;
type ModuleEqSpy = jasmine.Spy<(column: string, value: boolean | number | string | null) => ModuleUpdateQueryChain>;
type SupabaseFromSpy = jasmine.Spy<(table: string) => ModuleUpdateQueryChain>;
type CacheResetKeys = CachedEntity[];
type ModulePortRow = Pick<
  SupabaseTableRow<'module_ins'>,
  'authorid' | 'id' | 'isApproved' | 'isAudio' | 'isDCC' | 'isVOCT' | 'max' | 'min' | 'moduleid' | 'name'
>;
type ModuleTagRow = SupabaseTableRow<'module_tags'> & DbModule['tags'][number];
type ModulePanelRow = SupabaseTableRow<'module_panels'>;

const MODULE_UPDATE_COLUMNS = 'id,updated,created';
const AUTH_USER: SimpleUserModel = authUserFixture('test-user-id');
const UPDATE_ERROR = null;

function moduleUpdateResult(id: number): ModuleUpdateResult {
  return {
    data: [{
      created: '',
      id,
      updated: new Date().toISOString()
    }],
    error: UPDATE_ERROR
  };
}

function moduleUpdateChain(id: number): ModuleUpdateQueryChain {
  return chainable<ModuleUpdateRow>(moduleUpdateResult(id));
}

function moduleUpdateSpyFor(mock: ModuleUpdateQueryChain): ModuleUpdateSpy {
  return spyOn(mock, 'update').and.returnValue(mock) as ModuleUpdateSpy;
}

function moduleEqSpyFor(mock: ModuleUpdateQueryChain): ModuleEqSpy {
  return spyOn(mock, 'eq').and.returnValue(mock) as ModuleEqSpy;
}

function mockModuleUpdateFrom(
  supabaseClient: SupabaseClientDouble,
  mock: ModuleUpdateQueryChain
): SupabaseFromSpy {
  return spyOn(supabaseClient, 'from').and.returnValue(mock) as SupabaseFromSpy;
}

function firstUpdatePayload(updateSpy: ModuleUpdateSpy): ModuleUpdateWrite {
  return updateSpy.calls.first().args[0];
}

function updateModule(
  service: SupabaseService,
  payload: ModuleUpdatePayload
): Observable<ModuleUpdateResult> {
  return service.update.module(payload as Partial<DbModule>) as Observable<ModuleUpdateResult>;
}

function manufacturerFixture(): DbModule['manufacturer'] {
  return {
    id: 10,
    name: 'Moog'
  };
}

function modulePortFixture(moduleid: number, name: string): ModulePortRow & CV {
  return {
    authorid: 'test-user-id',
    id: moduleid * 10,
    isApproved: true,
    isAudio: false,
    isDCC: false,
    isVOCT: false,
    max: 5,
    min: -5,
    moduleid,
    name
  };
}

function moduleTagFixture(moduleid: number): ModuleTagRow {
  return {
    id: 30,
    moduleid,
    tag: {
      id: 3,
      name: 'Envelope',
      type: TagType.Modulation
    },
    tagid: 3,
    voteCount: [{moduletagid: 30}]
  };
}

function modulePanelFixture(moduleid: number): ModulePanelRow & ModulePanel {
  return {
    color: 1,
    created: '',
    description: 'Black panel',
    filename: 'black-panel.png',
    id: 40,
    isApproved: true,
    moduleid,
    updated: ''
  };
}

describe('SupabaseService - update.module', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  let userSessionSpy: jasmine.Spy<() => Observable<SimpleUserModel | null>>;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
    userSessionSpy = mockUserSession(service, AUTH_USER);
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  it('should send an update to the modules table', (done) => {
    const mock = moduleUpdateChain(5);
    const updateSpy = moduleUpdateSpyFor(mock);
    const fromSpy = mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {id: 5, name: 'VCO', hp: 8}).subscribe({
      next: () => {
        expect(fromSpy).toHaveBeenCalledWith('modules');
        expect(updateSpy).toHaveBeenCalled();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should strip the manufacturer field before sending', (done) => {
    const mock = moduleUpdateChain(3);
    const updateSpy = moduleUpdateSpyFor(mock);
    mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {id: 3, name: 'Filter', manufacturer: manufacturerFixture()}).subscribe({
      next: () => {
        const payload = firstUpdatePayload(updateSpy);
        expect(payload.manufacturerId).toBeUndefined();
        expect('manufacturer' in payload).toBeFalse();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should strip ins, outs, tags, panels fields', (done) => {
    const mock = moduleUpdateChain(4);
    const updateSpy = moduleUpdateSpyFor(mock);
    mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {
      id: 4,
      name: 'Env',
      hp: 4,
      ins: [modulePortFixture(4, 'gate')],
      outs: [modulePortFixture(4, 'env')],
      tags: [moduleTagFixture(4)],
      panels: [modulePanelFixture(4)]
    }).subscribe({
      next: () => {
        const payload = firstUpdatePayload(updateSpy);
        expect('ins' in payload).toBeFalse();
        expect('outs' in payload).toBeFalse();
        expect('tags' in payload).toBeFalse();
        expect('panels' in payload).toBeFalse();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should set updated to a recent ISO timestamp', (done) => {
    const before = Date.now();
    const mock = moduleUpdateChain(7);
    const updateSpy = moduleUpdateSpyFor(mock);
    mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {id: 7, name: 'LFO', hp: 6}).subscribe({
      next: () => {
        const payload = firstUpdatePayload(updateSpy);
        expect(typeof payload.updated).toBe('string');
        const updatedMs = new Date(payload.updated ?? '').getTime();
        expect(updatedMs).toBeGreaterThanOrEqual(before);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should bust modules and moduleWithId caches', (done) => {
    mockModuleUpdateFrom(supabaseClient, moduleUpdateChain(1));
    const bustedKeys: CacheResetKeys = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    updateModule(service, {id: 1, name: 'A', hp: 2}).subscribe({
      next: () => {
        expect(bustedKeys).toContain('modules');
        expect(bustedKeys).toContain('moduleWithId');
        expect(bustedKeys).toContain('currentUserModules');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should preserve standard = 0 (3U Doepfer) in the payload', (done) => {
    const mock = moduleUpdateChain(6);
    const updateSpy = moduleUpdateSpyFor(mock);
    mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {id: 6, name: 'Blank', standard: 0}).subscribe({
      next: () => {
        const payload = firstUpdatePayload(updateSpy);
        expect(payload.standard).toBe(0);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should normalise standard object to its id', (done) => {
    const mock = moduleUpdateChain(2);
    const updateSpy = moduleUpdateSpyFor(mock);
    mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {id: 2, name: 'Seq', standard: {id: 1, name: '3U'}}).subscribe({
      next: () => {
        const payload = firstUpdatePayload(updateSpy);
        expect(payload.standard).toBe(1);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should filter the row by the module id', (done) => {
    const mock = moduleUpdateChain(9);
    const eqSpy = moduleEqSpyFor(mock);
    mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {id: 9, name: 'VCA', hp: 4}).subscribe({
      next: () => {
        expect(eqSpy).toHaveBeenCalledWith('id', 9);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('allows logged-in users to update modules without submitter filtering', (done) => {
    const mock = moduleUpdateChain(7);
    const eqSpy = moduleEqSpyFor(mock);
    mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {id: 7, name: 'VCO'}).subscribe({
      next: () => {
        expect(eqSpy.calls.allArgs()).toEqual([['id', 7]]);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  });

  it('should require an authenticated user before updating modules', (done) => {
    userSessionSpy.and.returnValue(of(null));
    const fromSpy = mockModuleUpdateFrom(supabaseClient, moduleUpdateChain(8));

    updateModule(service, {id: 8, name: 'Nope'}).subscribe({
      next: () => {
        fail('Expected authentication error');
        done();
      },
      error: (err: Error) => {
        expect(err.message).toBe('Authentication required');
        expect(fromSpy).not.toHaveBeenCalled();
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should preserve update, eq, select call ordering', (done) => {
    const callOrder: string[] = [];
    const mock = moduleUpdateChain(10);
    spyOn(mock, 'update').and.callFake((values: Record<string, unknown>) => {
      callOrder.push('update');
      expect(values['name']).toBe('Ordered');
      return mock;
    });
    spyOn(mock, 'eq').and.callFake((column: string, value: boolean | number | string | null) => {
      callOrder.push(`eq:${ column }:${ value }`);
      return mock;
    });
    spyOn(mock, 'select').and.callFake((columns: string) => {
      callOrder.push(`select:${ columns }`);
      return mock;
    });
    mockModuleUpdateFrom(supabaseClient, mock);

    updateModule(service, {id: 10, name: 'Ordered'}).subscribe({
      next: () => {
        expect(callOrder).toEqual([
          'update',
          'eq:id:10',
          `select:${ MODULE_UPDATE_COLUMNS }`
        ]);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
