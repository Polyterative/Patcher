import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildProbes,
  evaluate,
  heartbeat,
  isHeartbeatRun,
  runProbe,
} from '../../cloudflare/uptime-watchdog/src/watchdog.ts';

const options = { failsBeforeAlert: 2, remindMs: 4 * 3_600_000 };
const fail = name => ({ name, ok: false, detail: 'HTTP 502' });
const ok = name => ({ name, ok: true, detail: 'HTTP 200' });

test('a single failed run stays silent, the second one alerts', () => {
  const first = evaluate({}, [fail('selfhost auth')], 0, options);
  assert.equal(first.notifications.length, 0);
  const second = evaluate(first.state, [fail('selfhost auth')], 300_000, options);
  assert.equal(second.notifications.length, 1);
  assert.equal(second.notifications[0].priority, 'high');
  assert.match(second.notifications[0].body, /selfhost auth: HTTP 502/);
});

test('reminds after the reminder interval, not before', () => {
  let { state } = evaluate({}, [fail('site')], 0, options);
  ({ state } = evaluate(state, [fail('site')], 300_000, options));
  const early = evaluate(state, [fail('site')], 3_600_000, options);
  assert.equal(early.notifications.length, 0);
  const late = evaluate(early.state, [fail('site')], 300_000 + 4 * 3_600_000, options);
  assert.equal(late.notifications.length, 1);
  assert.match(late.notifications[0].title, /still down/);
});

test('recovery notice only after an alert', () => {
  const blip = evaluate({}, [fail('site')], 0, options);
  assert.equal(evaluate(blip.state, [ok('site')], 300_000, options).notifications.length, 0);

  let { state } = evaluate({}, [fail('site')], 0, options);
  ({ state } = evaluate(state, [fail('site')], 300_000, options));
  const recovered = evaluate(state, [ok('site')], 900_000, options);
  assert.equal(recovered.notifications.length, 1);
  assert.match(recovered.notifications[0].body, /site \(down 15 min\)/);
  assert.equal(recovered.state.site.fails, 0);
});

test('heartbeat fires in the first five minutes of the configured UTC hour', () => {
  assert.equal(isHeartbeatRun(Date.UTC(2026, 9, 4, 7, 0), 7), true);
  assert.equal(isHeartbeatRun(Date.UTC(2026, 9, 4, 7, 5), 7), false);
  assert.equal(isHeartbeatRun(Date.UTC(2026, 9, 4, 8, 0), 7), false);
  assert.match(heartbeat([ok('a'), fail('b')]).body, /1\/2 OK\. Failing: b/);
});

test('hosted probe is dropped when HOSTED_URL is empty', () => {
  const env = { SUPABASE_ANON_KEY: 'anon', NTFY_TOPIC: 't' };
  assert.ok(buildProbes(env).some(probe => probe.name === 'hosted auth'));
  assert.ok(!buildProbes({ ...env, HOSTED_URL: '' }).some(probe => probe.name === 'hosted auth'));
});

test('runProbe checks status, content type and body', async () => {
  const fakeFetch = (status, contentType, body) => async () =>
    new Response(body, { status, headers: { 'content-type': contentType } });
  const probe = { name: 'p', url: 'https://x.test', expectStatus: [200], expectContentType: 'image/' };
  assert.equal((await runProbe(probe, fakeFetch(200, 'image/jpeg', 'x'))).ok, true);
  assert.equal((await runProbe(probe, fakeFetch(200, 'text/html', 'x'))).detail, 'content-type text/html');
  assert.equal((await runProbe(probe, fakeFetch(503, 'image/jpeg', 'x'))).detail, 'HTTP 503');
  const bodyProbe = { name: 'b', url: 'https://x.test', expectStatus: [200], expectBody: body => body.startsWith('[{') };
  assert.equal((await runProbe(bodyProbe, fakeFetch(200, 'application/json', '[]'))).detail, 'unexpected body');
  const throwing = async () => { throw new Error('connection refused'); };
  assert.equal((await runProbe(probe, throwing)).detail, 'connection refused');
});
