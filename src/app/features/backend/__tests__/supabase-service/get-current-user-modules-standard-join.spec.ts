import { SupabaseService } from '../../supabase.service';
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


// Regression guard for the 1U-module rack proportions bug: collection modules must
// carry a joined `standard` object ({id,name}), not a raw FK scalar. When the scalar
// leaked through, `standard.id` was undefined so 1U modules rendered at 3U height in
// racks and their tooltip showed "(Manufacturer, undefined)".
describe('SupabaseService - GET.currentUserModules standard join', () => {
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

  it('requests the joined standard object and not a raw standard scalar column', (done) => {
    mockUserSession(service, authUserFixture('collection-user'));

    const mock = chainable({data: [], count: 0, error: null});
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.currentUserModules().subscribe({
      next: () => {
        expect(selectSpy).toHaveBeenCalled();
        const selectString = selectSpy.calls.mostRecent().args[0] as string;

        // The joined standard object keeps 1U modules at 1U proportions in racks.
        expect(selectString).toContain('standard:standards!modules_standard_fkey(name,id)');

        // The raw FK scalar must never leak back in as a bare column.
        expect(selectString).not.toContain(',standard,');
        expect(selectString).not.toContain(',standard)');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('requests the stats/power fields a racked module needs (weight, depth, power rails)', (done) => {
    mockUserSession(service, authUserFixture('collection-user'));

    const mock = chainable({data: [], count: 0, error: null});
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.currentUserModules().subscribe({
      next: () => {
        expect(selectSpy).toHaveBeenCalled();
        const selectString = selectSpy.calls.mostRecent().args[0] as string;

        // An optimistically-placed added module must carry the same fields as a
        // canonically racked module, or rack stats render "NaN mm" / "NaN kg".
        expect(selectString).toContain('weight');
        expect(selectString).toContain('depth');
        expect(selectString).toContain('powerPos12');
        expect(selectString).toContain('powerNeg12');
        expect(selectString).toContain('powerPos5');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
