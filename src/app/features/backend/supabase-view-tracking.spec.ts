import { createViewTrackingNamespace } from './supabase-view-tracking';

describe('createViewTrackingNamespace', () => {
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    fetchSpy = spyOn(window, 'fetch');
  });

  it('posts the batch to the RPC with the session token and keepalive', async () => {
    fetchSpy.and.resolveTo(new Response(null, { status: 204 }));
    const views = createViewTrackingNamespace('https://db.example', 'anon-key', () => 'user-token');

    await expectAsync(views.track('visitor-1234', [{ t: 1, id: 5, s: 0 }], true)).toBeResolvedTo('ok');

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('https://db.example/rest/v1/rpc/track_views');
    expect(init.keepalive).toBeTrue();
    expect(init.headers).toEqual(jasmine.objectContaining({ apikey: 'anon-key', Authorization: 'Bearer user-token' }));
    expect(JSON.parse(init.body as string)).toEqual({ p_visitor: 'visitor-1234', p_events: [{ t: 1, id: 5, s: 0 }] });
  });

  it('falls back to the anon key when signed out', async () => {
    fetchSpy.and.resolveTo(new Response(null, { status: 204 }));
    const views = createViewTrackingNamespace('https://db.example', 'anon-key', () => null);
    await views.track('visitor-1234', []);

    const init = fetchSpy.calls.mostRecent().args[1] as RequestInit;
    expect(init.headers).toEqual(jasmine.objectContaining({ Authorization: 'Bearer anon-key' }));
  });

  it('reports missing when the RPC is not deployed or revoked', async () => {
    const views = createViewTrackingNamespace('https://db.example', 'anon-key', () => null);
    for (const status of [401, 403, 404]) {
      fetchSpy.and.resolveTo(new Response(null, { status }));
      await expectAsync(views.track('visitor-1234', [])).toBeResolvedTo('missing');
    }
  });

  it('reports error on server errors and network failures without throwing', async () => {
    const views = createViewTrackingNamespace('https://db.example', 'anon-key', () => null);
    fetchSpy.and.resolveTo(new Response(null, { status: 500 }));
    await expectAsync(views.track('visitor-1234', [])).toBeResolvedTo('error');
    fetchSpy.and.rejectWith(new TypeError('offline'));
    await expectAsync(views.track('visitor-1234', [])).toBeResolvedTo('error');
  });
});
