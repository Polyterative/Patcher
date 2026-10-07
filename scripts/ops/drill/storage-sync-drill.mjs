// End-to-end drill for scripts/ops/storage-sync.mjs against two in-memory mocks.
//   node scripts/ops/drill/storage-sync-drill.mjs
// Starts mock-storage-server.mjs (two instances on 127.0.0.1), runs the scenario,
// asserts every step, kills the mocks. Artifacts go to a temp BACKUP_DIR (printed).
// Uses only 127.0.0.1; the hosted-looking hostname is reached through HTTP_PROXY.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.resolve(here, '..', 'storage-sync.mjs');
const PS = Number(process.env.DRILL_PORT_SOURCE || 54301), PT = Number(process.env.DRILL_PORT_TARGET || 54302);
const KS = 'drill-source-key-' + Math.random().toString(36).slice(2), KT = 'drill-target-key-' + Math.random().toString(36).slice(2);
const S = 'http://127.0.0.1:' + PS, T = 'http://127.0.0.1:' + PT;
const OUT = fs.mkdtempSync(path.join(process.env.DRILL_TMP || os.tmpdir(), 'storage-sync-drill-'));
const transcript = [];
let failures = 0;

const mock = spawn(process.execPath, [path.join(here, 'mock-storage-server.mjs')], {
  env: { ...process.env, MOCK_INSTANCES: PS + ':' + KS + ',' + PT + ':' + KT }, stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolve) => { let n = 0; mock.stdout.on('data', (d) => { n += (String(d).match(/listening/g) || []).length; if (n >= 2) resolve(); }); });

function check(label, cond) {
  console.log((cond ? 'PASS ' : 'FAIL ') + label);
  if (!cond) failures++;
}
async function api(base, key, method, p, body, headers = {}) {
  const r = await fetch(base + p, { method, headers: { Authorization: 'Bearer ' + key, ...headers }, body });
  if (!r.ok) throw new Error(method + ' ' + p + ' -> ' + r.status + ' ' + (await r.text()));
  return r;
}
const put = (base, key, bucket, name, bytes, ct, cc) => api(base, key, 'POST', '/storage/v1/object/' + bucket + '/' + name, bytes,
  { 'Content-Type': ct, 'x-upsert': 'true', ...(cc ? { 'cache-control': cc } : {}) });
const del = (base, key, bucket, names) => api(base, key, 'DELETE', '/storage/v1/object/' + bucket, JSON.stringify({ prefixes: names }), { 'Content-Type': 'application/json' });
const get = async (base, key, bucket, name) => {
  const r = await fetch(base + '/storage/v1/object/authenticated/' + bucket + '/' + name, { headers: { Authorization: 'Bearer ' + key } });
  return r.ok ? { body: Buffer.from(await r.arrayBuffer()).toString(), ct: r.headers.get('content-type'), cc: r.headers.get('cache-control') } : null;
};
const stats = async (base) => (await fetch(base + '/__mock/stats')).json();

function run(args, extraEnv, { detached = false } = {}) {
  const res = spawnSync(process.execPath, [TOOL, ...args], {
    env: { PATH: process.env.PATH, BACKUP_DIR: OUT, LIST_PAGE_SIZE: '3', CONCURRENCY: '3', ...extraEnv },
    encoding: 'utf8', detached, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const out = (res.stdout || '') + (res.stderr || '');
  transcript.push(out);
  return { code: res.status, out };
}
const savedFile = (out, prefix) => { const m = out.match(new RegExp('saved (\\S*' + prefix + '\\S*\\.json)', 'g')); return m ? m[m.length - 1].slice(6) : null; };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const totals = (plan) => Object.values(plan.counts).reduce((a, c) => { for (const k in c) a[k] = (a[k] || 0) + c[k]; return a; }, {});
const SYNC = { SOURCE_SUPABASE_URL: S, SOURCE_SERVICE_KEY: KS, TARGET_SUPABASE_URL: T, TARGET_SERVICE_KEY: KT };

try {
  // ---- seed both sides identically ----
  const seed = [
    ['media', 'logo.png', 'PNG-logo', 'image/png', 'max-age=3600'],
    ['media', 'site.css', 'body{}', 'text/css', 'max-age=3600'],
    ['media', 'users/u1/avatar.png', 'PNG-u1', 'image/png', 'max-age=86400'],
    ['media', 'users/u1/deep/x/y.jpg', 'JPG-deep', 'image/jpeg', 'no-cache'],
    ['media', 'users/u2/b.webp', 'WEBP-u2', 'image/webp', 'max-age=3600'],
    ['media', 'users/u2/c.webp', 'WEBP-c', 'image/webp', 'max-age=3600'],
    ['media', 'users/u2/d.webp', 'WEBP-d', 'image/webp', 'max-age=3600'],
    ['media', 'users/u2/e.webp', 'WEBP-e', 'image/webp', 'max-age=3600'],
    ['private-docs', 'readme.txt', 'hello', 'text/plain', 'no-cache'],
    ['private-docs', '2026/10/report.pdf', '%PDF-original', 'application/pdf', 'max-age=60'],
    ['private-docs', '2026/10/data.json', '{"a":1}', 'application/json', 'max-age=60'],
  ];
  for (const [base, key] of [[S, KS], [T, KT]]) {
    await api(base, key, 'POST', '/storage/v1/bucket', JSON.stringify({ id: 'media', public: true }), { 'Content-Type': 'application/json' });
    await api(base, key, 'POST', '/storage/v1/bucket', JSON.stringify({ id: 'private-docs', public: false }), { 'Content-Type': 'application/json' });
    for (const [b, n, body, ct, cc] of seed) await put(base, key, b, n, body, ct, cc);
  }

  // ---- baseline inventory of the target (cutover) ----
  let r = run(['inventory'], { SUPABASE_URL: T, SERVICE_KEY: KT, LABEL: 'target-baseline' });
  const BASELINE = savedFile(r.out, 'storage-inventory-target-baseline');
  const baseInv = BASELINE && readJson(BASELINE);
  check('baseline inventory exit 0, 11 objects, 2 buckets with public flags, md5 present',
    r.code === 0 && baseInv.objects.length === 11 && baseInv.buckets.length === 2 &&
    baseInv.buckets.find((b) => b.id === 'media').public === true && baseInv.objects.every((o) => /^[0-9a-f]{32}$/.test(o.md5)));
  check('nested listing via pagination (page size 3) found users/u1/deep/x/y.jpg',
    baseInv.objects.some((o) => o.name === 'users/u1/deep/x/y.jpg' && o.mimetype === 'image/jpeg' && o.cacheControl === 'no-cache'));

  // PREVIOUS cache: no re-download of unchanged objects
  const d0 = (await stats(T)).downloads;
  r = run(['inventory'], { SUPABASE_URL: T, SERVICE_KEY: KT, LABEL: 'target-cached', PREVIOUS: BASELINE });
  check('PREVIOUS cache: 11 cached, 0 downloads (' + r.out.match(/md5 downloaded=\d+ cached=\d+/)?.[0] + ')',
    r.code === 0 && /md5 downloaded=0 cached=11/.test(r.out) && (await stats(T)).downloads === d0);

  // ---- mutations after cutover ----
  await put(S, KS, 'media', 'users/u3/new.png', 'PNG-new', 'image/png', 'max-age=3600');       // COPY (new)
  await put(S, KS, 'private-docs', '2026/10/report.pdf', '%PDF-changed!', 'application/pdf', 'max-age=60'); // COPY (bytes)
  await put(S, KS, 'media', 'site.css', 'body{}', 'text/css', 'max-age=60');                  // COPY (cacheControl only)
  await del(S, KS, 'media', ['users/u2/b.webp']);                                            // DELETE
  await put(T, KT, 'media', 'target-only.txt', 'mine', 'text/plain', 'no-cache');            // LEFT ALONE
  await put(T, KT, 'private-docs', 'readme.txt', 'hello EDITED on target', 'text/plain', 'no-cache'); // CONFLICT
  await del(T, KT, 'media', ['logo.png']);                                                   // CONFLICT (deleted on frozen target)

  // ---- dry run ----
  const t0 = await stats(T);
  r = run(['sync'], { ...SYNC, BASELINE });
  const plan = readJson(savedFile(r.out, 'storage-sync-plan-dryrun'));
  const t1 = await stats(T);
  console.log(r.out.split('\n').filter((l) => /^plan|^  /.test(l)).join('\n'));
  check('dry run exit 0 and wrote no target objects', r.code === 0 && t1.uploads === t0.uploads && t1.deletes === t0.deletes);
  check('dry-run counts media: copy=2 delete=1 conflict=1 left-alone=1',
    JSON.stringify(plan.counts.media) === JSON.stringify({ copy: 2, delete: 1, conflict: 1, leftAlone: 1, unchanged: 5 }));
  check('dry-run counts private-docs: copy=1 delete=0 conflict=1 left-alone=0',
    JSON.stringify(plan.counts['private-docs']) === JSON.stringify({ copy: 1, delete: 0, conflict: 1, leftAlone: 0, unchanged: 1 }));
  check('plan actions are exactly the expected names',
    JSON.stringify(plan.actions.map((a) => a.action + ':' + a.bucket + '/' + a.name).sort()) === JSON.stringify([
      'copy:media/site.css', 'copy:media/users/u3/new.png', 'copy:private-docs/2026/10/report.pdf', 'delete:media/users/u2/b.webp']) &&
    JSON.stringify(plan.conflicts.map((c) => c.name).sort()) === JSON.stringify(['logo.png', 'readme.txt']) &&
    /deleted on target after cutover/.test(plan.conflicts.find((c) => c.name === 'logo.png').reason) &&
    plan.leftAlone[0].name === 'target-only.txt');

  // ---- APPLY: guard, LIMIT smoke, full ----
  r = run(['sync'], { ...SYNC, BASELINE, APPLY: '1' });
  check('APPLY without CONFIRM_TARGET_HOST refused (exit 1)', r.code === 1 && /CONFIRM_TARGET_HOST=127\.0\.0\.1/.test(r.out));
  r = run(['sync'], { ...SYNC, BASELINE, APPLY: '1', CONFIRM_TARGET_HOST: '127.0.0.1', LIMIT: '1' });
  check('LIMIT=1 smoke applies 1 action, verifies, exits 4', r.code === 4 && /copied=1 deleted=0 failed=0/.test(r.out));
  r = run(['sync'], { ...SYNC, BASELINE, APPLY: '1', CONFIRM_TARGET_HOST: '127.0.0.1' });
  console.log(r.out.split('\n').filter((l) => /^applied|^post-apply|TOTAL|CONVERGED/.test(l)).join('\n'));
  check('full APPLY converged (exit 0)', r.code === 0 && /CONVERGED/.test(r.out) && /copied=2 deleted=1 failed=0/.test(r.out));
  const css = await get(T, KT, 'media', 'site.css');
  const pdf = await get(T, KT, 'private-docs', '2026/10/report.pdf');
  check('target now carries new cache-control / bytes / content-type',
    css.cc === 'max-age=60' && pdf.body === '%PDF-changed!' && pdf.ct === 'application/pdf' &&
    (await get(T, KT, 'media', 'users/u3/new.png'))?.ct === 'image/png' && (await get(T, KT, 'media', 'users/u2/b.webp')) === null);
  check('conflict skipped: target readme.txt still has the target edit', (await get(T, KT, 'private-docs', 'readme.txt')).body === 'hello EDITED on target');
  check('target-only object left alone', (await get(T, KT, 'media', 'target-only.txt'))?.body === 'mine');
  check('baseline object deleted on the frozen target is NOT silently restored', (await get(T, KT, 'media', 'logo.png')) === null);

  // ---- re-run is a no-op ----
  const t2 = await stats(T);
  r = run(['sync'], { ...SYNC, BASELINE, APPLY: '1', CONFIRM_TARGET_HOST: '127.0.0.1' });
  const t3 = await stats(T);
  check('re-run APPLY: copy=0 delete=0, no writes, exit 0', r.code === 0 && /TOTAL\s+copy=0 delete=0 conflict=2 left-alone=1/.test(r.out) &&
    t3.uploads === t2.uploads && t3.deletes === t2.deletes);

  // ---- guards ----
  r = run(['sync'], { ...SYNC, TARGET_SUPABASE_URL: S, TARGET_SERVICE_KEY: KS, BASELINE });
  check('identical source/target host refused (exit 1)', r.code === 1 && /same host/.test(r.out));
  r = run(['sync'], { ...SYNC, BASELINE, APPLY: '1', CONFIRM_TARGET_HOST: '127.0.0.1', TARGET_IS_HOSTED: '1' });
  check('TARGET_IS_HOSTED=1 on non-hosted target refused', r.code === 1 && /does not look hosted/.test(r.out));
  const H = 'http://fake.supabase.co:' + PT;
  const PROXY = { NODE_USE_ENV_PROXY: '1', HTTP_PROXY: T, NO_PROXY: '127.0.0.1' };
  const HOSTED = { ...SYNC, ...PROXY, TARGET_SUPABASE_URL: H, BASELINE, APPLY: '1' };
  const reqs = async () => (await stats(S)).requests + (await stats(T)).requests;
  const before = await reqs();
  const OK = { BASELINE_HOST_MISMATCH_OK: '1' }; // let refusals 2+ get past the (file-only) baseline host check
  const refusals = [
    // hosted check is FIRST: fires even with BASELINE and the source key missing, and with CONFIRM_TARGET_HOST set
    ['hosted check precedes every other guard', { BASELINE: '', SOURCE_SERVICE_KEY: '', CONFIRM_TARGET_HOST: 'fake.supabase.co' }, /needs TARGET_IS_HOSTED=1/],
    ['no TARGET_IS_HOSTED', OK, /needs TARGET_IS_HOSTED=1/],
    ['no CONFIRM_TARGET_HOST', { ...OK, TARGET_IS_HOSTED: '1' }, /CONFIRM_TARGET_HOST=fake\.supabase\.co/],
    ['wrong CONFIRM_TARGET_HOST', { ...OK, TARGET_IS_HOSTED: '1', CONFIRM_TARGET_HOST: '127.0.0.1' }, /CONFIRM_TARGET_HOST=fake\.supabase\.co/],
    ['no tty, no phrase', { ...OK, TARGET_IS_HOSTED: '1', CONFIRM_TARGET_HOST: 'fake.supabase.co' }, /no \/dev\/tty/],
    ['CONFIRM_PHRASE without test mode', { ...OK, TARGET_IS_HOSTED: '1', CONFIRM_TARGET_HOST: 'fake.supabase.co', CONFIRM_PHRASE: 'SYNC STORAGE TO HOSTED' }, /only for drills/],
    ['wrong phrase', { ...OK, TARGET_IS_HOSTED: '1', CONFIRM_TARGET_HOST: 'fake.supabase.co', CONFIRM_PHRASE: 'yes', STORAGE_SYNC_TEST_MODE: '1' }, /phrase mismatch/],
  ];
  for (const [label, extra, re] of refusals) {
    r = run(['sync'], { ...HOSTED, ...extra }, { detached: true });
    check('hosted guard refuses: ' + label, r.code === 1 && re.test(r.out));
  }
  check('hosted refusals made zero requests to either mock', (await reqs()) === before);
  r = run(['sync'], { ...HOSTED, TARGET_IS_HOSTED: '1', CONFIRM_TARGET_HOST: 'fake.supabase.co', CONFIRM_PHRASE: 'SYNC STORAGE TO HOSTED', STORAGE_SYNC_TEST_MODE: '1' }, { detached: true });
  check('hosted target with all flags: baseline host mismatch refused', r.code === 1 && /BASELINE was taken on 127\.0\.0\.1/.test(r.out));
  r = run(['sync'], { ...HOSTED, TARGET_IS_HOSTED: '1', CONFIRM_TARGET_HOST: 'fake.supabase.co', CONFIRM_PHRASE: 'SYNC STORAGE TO HOSTED', STORAGE_SYNC_TEST_MODE: '1', BASELINE_HOST_MISMATCH_OK: '1' }, { detached: true });
  check('hosted target with all flags + phrase accepted, reaches mock via proxy, no-op converged', r.code === 0 && /fake\.supabase\.co/.test(r.out) && /CONVERGED/.test(r.out));

  // ---- FORCE_CONFLICTS ----
  r = run(['sync'], { ...SYNC, BASELINE, APPLY: '1', CONFIRM_TARGET_HOST: '127.0.0.1', FORCE_CONFLICTS: '1' });
  check('FORCE_CONFLICTS=1 resolves both conflicts (overwrite + restore), still leaves target-only alone',
    r.code === 0 && (await get(T, KT, 'private-docs', 'readme.txt')).body === 'hello' &&
    (await get(T, KT, 'media', 'logo.png'))?.body === 'PNG-logo' && (await get(T, KT, 'media', 'target-only.txt'))?.body === 'mine');

  // ---- missing target bucket ----
  await api(S, KS, 'POST', '/storage/v1/bucket', JSON.stringify({ id: 'source-only', public: false }), { 'Content-Type': 'application/json' });
  r = run(['sync'], { ...SYNC, BASELINE });
  check('missing target bucket -> exit 2 listing it', r.code === 2 && /missing on target: source-only/.test(r.out) && /out of scope/.test(r.out));

  // ---- error paths must not leak keys (the mock echoes the presented token on 403) ----
  r = run(['sync'], { ...SYNC, TARGET_SERVICE_KEY: KT + '-wrong', BASELINE });
  check('wrong target key -> exit 1 "bad service key", token redacted', r.code === 1 && /bad service key/.test(r.out) && /\*\*\*/.test(r.out));
  r = run(['inventory'], { SUPABASE_URL: 'http://127.0.0.1:1', SERVICE_KEY: KT, LABEL: 'unreachable' });
  check('unreachable endpoint -> exit 1 with host, no key', r.code === 1 && /127\.0\.0\.1:1/.test(r.out));

  // ---- keys never printed or written ----
  const files = fs.readdirSync(OUT).map((f) => fs.readFileSync(path.join(OUT, f), 'utf8'));
  check('no key in any output or backup file (' + transcript.length + ' runs, ' + files.length + ' files)', ![...transcript, ...files].some((t) => t.includes(KS) || t.includes(KT)));
  check('backup files are mode 0600', fs.readdirSync(OUT).every((f) => (fs.statSync(path.join(OUT, f)).mode & 0o777) === 0o600));
} catch (e) {
  console.error('DRILL ERROR: ' + e.message);
  failures++;
} finally {
  mock.kill();
}
console.log('artifacts: ' + OUT);
console.log(failures ? failures + ' check(s) FAILED' : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
