import type { CV, CVwithModule } from 'src/app/models/cv';
import type {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import type {
  DbModule,
  RackedModule
} from 'src/app/models/module';
import type { Patch } from 'src/app/models/patch';
import type { RackModuleOrientation } from 'src/app/models/rack';
import type { CachedEntity } from '../../supabase.cache';
import type {
  SupabaseTableInsert,
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
  type QueryChainResult,
  type QuerySingleRowResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type PatchResultRow = Pick<SupabaseTableRow<'patches'>, 'id'>
  & Partial<Pick<SupabaseTableRow<'patches'>, 'linked_rack_id' | 'name'>>;
type PatchUpdateWrite = SupabaseTableUpdate<'patches'> & {
  author?: Patch['author'];
};
type PatchConnectionNoteWrite = Pick<SupabaseTableUpdate<'patch_connections'>, 'notes'>;
type PatchModuleInstanceLabelWrite = Pick<SupabaseTableUpdate<'patch_module_instances'>, 'instance_label'>;
type RackModulePanelWrite = Pick<SupabaseTableUpdate<'rack_modules'>, 'selected_panel_id'>;
type RackModuleOrientationWrite = Pick<SupabaseTableUpdate<'rack_modules'>, 'orientation'>;
type RackModuleRow = Pick<
  SupabaseTableRow<'rack_modules'>,
  'column' | 'id' | 'moduleid' | 'orientation' | 'rackid' | 'row' | 'selected_panel_id'
>;
type RackModuleUpsertWrite = Pick<
  SupabaseTableUpdate<'rack_modules'>,
  'column' | 'id' | 'moduleid' | 'rackid' | 'row' | 'selected_panel_id'
> & {
  selected_panel_id: number | null;
};
type RackModuleInsertWrite = Pick<
  SupabaseTableInsert<'rack_modules'>,
  'column' | 'moduleid' | 'orientation' | 'rackid' | 'row' | 'selected_panel_id'
> & {
  selected_panel_id: number | null;
};
type PatchConnectionInsertRow = Pick<SupabaseTableRow<'patch_connections'>, 'patchid'>;
type ModulePortRow = SupabaseTableRow<'module_ins'>;
type ModulePortInsertWrite = {
  authorid: string;
  id: undefined;
  max: number | null;
  min: number | null;
  moduleid: number;
  name: string;
};
type CacheResetKeys = CachedEntity[];
type UpdateSpy<Row, Payload> = jasmine.Spy<(values: Payload) => SupabaseQueryChain<Row>>;
type InsertSpy<Row, Payload> = jasmine.Spy<(values: Payload) => SupabaseQueryChain<Row>>;
type UpsertSpy<Row, Payload> = jasmine.Spy<(values: Payload) => SupabaseQueryChain<Row>>;
type SelectSpy<Row> = jasmine.Spy<SupabaseQueryChain<Row>['select']>;
type EqSpy<Row> = jasmine.Spy<SupabaseQueryChain<Row>['eq']>;
type IsSpy<Row> = jasmine.Spy<SupabaseQueryChain<Row>['is']>;
type SingleSpy<Row> = jasmine.Spy<SupabaseQueryChain<Row>['single']>;

const AUTH_USER: SimpleUserModel = authUserFixture('test-user');
const SELECT_RACK_MODULE_COLUMNS = 'id,moduleid,rackid,row,column,selected_panel_id,orientation';

function nullResult<Row>(): QueryChainResult<Row> {
  return {data: null, error: null};
}

function singleResult<Row>(data: Row): QuerySingleRowResult<Row> {
  return {data, error: null};
}

function queryChain<Row>(result: QueryChainResult<Row> = nullResult<Row>()): SupabaseQueryChain<Row> {
  return chainable<Row>(result);
}

function updateSpyFor<Row, Payload>(mock: SupabaseQueryChain<Row>): UpdateSpy<Row, Payload> {
  return spyOn(mock, 'update').and.returnValue(mock) as UpdateSpy<Row, Payload>;
}

function insertSpyFor<Row, Payload>(mock: SupabaseQueryChain<Row>): InsertSpy<Row, Payload> {
  return spyOn(mock, 'insert').and.returnValue(mock) as InsertSpy<Row, Payload>;
}

function upsertSpyFor<Row, Payload>(mock: SupabaseQueryChain<Row>): UpsertSpy<Row, Payload> {
  return spyOn(mock, 'upsert').and.returnValue(mock) as UpsertSpy<Row, Payload>;
}

function selectSpyFor<Row>(mock: SupabaseQueryChain<Row>): SelectSpy<Row> {
  return spyOn(mock, 'select').and.returnValue(mock);
}

function eqSpyFor<Row>(mock: SupabaseQueryChain<Row>): EqSpy<Row> {
  return spyOn(mock, 'eq').and.returnValue(mock);
}

function isSpyFor<Row>(mock: SupabaseQueryChain<Row>): IsSpy<Row> {
  return spyOn(mock, 'is').and.returnValue(mock);
}

function singleSpyFor<Row>(mock: SupabaseQueryChain<Row>): SingleSpy<Row> {
  return spyOn(mock, 'single').and.returnValue(mock);
}

function patchFixture(overrides: Partial<Patch> & Pick<Patch, 'id' | 'name'>): Patch {
  return {
    author: publicUserFixture('patch-author'),
    created: '',
    id: overrides.id,
    name: overrides.name,
    public: false,
    updated: '',
    ...overrides
  };
}

function publicUserFixture(id: string): Patch['author'] {
  return {
    id,
    username: `${ id }-name`
  };
}

function patchResultRow(id: number, overrides: Partial<PatchResultRow> = {}): PatchResultRow {
  return {id, ...overrides};
}

function connectionModuleFixture(id: number): CVwithModule['module'] {
  return {
    created: '',
    description: '',
    hp: 8,
    id,
    manufacturer: {
      id: 1,
      name: 'Make'
    },
    manufacturerId: 1,
    name: `Module ${ id }`,
    panels: [],
    public: true,
    standard: {
      id: 0,
      name: 'Eurorack'
    },
    tags: [],
    updated: ''
  };
}

function dbModuleFixture(id: number): DbModule {
  return {
    ...connectionModuleFixture(id),
    additional: null,
    depth: 0,
    ins: [],
    isApproved: true,
    isComplete: true,
    isDIY: false,
    manualURL: '',
    outs: [],
    panels: [],
    powerNeg12: null,
    powerPos5: null,
    powerPos12: null,
    store_url: null,
    switches: [],
    tags: [],
    weight: 0
  };
}

function cvWithModuleFixture(id: number, name: string, moduleId: number): CVwithModule {
  return {
    id,
    module: connectionModuleFixture(moduleId),
    name
  };
}

function patchConnectionFixture(overrides: Partial<PatchConnection> = {}): PatchConnection {
  return {
    a: cvWithModuleFixture(10, 'out', 100),
    b: cvWithModuleFixture(20, 'in', 200),
    instance_id_a: undefined,
    instance_id_b: undefined,
    notes: 'pitch',
    patch: patchFixture({id: 1, name: 'Patch'}),
    ...overrides
  };
}

function patchConnectionWithNullInstances(): PatchConnection {
  const conn = patchConnectionFixture();
  Object.defineProperties(conn, {
    instance_id_a: {
      enumerable: true,
      value: null
    },
    instance_id_b: {
      enumerable: true,
      value: null
    }
  });
  return conn;
}

function rackedModuleFixture(
  rackingData: RackedModule['rackingData'],
  moduleId: number = rackingData.moduleid
): RackedModule {
  return {
    module: dbModuleFixture(moduleId),
    rackingData
  };
}

function newCvFixture(name: string): CV {
  return {
    id: 0,
    name
  };
}

describe('SupabaseService - update extended', () => {
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

  describe('update.patch', () => {
    beforeEach(() => {
      mockUserSession(service, AUTH_USER);
    });

    it('should update a patch and strip the author field', (done) => {
      const mock = queryChain<PatchResultRow>(singleResult(patchResultRow(1)));
      const updateSpy = updateSpyFor<PatchResultRow, PatchUpdateWrite>(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.patch(patchFixture({
        author: publicUserFixture('u1'),
        id: 1,
        name: 'Edited Patch'
      })).subscribe({
        next: () => {
          const sentData = updateSpy.calls.first().args[0];
          expect(sentData.author).toBeUndefined();
          expect(sentData.name).toBe('Edited Patch');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust patches cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(queryChain<PatchResultRow>(singleResult(patchResultRow(1))));
      const bustedKeys: CacheResetKeys = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.update.patch(patchFixture({id: 1, name: 'X'})).subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.patchSilent', () => {
    beforeEach(() => {
      mockUserSession(service, AUTH_USER);
    });

    it('should update a patch without showing a success toast', (done) => {
      const mock = queryChain<PatchResultRow>(singleResult(patchResultRow(2)));
      const updateSpy = updateSpyFor<PatchResultRow, PatchUpdateWrite>(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.patchSilent(patchFixture({
        author: publicUserFixture('u2'),
        id: 2,
        name: 'Silent Edit'
      })).subscribe({
        next: () => {
          const sentData = updateSpy.calls.first().args[0];
          expect(sentData.author).toBeUndefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust patches cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(queryChain<PatchResultRow>(singleResult(patchResultRow(2))));
      const bustedKeys: CacheResetKeys = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.update.patchSilent(patchFixture({id: 2, name: 'S'})).subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.patchConnectionNoteSilent', () => {
    beforeEach(() => {
      mockUserSession(service, AUTH_USER);
    });

    it('should update the notes field', (done) => {
      const mock = queryChain<SupabaseTableRow<'patch_connections'>>();
      const updateSpy = updateSpyFor<SupabaseTableRow<'patch_connections'>, PatchConnectionNoteWrite>(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.patchConnectionNoteSilent(patchConnectionFixture({notes: 'gate'})).subscribe({
        next: () => {
          expect(updateSpy).toHaveBeenCalledWith({notes: 'gate'});
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should use .is() for null instance_id_a (null branch)', (done) => {
      const mock = queryChain<SupabaseTableRow<'patch_connections'>>();
      const isSpy = isSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.patchConnectionNoteSilent(patchConnectionWithNullInstances()).subscribe({
        next: () => {
          expect(isSpy).toHaveBeenCalledWith('instance_id_a', null);
          expect(isSpy).toHaveBeenCalledWith('instance_id_b', null);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should use .eq() for non-null instance_id_a (non-null branch)', (done) => {
      const mock = queryChain<SupabaseTableRow<'patch_connections'>>();
      const eqSpy = eqSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.patchConnectionNoteSilent(patchConnectionFixture({
        instance_id_a: 5,
        instance_id_b: 6
      })).subscribe({
        next: () => {
          expect(eqSpy).toHaveBeenCalledWith('instance_id_a', 5);
          expect(eqSpy).toHaveBeenCalledWith('instance_id_b', 6);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.patchModuleInstanceLabel', () => {
    beforeEach(() => {
      mockUserSession(service, AUTH_USER);
    });

    it('should update instance label and return a PatchModuleInstance', (done) => {
      const mockInstance: PatchModuleInstance = {
        id: 3,
        instance_label: 'VCO #2',
        module_id: 2,
        patch_id: 1
      };
      spyOn(supabaseClient, 'from').and.returnValue(
        queryChain<PatchModuleInstance>(singleResult(mockInstance))
      );

      service.update.patchModuleInstanceLabel(3, 'VCO #2').subscribe({
        next: (result: PatchModuleInstance) => {
          expect(result.instance_label).toBe('VCO #2');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should accept null label (clearing the label)', (done) => {
      const mock = queryChain<PatchModuleInstance>(singleResult({
        id: 3,
        instance_label: null,
        module_id: 2,
        patch_id: 1
      }));
      const updateSpy = updateSpyFor<PatchModuleInstance, PatchModuleInstanceLabelWrite>(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.patchModuleInstanceLabel(3, null).subscribe({
        next: () => {
          expect(updateSpy).toHaveBeenCalledWith({instance_label: null});
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.rackedModules', () => {
    beforeEach(() => {
      mockUserSession(service, AUTH_USER);
    });

    it('upserts existing modules without re-selecting them (avoids re-downloading the whole rack)', (done) => {
      const mock = queryChain<RackModuleRow>();
      const upsertSpy = upsertSpyFor<RackModuleRow, RackModuleUpsertWrite[]>(mock);
      const selectSpy = selectSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      const data: RackedModule[] = [
        rackedModuleFixture({column: 0, id: 1, moduleid: 10, rackid: 5, row: 0})
      ];

      service.update.rackedModules(data).subscribe({
        next: () => {
          expect(upsertSpy).toHaveBeenCalledWith([{
            column: 0,
            id: 1,
            moduleid: 10,
            rackid: 5,
            row: 0,
            selected_panel_id: null
          }]);
          // A pure reorder/move batch (no new modules) never reads the upserted rows back —
          // asserting no `.select()` locks in that this egress-saving optimization stays in place.
          expect(selectSpy).not.toHaveBeenCalled();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('selects new modules but not the upserted existing ones in a mixed batch', (done) => {
      const mock = queryChain<RackModuleRow>();
      const upsertSpy = upsertSpyFor<RackModuleRow, RackModuleUpsertWrite[]>(mock);
      const insertSpy = insertSpyFor<RackModuleRow, RackModuleInsertWrite[]>(mock);
      const selectSpy = selectSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      const data: RackedModule[] = [
        rackedModuleFixture({column: 0, id: 1, moduleid: 10, rackid: 5, row: 0}),
        rackedModuleFixture({column: 1, moduleid: 11, rackid: 5, row: 0})
      ];

      service.update.rackedModules(data).subscribe({
        next: () => {
          expect(upsertSpy).toHaveBeenCalledTimes(1);
          expect(insertSpy).toHaveBeenCalledTimes(1);
          expect(selectSpy).toHaveBeenCalledTimes(1);
          expect(selectSpy).toHaveBeenCalledWith(SELECT_RACK_MODULE_COLUMNS);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should include selected_panel_id in upsert payload', (done) => {
      const mock = queryChain<RackModuleRow>();
      const upsertSpy = upsertSpyFor<RackModuleRow, RackModuleUpsertWrite[]>(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      const data: RackedModule[] = [
        rackedModuleFixture({column: 0, id: 1, moduleid: 10, rackid: 5, row: 0, selectedPanelId: 7})
      ];

      service.update.rackedModules(data).subscribe({
        next: () => {
          const payload = upsertSpy.calls.mostRecent().args[0];
          expect(payload[0].selected_panel_id).toBe(7);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should leave existing rack module orientation untouched during batch upserts', (done) => {
      const mock = queryChain<RackModuleRow>();
      const upsertSpy = upsertSpyFor<RackModuleRow, RackModuleUpsertWrite[]>(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      const data: RackedModule[] = [
        rackedModuleFixture({column: 0, id: 1, moduleid: 10, orientation: 'rot180', rackid: 5, row: 0})
      ];

      service.update.rackedModules(data).subscribe({
        next: () => {
          const payload = upsertSpy.calls.mostRecent().args[0];
          expect('orientation' in payload[0]).toBeFalse();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should send selected_panel_id as null when selectedPanelId is absent', (done) => {
      const mock = queryChain<RackModuleRow>();
      const upsertSpy = upsertSpyFor<RackModuleRow, RackModuleUpsertWrite[]>(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      const data: RackedModule[] = [
        rackedModuleFixture({column: 1, id: 2, moduleid: 11, rackid: 5, row: 0})
      ];

      service.update.rackedModules(data).subscribe({
        next: () => {
          const payload = upsertSpy.calls.mostRecent().args[0];
          expect(payload[0].selected_panel_id).toBeNull();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should insert new modules when rackingData.id is undefined', (done) => {
      const mock = queryChain<RackModuleRow>();
      const upsertSpy = upsertSpyFor<RackModuleRow, RackModuleUpsertWrite[]>(mock);
      const insertSpy = insertSpyFor<RackModuleRow, RackModuleInsertWrite[]>(mock);
      const selectSpy = selectSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      const data: RackedModule[] = [
        rackedModuleFixture({column: 2, moduleid: 11, rackid: 5, row: 1})
      ];

      service.update.rackedModules(data).subscribe({
        next: () => {
          expect(insertSpy).toHaveBeenCalledWith([{
            column: 2,
            moduleid: 11,
            orientation: 'normal',
            rackid: 5,
            row: 1,
            selected_panel_id: null
          }]);
          expect(upsertSpy).not.toHaveBeenCalled();
          expect(selectSpy).toHaveBeenCalledWith(SELECT_RACK_MODULE_COLUMNS);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.rackModulePanel', () => {
    beforeEach(() => {
      mockUserSession(service, AUTH_USER);
    });

    it('should update selected_panel_id for the given rack module id', (done) => {
      const mock = queryChain<RackModuleRow>();
      const updateSpy = updateSpyFor<RackModuleRow, RackModulePanelWrite>(mock);
      eqSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.rackModulePanel(42, 5).subscribe({
        next: () => {
          expect(updateSpy).toHaveBeenCalledWith({selected_panel_id: 5});
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should allow setting selected_panel_id to null (clear selection)', (done) => {
      const mock = queryChain<RackModuleRow>();
      const updateSpy = updateSpyFor<RackModuleRow, RackModulePanelWrite>(mock);
      eqSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.rackModulePanel(42, null).subscribe({
        next: () => {
          expect(updateSpy).toHaveBeenCalledWith({selected_panel_id: null});
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust rackWithId cache', (done) => {
      const mock = queryChain<RackModuleRow>();
      updateSpyFor<RackModuleRow, RackModulePanelWrite>(mock);
      eqSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      const bustedKeys: CacheResetKeys = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.update.rackModulePanel(1, 3).subscribe({
        next: () => {
          expect(bustedKeys).toContain('rackWithId');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.rackModuleOrientation', () => {
    beforeEach(() => {
      mockUserSession(service, AUTH_USER);
    });

    it('should update orientation for the given rack module id', (done) => {
      const orientation: RackModuleOrientation = 'rot180';
      const mock = queryChain<RackModuleRow>(singleResult({
        column: 0,
        id: 42,
        moduleid: 10,
        orientation,
        rackid: 5,
        row: 0,
        selected_panel_id: null
      }));
      const updateSpy = updateSpyFor<RackModuleRow, RackModuleOrientationWrite>(mock);
      const eqSpy = eqSpyFor(mock);
      const selectSpy = selectSpyFor(mock);
      const singleSpy = singleSpyFor(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.update.rackModuleOrientation(42, orientation).subscribe({
        next: () => {
          expect(updateSpy).toHaveBeenCalledWith({orientation});
          expect(eqSpy).toHaveBeenCalledWith('id', 42);
          expect(selectSpy).toHaveBeenCalledWith('id,orientation');
          expect(singleSpy).toHaveBeenCalled();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust rackWithId cache', (done) => {
      const mock = queryChain<RackModuleRow>(singleResult({
        column: 0,
        id: 1,
        moduleid: 10,
        orientation: 'normal',
        rackid: 5,
        row: 0,
        selected_panel_id: null
      }));
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      const bustedKeys: CacheResetKeys = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.update.rackModuleOrientation(1, 'normal').subscribe({
        next: () => {
          expect(bustedKeys).toContain('rackWithId');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.patchConnections', () => {
    it('should call buildPatchConnectionInserter and bust cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(queryChain<PatchConnectionInsertRow>({
        data: [],
        error: null
      }));
      const bustedKeys: CacheResetKeys = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.update.patchConnections([]).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalled();
          expect(bustedKeys).toContain('patchConnections');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.patchConnectionsSilent', () => {
    it('should call buildPatchConnectionInserter silently and bust cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(queryChain<PatchConnectionInsertRow>({
        data: [],
        error: null
      }));
      const bustedKeys: CacheResetKeys = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.update.patchConnectionsSilent([]).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalled();
          expect(bustedKeys).toContain('patchConnections');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('update.moduleINsOUTs', () => {
    it('should complete and bust modules cache', (done) => {
      mockUserSession(service, authUserFixture('editor-1'));
      spyOn(supabaseClient, 'from').and.returnValue(queryChain<ModulePortRow>());
      const bustedKeys: CacheResetKeys = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.update.moduleINsOUTs(1, [newCvFixture('A')], []).subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should prefer explicit authorid over user session id', (done) => {
      mockUserSession(service, authUserFixture('session-user'));

      const insertMock = queryChain<ModulePortRow>();
      const insertSpy = insertSpyFor<ModulePortRow, ModulePortInsertWrite>(insertMock);
      spyOn(supabaseClient, 'from').and.returnValue(insertMock);

      service.update.moduleINsOUTs(1, [newCvFixture('A')], [], 'explicit-author').subscribe({
        next: () => {
          const insertedData = insertSpy.calls.first().args[0];
          expect(insertedData.authorid).toBe('explicit-author');
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
