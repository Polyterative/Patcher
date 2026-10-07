import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractCaptchaToken,
  handle,
  isGatedRequest,
  readMode,
  SITEVERIFY_URL,
} from '../../cloudflare/auth-gate/src/gate.ts';

const base = 'https://supabase.patcher.xyz';
const post = (path, body) => new Request(`${base}${path}`, { method: 'POST', body: JSON.stringify(body), headers: { origin: 'https://patcher.xyz' } });
const withToken = token => ({ email: 'a@b.c', password: 'x', gotrue_meta_security: { captcha_token: token } });

function fakeFetch(siteverify) {
  const calls = [];
  const fetcher = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    if (url === SITEVERIFY_URL) return siteverify();
    const request = input instanceof Request ? input : new Request(input, init);
    return new Response(JSON.stringify({ forwarded: true, body: await request.text() }), { status: 200 });
  };
  return { fetcher, calls };
}
const verdict = success => () => Response.json({ success, 'error-codes': success ? [] : ['invalid-input-response'] });

test('only POSTs to the email-sending auth paths are gated', () => {
  assert.equal(isGatedRequest(post('/auth/v1/signup', {})), true);
  assert.equal(isGatedRequest(post('/auth/v1/recover', {})), true);
  assert.equal(isGatedRequest(post('/auth/v1/otp', {})), true);
  assert.equal(isGatedRequest(post('/auth/v1/resend', {})), true);
  assert.equal(isGatedRequest(post('/auth/v1/token', {})), false);
  assert.equal(isGatedRequest(post('/auth/v1/signup-extra', {})), false);
  assert.equal(isGatedRequest(new Request(`${base}/auth/v1/signup`, { method: 'OPTIONS' })), false);
});

test('extracts the supabase-js captcha token', () => {
  assert.equal(extractCaptchaToken(JSON.stringify(withToken('abc'))), 'abc');
  assert.equal(extractCaptchaToken('{"email":"a"}'), null);
  assert.equal(extractCaptchaToken('not json'), null);
});

test('unknown MODE falls back to log', () => {
  assert.equal(readMode(undefined), 'log');
  assert.equal(readMode('ENFORCE'), 'log');
  assert.equal(readMode('enforce'), 'enforce');
});

test('enforce blocks a missing or rejected token with a GoTrue-shaped 400', async () => {
  const { fetcher, calls } = fakeFetch(verdict(false));
  const missing = await handle(post('/auth/v1/signup', { email: 'a@b.c' }), { TURNSTILE_SECRET: 's', MODE: 'enforce' }, fetcher);
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).error_code, 'captcha_failed');
  assert.equal(missing.headers.get('access-control-allow-origin'), 'https://patcher.xyz');
  assert.deepEqual(calls, [], 'no siteverify call and no forward without a token');

  const rejected = await handle(post('/auth/v1/recover', withToken('bad')), { TURNSTILE_SECRET: 's', MODE: 'enforce' }, fetcher);
  assert.equal(rejected.status, 400);
});

test('enforce forwards a verified request with its body intact', async () => {
  const { fetcher } = fakeFetch(verdict(true));
  const response = await handle(post('/auth/v1/signup', withToken('good')), { TURNSTILE_SECRET: 's', MODE: 'enforce' }, fetcher);
  const payload = await response.json();
  assert.equal(payload.forwarded, true);
  assert.equal(JSON.parse(payload.body).gotrue_meta_security.captcha_token, 'good');
});

test('log mode never blocks', async () => {
  const { fetcher } = fakeFetch(verdict(false));
  const response = await handle(post('/auth/v1/signup', { email: 'a@b.c' }), { TURNSTILE_SECRET: 's', MODE: 'log' }, fetcher);
  assert.equal((await response.json()).forwarded, true);
});

test('fails open when siteverify is down', async () => {
  const { fetcher } = fakeFetch(() => new Response('oops', { status: 503 }));
  const response = await handle(post('/auth/v1/signup', withToken('t')), { TURNSTILE_SECRET: 's', MODE: 'enforce' }, fetcher);
  assert.equal((await response.json()).forwarded, true);
});

test('ungated paths pass straight through', async () => {
  const { fetcher, calls } = fakeFetch(verdict(false));
  const response = await handle(post('/auth/v1/token', {}), { TURNSTILE_SECRET: 's', MODE: 'enforce' }, fetcher);
  assert.equal((await response.json()).forwarded, true);
  assert.equal(calls.includes(SITEVERIFY_URL), false);
});
