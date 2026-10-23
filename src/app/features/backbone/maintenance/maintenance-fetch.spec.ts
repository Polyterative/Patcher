import { createMaintenanceFetch } from './maintenance-fetch';

function jwt(role?: string): string {
  const payload = btoa(JSON.stringify({app_metadata: role ? {role} : {}}));
  return `h.${ payload }.s`;
}

describe('createMaintenanceFetch', () => {
  const rest = 'https://x.test/rest/v1/';
  let base: jasmine.Spy;
  const make = (enabled: boolean, token: string | null = null) =>
    createMaintenanceFetch(() => token, base as unknown as typeof fetch, () => enabled);

  beforeEach(() => {
    base = jasmine.createSpy('base').and.resolveTo(new Response('real'));
  });

  it('passes everything through when disabled', async () => {
    await make(false)(`${ rest }modules?select=*`);
    expect(base).toHaveBeenCalled();
  });

  it('returns an empty list for reads without hitting the network', async () => {
    const res = await make(true)(`${ rest }modules?select=*`);
    expect(base).not.toHaveBeenCalled();
    expect(await res.json()).toEqual([]);
  });

  it('answers single-object requests like an empty result (PGRST116)', async () => {
    const res = await make(true)(`${ rest }racks?id=eq.1`, {headers: {Accept: 'application/vnd.pgrst.object+json'}});
    expect(res.status).toBe(406);
    expect((await res.json()).code).toBe('PGRST116');
  });

  it('fails writes with 503 and treats rpc as a read', async () => {
    const write = await make(true)(`${ rest }patches`, {method: 'POST'});
    expect(write.status).toBe(503);
    const rpc = await make(true)(`${ rest }rpc/get_stats`, {method: 'POST'});
    expect(await rpc.json()).toEqual([]);
    expect(base).not.toHaveBeenCalled();
  });

  it('leaves profiles, feature flags, auth and storage alone', async () => {
    const f = make(true);
    await f(`${ rest }profiles?id=eq.1`);
    await f(`${ rest }app_feature_flags`);
    await f('https://x.test/auth/v1/token');
    await f('https://x.test/storage/v1/object/x');
    expect(base).toHaveBeenCalledTimes(4);
  });

  it('lets admins through and still blocks non-admin sessions', async () => {
    await make(true, jwt('admin'))(`${ rest }modules`);
    expect(base).toHaveBeenCalledTimes(1);
    await make(true, jwt())(`${ rest }modules`);
    expect(base).toHaveBeenCalledTimes(1);
  });
});
