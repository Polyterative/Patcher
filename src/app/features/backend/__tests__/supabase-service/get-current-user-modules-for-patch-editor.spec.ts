import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import { cacheBuster$ } from '../../supabase.cache';
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


// Regression guard for the patch-editor collection pull: it must use the
// trimmed editor projection (no module_tags join, no rack-stats scalars,
// narrowed panels) instead of the full getCurrentUserModules join, while
// still carrying every field the editor consumes downstream (name +
// manufacturer for filter/sort/group, hp + standard + panels for the card
// image, full ins/outs for click-to-wire, collectionUpdated for added-date
// sort, possessionKind for the WANTS exclusion).
describe('SupabaseService - GET.currentUserModulesForPatchEditor projection', () => {
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

  it('selects the trimmed editor projection without the tags join or rack-stats scalars', async () => {
    mockUserSession(service, authUserFixture('editor-user'));

    const mock = chainable({data: [], count: 0, error: null});
    const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    await firstValueFrom(service.GET.currentUserModulesForPatchEditor({
      key: 'moduleName',
      direction: 'asc'
    }));

    expect(selectSpy).toHaveBeenCalled();
    const selectString = selectSpy.calls.mostRecent().args[0] as string;

    // Possession envelope the editor sorts/filters on.
    expect(selectString).toContain('kind,collectionUpdated:updated');
    // Card identity + image sizing.
    expect(selectString).toContain('id,name,hp');
    // Name/manufacturer filter + sort/group, 1U proportions, panel thumbnail.
    expect(selectString).toContain('manufacturer:manufacturerId(name,id,logo)');
    expect(selectString).toContain('standard:standards!modules_standard_fkey(name,id)');
    expect(selectString).toContain('panels:module_panels!module_panels_moduleid_fkey(id,color,filename,description)');
    // Click-to-wire CVs.
    expect(selectString).toContain('ins:module_ins');
    expect(selectString).toContain('outs:module_outs');

    // Heaviest unused join: tags are hidden in the editor view config.
    expect(selectString).not.toContain('module_tags');
    // Rack-stats scalars unread by the editor (hp stays for image sizing).
    expect(selectString).not.toContain('weight');
    expect(selectString).not.toContain('powerPos12');
    expect(selectString).not.toContain('powerNeg12');
    expect(selectString).not.toContain('powerPos5');
    expect(selectString).not.toContain('isApproved');
  }, TEST_TIMEOUT);

  it('keeps wishlist exclusion client-side and maps rows to the collection shape', async () => {
    mockUserSession(service, authUserFixture('editor-user'));

    const mock = chainable({
      data: [
        {
          kind: 'HAS',
          collectionUpdated: '2026-09-01T00:00:00.000Z',
          module: {id: 7, name: 'Maths', hp: 20}
        },
        {
          kind: 'WANTS',
          collectionUpdated: '2026-09-02T00:00:00.000Z',
          module: {id: 8, name: 'Plaits', hp: 12}
        }
      ],
      count: 2,
      error: null
    });
    const filterSpy = spyOn(mock, 'filter').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    const modules = await firstValueFrom(service.GET.currentUserModulesForPatchEditor());

    // No server-side kind filter: the bindings layer drops WANTS rows, and a
    // server `neq` would also drop NULL-kind rows the client currently keeps.
    expect(filterSpy.calls.allArgs().filter(([column]) => column === 'kind')).toEqual([]);
    expect(modules.map(module => module.id)).toEqual([7, 8]);
    expect(modules[0].possessionKind).toBe('HAS');
    expect(modules[0].collectionUpdated).toBe('2026-09-01T00:00:00.000Z');
    expect(modules[1].possessionKind).toBe('WANTS');
  }, TEST_TIMEOUT);

  it('orders by module name when the editor sorts by name', async () => {
    mockUserSession(service, authUserFixture('editor-user'));

    const mock = chainable({data: [], count: 0, error: null});
    const orderSpy = spyOn(mock, 'order').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    await firstValueFrom(service.GET.currentUserModulesForPatchEditor({
      key: 'moduleName',
      direction: 'desc'
    }));

    expect(orderSpy).toHaveBeenCalledWith('name', jasmine.objectContaining({
      foreignTable: 'module',
      ascending: false
    }));
  }, TEST_TIMEOUT);

  it('caches repeated editor pulls and busts via the shared currentUserModules tag', async () => {
    mockUserSession(service, authUserFixture('editor-user'));

    const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: [], count: 0, error: null})
    );

    await firstValueFrom(service.GET.currentUserModulesForPatchEditor());
    await firstValueFrom(service.GET.currentUserModulesForPatchEditor());
    expect(fromSpy.calls.count()).toBe(1);

    cacheBuster$.next(['currentUserModules']);

    await firstValueFrom(service.GET.currentUserModulesForPatchEditor());
    expect(fromSpy.calls.count()).toBe(2);
  }, TEST_TIMEOUT);
});
