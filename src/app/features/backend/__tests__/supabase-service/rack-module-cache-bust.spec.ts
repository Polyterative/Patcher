import type { CachedEntity } from '../../supabase.cache';
import type { SupabaseTableRow } from '../../supabase-db.types';
import type { SupabaseService } from '../../supabase.service';
import type { RackedModule } from 'src/app/models/module';
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
  type SupabaseClientDouble
} from './supabase-query-test-doubles';

type RackModuleRow = Pick<
  SupabaseTableRow<'rack_modules'>,
  'column' | 'id' | 'moduleid' | 'orientation' | 'rackid' | 'row' | 'selected_panel_id'
>;

function nullResult<Row>(): QueryChainResult<Row> {
  return {data: null, error: null};
}

function singleRowResult<Row>(data: Row): QueryChainResult<Row> {
  return {data: [data], error: null};
}

describe('SupabaseService - rack-module mutations bust racksMinimal', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
    mockUserSession(service, authUserFixture('rack-module-bust-user'));
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  function expectBothKeys(bustedKeys: CachedEntity[]): void {
    expect(bustedKeys).toContain('rackWithId');
    expect(bustedKeys).toContain('racksMinimal');
  }

  it('add.rackModule busts rackWithId and racksMinimal', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable<RackModuleRow>(nullResult()));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    service.add.rackModule(10, 5, 0, 1).subscribe({
      next: () => {
        expectBothKeys(bustedKeys);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('update.rackedModules batch busts rackWithId and racksMinimal', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable<RackModuleRow>(nullResult()));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    const data = [{
      module: {id: 10} as RackedModule['module'],
      rackingData: {column: 0, id: 1, moduleid: 10, rackid: 5, row: 0}
    } as unknown as RackedModule];

    service.update.rackedModules(data).subscribe({
      next: () => {
        expectBothKeys(bustedKeys);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('update.rackModulePanel busts rackWithId and racksMinimal', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable<RackModuleRow>(nullResult()));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    service.update.rackModulePanel(1, 3).subscribe({
      next: () => {
        expectBothKeys(bustedKeys);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('update.rackModuleOrientation busts rackWithId and racksMinimal', (done) => {
    const row: RackModuleRow = {
      column: 0, id: 1, moduleid: 10, orientation: 'normal', rackid: 5, row: 0, selected_panel_id: null
    };
    spyOn(supabaseClient, 'from').and.returnValue(chainable<RackModuleRow>({data: row, error: null}));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    service.update.rackModuleOrientation(1, 'normal').subscribe({
      next: () => {
        expectBothKeys(bustedKeys);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('delete.rackedModule busts rackWithId and racksMinimal', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable<never>(nullResult()));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    service.delete.rackedModule(7).subscribe({
      next: () => {
        expectBothKeys(bustedKeys);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('delete.rackedModules busts rackWithId and racksMinimal', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable<never>(nullResult()));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    service.delete.rackedModules([7, 8]).subscribe({
      next: () => {
        expectBothKeys(bustedKeys);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('delete.modulesOfRack busts rackWithId and racksMinimal', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable<never>(nullResult()));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

    service.delete.modulesOfRack(5).subscribe({
      next: () => {
        expectBothKeys(bustedKeys);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
