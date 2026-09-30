import { firstValueFrom } from 'rxjs';
import type { RackedModule } from 'src/app/models/module';
import type { SupabaseService } from '../../supabase.service';
import type { SupabaseTableRow } from '../../supabase-db.types';
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
  type SupabaseClientDouble
} from './supabase-query-test-doubles';

type RackModuleRow = Pick<
  SupabaseTableRow<'rack_modules'>,
  'column' | 'id' | 'moduleid' | 'orientation' | 'rackid' | 'row' | 'selected_panel_id'
> & {
  module: {id: number; name: string};
};

function rowFor(rackid: number, moduleName = 'VCO'): RackModuleRow {
  return {
    column: 0,
    id: rackid * 100 + 1,
    moduleid: 10,
    orientation: 'normal',
    rackid,
    row: 0,
    selected_panel_id: null,
    module: {id: 10, name: moduleName}
  };
}

describe('SupabaseService - get.rackedModules short-TTL cache', () => {
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

  it('serves repeat reads for the same rackId from cache with a single network call', async () => {
    const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
      chainable<RackModuleRow>({data: [rowFor(7)], error: null})
    );

    const first = await firstValueFrom(service.get.rackedModules(7));
    const second = await firstValueFrom(service.get.rackedModules(7));

    expect(fromSpy.calls.count()).toBe(1);
    expect(fromSpy).toHaveBeenCalledWith('rack_modules');
    expect(second).toEqual(first);
    expect((first[0] as RackedModule).module.name).toBe('VCO');
  });

  it('fetches separately for distinct rackIds', async () => {
    spyOn(supabaseClient, 'from').and.returnValues(
      chainable<RackModuleRow>({data: [rowFor(7, 'VCO')], error: null}),
      chainable<RackModuleRow>({data: [rowFor(8, 'VCF')], error: null})
    );

    const forRack7 = await firstValueFrom(service.get.rackedModules(7));
    const forRack8 = await firstValueFrom(service.get.rackedModules(8));

    expect(supabaseClient.from).toHaveBeenCalledTimes(2);
    expect((forRack7[0] as RackedModule).module.name).toBe('VCO');
    expect((forRack8[0] as RackedModule).module.name).toBe('VCF');
  });

  it('refetches after a rack-module mutation busts the rackWithId tag', async () => {
    mockUserSession(service, authUserFixture('rack-module-cache-user'));
    const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
      chainable<RackModuleRow>({data: [rowFor(7)], error: null})
    );

    await firstValueFrom(service.get.rackedModules(7));
    expect(fromSpy.calls.count()).toBe(1);

    const data = [{
      module: {id: 10} as RackedModule['module'],
      rackingData: {column: 0, id: 701, moduleid: 10, rackid: 7, row: 0}
    } as unknown as RackedModule];
    await firstValueFrom(service.update.rackedModules(data));

    await firstValueFrom(service.get.rackedModules(7));
    // Read + batch upsert + refetch after the bust.
    expect(fromSpy.calls.count()).toBe(3);
  }, TEST_TIMEOUT);

  it('refetches after add.rackModule busts the rackWithId tag', async () => {
    mockUserSession(service, authUserFixture('rack-module-cache-user'));
    const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
      chainable<RackModuleRow>({data: [rowFor(7)], error: null})
    );

    await firstValueFrom(service.get.rackedModules(7));
    expect(fromSpy.calls.count()).toBe(1);

    await firstValueFrom(service.add.rackModule(10, 7));

    await firstValueFrom(service.get.rackedModules(7));
    // Read + insert + refetch after the bust.
    expect(fromSpy.calls.count()).toBe(3);
  }, TEST_TIMEOUT);

  it('refetches after delete.rackedModule busts the rackWithId tag', async () => {
    mockUserSession(service, authUserFixture('rack-module-cache-user'));
    const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
      chainable<RackModuleRow>({data: [rowFor(7)], error: null})
    );

    await firstValueFrom(service.get.rackedModules(7));
    expect(fromSpy.calls.count()).toBe(1);

    await firstValueFrom(service.delete.rackedModule(701));

    await firstValueFrom(service.get.rackedModules(7));
    // Read + delete + refetch after the bust.
    expect(fromSpy.calls.count()).toBe(3);
  }, TEST_TIMEOUT);
});
