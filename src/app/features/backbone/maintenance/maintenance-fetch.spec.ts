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

  it('leaves feature flags and auth alone', async () => {
    const f = make(true);
    await f(`${ rest }app_feature_flags`);
    await f('https://x.test/auth/v1/token');
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('blocks storage API calls for non-admins', async () => {
    const f = make(true);
    const read = await f('https://x.test/storage/v1/object/module-panels/a.png');
    expect(read.status).toBe(404);
    const write = await f('https://x.test/storage/v1/object/module-panels/a.png', {method: 'POST'});
    expect(write.status).toBe(503);
    expect(base).not.toHaveBeenCalled();
  });

  it('allows only the signed-in user\'s own profiles row', async () => {
    const token = `h.${ btoa(JSON.stringify({sub: 'u1'})) }.s`;
    const f = make(true, token);
    await f(`${ rest }profiles?select=username&id=eq.u1`);
    await f(`${ rest }profiles?id=eq.u1`, {method: 'PATCH', headers: {Authorization: `Bearer ${ token }`}});
    await f(`${ rest }profiles?on_conflict=id`, {method: 'POST', body: JSON.stringify({id: 'u1', email: 'a'})});
    await f(`${ rest }profiles?select=id&username=ilike.bob`);
    expect(base).toHaveBeenCalledTimes(4);
    const other = await f(`${ rest }profiles?select=*&id=eq.u2`);
    const list = await f(`${ rest }profiles?select=id,username,public`);
    const forged = await f(`${ rest }profiles`, {method: 'POST', body: JSON.stringify({id: 'u2'})});
    expect(await other.json()).toEqual([]);
    expect(await list.json()).toEqual([]);
    expect(forged.status).toBe(503);
    expect(base).toHaveBeenCalledTimes(4);
  });

  it('lets admins through and still blocks non-admin sessions', async () => {
    await make(true, jwt('admin'))(`${ rest }modules`);
    expect(base).toHaveBeenCalledTimes(1);
    await make(true, jwt())(`${ rest }modules`);
    expect(base).toHaveBeenCalledTimes(1);
  });
});
