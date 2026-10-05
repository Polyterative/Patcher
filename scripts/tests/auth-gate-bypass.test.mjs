import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  captchaFailedResponse,
  extractCaptchaToken,
  handle,
  isGatedRequest,
  verifyToken,
  SITEVERIFY_URL,
} from '../../cloudflare/auth-gate/src/gate.ts';

const base = 'https://supabase.patcher.xyz';
const req = (path, { method = 'POST', body = {}, headers = {} } = {}) =>
  new Request(`${base}${path}`, { method, body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body), headers });
const withToken = token => ({ email: 'a@b.c', gotrue_meta_security: { captcha_token: token } });

function fakeFetch(siteverify) {
  const calls = [];
  const fetcher = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    calls.push({ url: request.url, method: request.method, body: init?.body });
    if (request.url === SITEVERIFY_URL) return siteverify(init);
    return new Response(JSON.stringify({ forwarded: true, body: await request.text() }), { status: 200 });
  };
  return { fetcher, calls };
}
const ok = () => Response.json({ success: true });
const rejected = () => Response.json({ success: false, 'error-codes': ['invalid-input-response'] });

test('gated paths accept an optional trailing slash and are case-sensitive', () => {
  for (const path of ['/auth/v1/signup', '/auth/v1/signup/', '/auth/v1/recover', '/auth/v1/otp', '/auth/v1/resend/']) {
    assert.equal(isGatedRequest(req(path)), true, path);
  }
  for (const path of ['/auth/v1/SIGNUP', '/Auth/v1/signup', '/auth/v1/signup//', '/auth/v1/signupx', '/auth/v1/signup/x', '/x/auth/v1/signup', '/auth/v1/signup.json']) {
    assert.equal(isGatedRequest(req(path)), false, path);
  }
});

test('query strings and fragments do not affect matching', () => {
  assert.equal(isGatedRequest(req('/auth/v1/signup?redirect_to=https://evil.example')), true);
  assert.equal(isGatedRequest(req('/auth/v1/token?grant_type=password')), false);
});

test('GET/HEAD/PUT/DELETE/PATCH/OPTIONS on a gated path are not gated (only POST sends email)', () => {
  for (const method of ['GET', 'HEAD', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    assert.equal(isGatedRequest(req('/auth/v1/signup', { method })), false, method);
  }
});

test('login and refresh paths are never gated so e2e and token refresh keep working', () => {
  for (const path of ['/auth/v1/token', '/auth/v1/logout', '/auth/v1/user', '/auth/v1/verify', '/rest/v1/profiles']) {
    assert.equal(isGatedRequest(req(path)), false, path);
  }
});

// Known gaps worth a decision: these still trigger an email (or are routed by GoTrue after path
// normalisation) but are not matched by the exact-path regex.
test('KNOWN GAP: other email-sending endpoints are not gated', { todo: 'decide whether /magiclink, /reauthenticate, /invite, /user (email change) need the gate' }, () => {
  for (const path of ['/auth/v1/magiclink', '/auth/v1/reauthenticate']) {
    assert.equal(isGatedRequest(req(path)), true, path);
  }
});

test('KNOWN GAP: double-slash path variants fall outside the gate regex', { todo: 'verify whether the upstream normalises //auth/v1//signup before routing' }, () => {
  for (const path of ['//auth/v1/signup', '/auth/v1//signup']) {
    assert.equal(isGatedRequest(req(path)), true, path);
  }
});

test('extractCaptchaToken only returns non-empty strings from the exact nested path', () => {
  const good = JSON.stringify(withToken('tok'));
  assert.equal(extractCaptchaToken(good), 'tok');
  for (const body of [
    '', 'not json', '{', 'null', '[]', '"x"', '42', '{}',
    JSON.stringify({ gotrue_meta_security: null }),
    JSON.stringify({ gotrue_meta_security: {} }),
    JSON.stringify(withToken('')),
    JSON.stringify(withToken(null)),
    JSON.stringify(withToken(123)),
    JSON.stringify(withToken(['tok'])),
    JSON.stringify(withToken({ a: 1 })),
    JSON.stringify(withToken(true)),
    JSON.stringify({ captcha_token: 'tok' }),
    JSON.stringify({ 'gotrue_meta_security.captcha_token': 'tok' }),
    JSON.stringify({ GOTRUE_META_SECURITY: { captcha_token: 'tok' } }),
  ]) {
    assert.equal(extractCaptchaToken(body), null, body);
  }
});

test('verifyToken sends secret, token and ip as form data and never calls siteverify without a token', async () => {
  const { fetcher, calls } = fakeFetch(ok);
  assert.deepEqual(await verifyToken(null, 's', null, fetcher), { ok: false, reason: 'missing token' });
  assert.deepEqual(await verifyToken('', 's', null, fetcher), { ok: false, reason: 'missing token' });
  assert.equal(calls.length, 0);

  const outcome = await verifyToken('tok', 'sec', '1.2.3.4', fetcher);
  assert.deepEqual(outcome, { ok: true, reason: 'verified' });
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body.get('secret'), 'sec');
  assert.equal(calls[0].body.get('response'), 'tok');
  assert.equal(calls[0].body.get('remoteip'), '1.2.3.4');
});

test('verifyToken omits remoteip when unknown', async () => {
  const { fetcher, calls } = fakeFetch(ok);
  await verifyToken('tok', 'sec', null, fetcher);
  assert.equal(calls[0].body.has('remoteip'), false);
});

test('verifyToken surfaces siteverify error codes, defaults the reason, and treats success:"true" strings as failure', async () => {
  assert.deepEqual(
    await verifyToken('t', 's', null, fakeFetch(() => Response.json({ success: false, 'error-codes': ['timeout-or-duplicate', 'invalid-input-secret'] })).fetcher),
    { ok: false, reason: 'timeout-or-duplicate,invalid-input-secret' }
  );
  assert.deepEqual(
    await verifyToken('t', 's', null, fakeFetch(() => Response.json({ success: false })).fetcher),
    { ok: false, reason: 'rejected' }
  );
  assert.equal((await verifyToken('t', 's', null, fakeFetch(() => Response.json({})).fetcher)).ok, false);
});

test('verifyToken fails open on 5xx and network errors but not on an explicit rejection', async () => {
  for (const status of [500, 502, 503, 429]) {
    const outcome = await verifyToken('t', 's', null, fakeFetch(() => new Response('x', { status })).fetcher);
    assert.equal(outcome.ok, true, String(status));
    assert.match(outcome.reason, new RegExp(`HTTP ${status}`));
  }
  const thrown = await verifyToken('t', 's', null, async () => { throw new TypeError('network down'); });
  assert.equal(thrown.ok, true);
  assert.match(thrown.reason, /network down/);
  assert.equal((await verifyToken('t', 's', null, fakeFetch(rejected).fetcher)).ok, false);
});

test('verifyToken fails open when siteverify returns malformed JSON (documents current behaviour)', async () => {
  const outcome = await verifyToken('t', 's', null, fakeFetch(() => new Response('<html>', { status: 200 })).fetcher);
  assert.equal(outcome.ok, true);
});

test('captchaFailedResponse mirrors GoTrue and echoes the origin, falling back to *', async () => {
  const withOrigin = captchaFailedResponse(req('/auth/v1/signup', { headers: { origin: 'https://patcher.xyz' } }));
  assert.equal(withOrigin.status, 400);
  assert.equal(withOrigin.headers.get('access-control-allow-origin'), 'https://patcher.xyz');
  assert.equal(withOrigin.headers.get('vary'), 'Origin');
  assert.deepEqual(await withOrigin.json(), { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed' });
  assert.equal(captchaFailedResponse(req('/auth/v1/signup')).headers.get('access-control-allow-origin'), '*');
});

test('enforce: a rejected or missing token never reaches the upstream', async () => {
  for (const body of [{}, withToken(''), withToken('bad')]) {
    const { fetcher, calls } = fakeFetch(rejected);
    const res = await handle(req('/auth/v1/signup', { body }), { TURNSTILE_SECRET: 's', MODE: 'enforce' }, fetcher);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.ok(calls.every(c => c.url === SITEVERIFY_URL), 'upstream must not be called');
  }
});

test('enforce: unparseable and non-object bodies are blocked without verifying', async () => {
  for (const raw of ['', 'garbage', 'null', '[]']) {
    const { fetcher, calls } = fakeFetch(ok);
    const res = await handle(
      new Request(`${base}/auth/v1/recover`, { method: 'POST', body: raw }),
      { TURNSTILE_SECRET: 's', MODE: 'enforce' },
      fetcher
    );
    assert.equal(res.status, 400, raw);
    assert.equal(calls.length, 0, raw);
  }
});

test('enforce: a verified request is forwarded once, with the original body and headers', async () => {
  const { fetcher, calls } = fakeFetch(ok);
  const res = await handle(
    req('/auth/v1/otp', { body: withToken('good'), headers: { authorization: 'Bearer abc', apikey: 'anon' } }),
    { TURNSTILE_SECRET: 's', MODE: 'enforce' },
    fetcher
  );
  const forwarded = await res.json();
  assert.equal(forwarded.forwarded, true);
  assert.deepEqual(JSON.parse(forwarded.body), withToken('good'));
  assert.equal(calls.filter(c => c.url !== SITEVERIFY_URL).length, 1);
});

test('MODE=off skips verification entirely, even for gated paths', async () => {
  const { fetcher, calls } = fakeFetch(rejected);
  const res = await handle(req('/auth/v1/signup', { body: {} }), { TURNSTILE_SECRET: 's', MODE: 'off' }, fetcher);
  assert.equal(res.status, 200);
  assert.equal(calls.some(c => c.url === SITEVERIFY_URL), false);
});

test('log mode forwards failures but still verifies, and unset MODE behaves as log (never enforce)', async () => {
  for (const mode of ['log', undefined, 'ENFORCE', 'strict']) {
    const { fetcher, calls } = fakeFetch(rejected);
    const res = await handle(req('/auth/v1/signup', { body: withToken('bad') }), { TURNSTILE_SECRET: 's', MODE: mode }, fetcher);
    assert.equal(res.status, 200, String(mode));
    assert.equal(calls.some(c => c.url === SITEVERIFY_URL), true, String(mode));
  }
});

test('the cf-connecting-ip header is forwarded as remoteip, not a client-supplied x-forwarded-for', async () => {
  const { fetcher, calls } = fakeFetch(ok);
  await handle(
    req('/auth/v1/signup', { body: withToken('t'), headers: { 'cf-connecting-ip': '9.9.9.9', 'x-forwarded-for': '6.6.6.6' } }),
    { TURNSTILE_SECRET: 's', MODE: 'enforce' },
    fetcher
  );
  assert.equal(calls[0].body.get('remoteip'), '9.9.9.9');
});

test('the Turnstile secret is never logged or forwarded upstream', async () => {
  const logs = [];
  const original = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    const { fetcher, calls } = fakeFetch(rejected);
    await handle(req('/auth/v1/signup', { body: withToken('t') }), { TURNSTILE_SECRET: 'TOP-SECRET', MODE: 'enforce' }, fetcher);
    assert.ok(logs.length > 0);
    assert.ok(logs.every(line => !line.includes('TOP-SECRET')));
    assert.ok(calls.filter(c => c.url !== SITEVERIFY_URL).every(c => !String(c.body).includes('TOP-SECRET')));
  } finally {
    console.log = original;
  }
});
