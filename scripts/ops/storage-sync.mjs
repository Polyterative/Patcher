// Storage inventory + one-way sync between two Supabase Storage endpoints (API only,
// never SQL on storage.objects).
//
// Purpose: rollback order step 4 (self-host -> hosted). It runs AFTER the reverse DB
// apply, while the hosted public tables stay trigger-frozen. Hosted storage is NOT
// frozen (the Storage API must keep working for this tool); the app still points at the
// frozen self-host, so no user write races it. The same tool works in the forward
// direction and for side-by-side comparisons.
//
// Subcommands
//   inventory  read-only. Lists every object of every bucket (or BUCKETS=a,b) on ONE
//              endpoint and downloads each object to md5 its bytes. Writes
//              backups/storage-inventory-<label>-<ts>.json (per object: bucket, name,
//              size, mimetype, cacheControl, lastModified, md5; buckets with `public`).
//              Take it on hosted at T-10 (the cutover baseline), and on either side for
//              comparison.
//                SUPABASE_URL, SERVICE_KEY   the endpoint (key used read-only)
//                LABEL=hosted-t10            file label (default: "inventory")
//                PREVIOUS=<inventory.json>   reuse md5 for unchanged objects, keyed by
//                                            (bucket, name, size, lastModified)
//   sync       SOURCE -> TARGET, driven by a BASELINE inventory of the target taken at
//              cutover. Dry run by default (plan only, no writes).
//                SOURCE_SUPABASE_URL, SOURCE_SERVICE_KEY
//                TARGET_SUPABASE_URL, TARGET_SERVICE_KEY
//                BASELINE=<target inventory json taken at cutover>   (required)
//                SOURCE_PREVIOUS / TARGET_PREVIOUS   optional md5 caches, as PREVIOUS
//                APPLY=1                     execute the plan
//                FORCE_CONFLICTS=1           also resolve conflicts in the source's favour
//                CONFIRM_TARGET_HOST=<hostname>   required with APPLY=1
//                TARGET_IS_HOSTED=1          required with APPLY=1 when the target hostname
//                                            looks like hosted Supabase; then the phrase
//                                            "SYNC STORAGE TO HOSTED" must also be typed on
//                                            /dev/tty (CONFIRM_PHRASE env is accepted only
//                                            together with STORAGE_SYNC_TEST_MODE=1, for
//                                            drills against a mock).
//   Actions (compare by downloaded md5 + mimetype + cacheControl, never etag):
//     COPY        name new on source (not on target, not in baseline), or differs from
//                 source while the target still equals its baseline entry. Upsert carrying Content-Type and
//                 Cache-Control, then re-download and verify md5/type/cache-control.
//     DELETE      on target AND in baseline (unchanged since) AND gone from source, i.e.
//                 deleted on the source after cutover.
//     CONFLICT    target differs from its baseline entry (written after cutover) and also
//                 from the source, or a baseline object is gone from the target (deleted
//                 on the frozen side). Reported and skipped unless FORCE_CONFLICTS=1.
//     LEFT-ALONE  target-only object not in the baseline. NEVER deleted, not even forced.
//   After APPLY the tool re-inventories both sides and proves the remaining diff is
//   empty except for conflicts and left-alone objects.
//   Missing target buckets are an error (listed); creating buckets is out of scope —
//   create them first (with the source's `public` flag) and rerun.
//
// Known limitation (rollback design R8, decision pending): service-key uploads set
// storage.objects.owner/owner_id to the service role and do not carry user_metadata.
// If hosted storage policies are owner-based, an owner fix-up must follow (or stay
// API-only by decision); this tool does not do it.
//
// Knobs: CONCURRENCY (default 4 parallel downloads/uploads per phase), LIMIT (APPLY
// only: execute at most N actions — smoke run), SLOW=<ms> (delay after each object
// request; SLOW=1 means 150 ms), LIST_PAGE_SIZE (default 100), BUCKETS=a,b,
// BACKUP_DIR (default <repo>/backups, gitignored).
//
// Safety: keys come from the shell only, are never printed and are redacted from any
// error text. Source and target with the same host:port are refused. Files land in
// backups/ with mode 0600.
//
// Exit codes
//   0  inventory complete / dry-run plan written / APPLY converged
//      (conflicts and left-alone objects are reported but do not fail the run)
//   1  usage, guard refusal, auth or network failure
//   2  bucket(s) missing on the target (listed)
//   3  incomplete inventory, an apply step failed verification, or the post-apply
//      diff is not empty
//   4  LIMIT smoke: the applied subset verified, the rest of the plan remains
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOSTED_HOST = /(^|\.)supabase\.(co|com|in)$/i;
const HOSTED_PHRASE = 'SYNC STORAGE TO HOSTED';
const INVENTORY_KIND = 'patcher-storage-inventory';
const INVENTORY_VERSION = 1;

const env = process.env;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BACKUP_DIR = path.resolve(env.BACKUP_DIR || path.join(REPO_ROOT, 'backups'));
const CONCURRENCY = intEnv('CONCURRENCY', 4, 1);
const LIMIT = intEnv('LIMIT', 0, 0);
const PAGE = intEnv('LIST_PAGE_SIZE', 100, 1);
const SLOW_MS = env.SLOW ? (env.SLOW === '1' ? 150 : intEnv('SLOW', 150, 0)) : 0;
const BUCKET_FILTER = (env.BUCKETS || '').split(',').map((s) => s.trim()).filter(Boolean);

const SECRETS = [];

class Fatal extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

function intEnv(name, dflt, min) {
  const raw = env[name];
  if (raw === undefined || raw === '') return dflt;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) {
    console.error('ERROR: ' + name + ' must be an integer >= ' + min);
    process.exit(1);
  }
  return n;
}

function redact(text) {
  let s = String(text ?? '');
  for (const k of SECRETS) if (k) s = s.split(k).join('***');
  return s;
}

const enc = (name) => name.split('/').map(encodeURIComponent).join('/');
const baseType = (ct) => (ct || '').split(';')[0].trim().toLowerCase();
const normCc = (cc) => (cc ?? '').trim();
const objKey = (bucket, name) => bucket + '\u0000' + name;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

function endpoint(label, rawUrl, key, urlVar, keyVar) {
  if (!rawUrl || !key) throw new Fatal(label + ': set ' + urlVar + ' and ' + keyVar + ' in the shell (never commit them).');
  let u;
  try { u = new URL(rawUrl); } catch { throw new Fatal(urlVar + ' is not a valid URL.'); }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.search || u.hash) {
    throw new Fatal(urlVar + ' must be a plain http(s) base URL without credentials, query or fragment.');
  }
  SECRETS.push(key);
  return {
    label,
    base: u.origin + u.pathname.replace(/\/+$/, ''),
    host: u.host.toLowerCase(),
    hostname: u.hostname.toLowerCase(),
    headers: { apikey: key, Authorization: 'Bearer ' + key },
  };
}

async function request(ep, method, p, { body, headers = {} } = {}) {
  try {
    const r = await fetch(ep.base + p, { method, headers: { ...ep.headers, ...headers }, body });
    return r;
  } catch (e) {
    const cause = e && e.cause ? ' (' + (e.cause.code || e.cause.message || e.cause) + ')' : '';
    throw new Fatal(ep.label + ' ' + method + ' ' + ep.host + p + ' failed: ' + redact(e.message) + redact(cause));
  }
}

async function errText(r) {
  try { return redact((await r.text()).slice(0, 300)); } catch { return ''; }
}

// ---------- listing ----------

async function listBuckets(ep) {
  const r = await request(ep, 'GET', '/storage/v1/bucket');
  if (!r.ok) throw new Fatal(ep.label + ': bucket list returned ' + r.status + ' (bad service key?) ' + (await errText(r)));
  const arr = await r.json();
  if (!Array.isArray(arr)) throw new Fatal(ep.label + ': unexpected bucket list response shape.');
  return arr.map((b) => ({ id: b.id, name: b.name ?? b.id, public: Boolean(b.public) })).sort((a, b) => a.id.localeCompare(b.id));
}

// Supabase list API is one folder level per call: files carry an id + metadata,
// sub-folders come back as entries with id null. Paginated with limit/offset.
async function listObjects(ep, bucket) {
  const out = [];
  const prefixes = [''];
  while (prefixes.length) {
    const prefix = prefixes.shift();
    for (let offset = 0; ; offset += PAGE) {
      const r = await request(ep, 'POST', '/storage/v1/object/list/' + encodeURIComponent(bucket), {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } }),
      });
      if (!r.ok) throw new Fatal(ep.label + ': list ' + bucket + ' returned ' + r.status + ' ' + (await errText(r)));
      const page = await r.json();
      if (!Array.isArray(page)) throw new Fatal(ep.label + ': unexpected list response shape for ' + bucket);
      for (const e of page) {
        if (!e || typeof e.name !== 'string' || !e.name) continue;
        const full = prefix ? prefix + '/' + e.name : e.name;
        if (e.id === null || e.id === undefined) { prefixes.push(full); continue; }
        const m = e.metadata || {};
        out.push({
          bucket,
          name: full,
          size: Number(m.size ?? m.contentLength ?? 0),
          mimetype: m.mimetype ?? null,
          cacheControl: m.cacheControl ?? null,
          lastModified: m.lastModified ?? e.updated_at ?? null,
        });
      }
      if (page.length < PAGE) break;
    }
  }
  return out;
}

async function downloadMd5(ep, bucket, name) {
  const r = await request(ep, 'GET', '/storage/v1/object/authenticated/' + encodeURIComponent(bucket) + '/' + enc(name));
  if (!r.ok) { await errText(r); return { error: 'GET' + r.status }; }
  const h = crypto.createHash('md5');
  let bytes = 0;
  for await (const chunk of r.body) { h.update(chunk); bytes += chunk.length; }
  return { md5: h.digest('hex'), bytes };
}

async function pool(items, fn) {
  const queue = items.map((it, i) => [it, i]);
  const worker = async () => {
    while (queue.length) {
      const [it, i] = queue.shift();
      await fn(it, i);
      if (SLOW_MS) await sleep(SLOW_MS);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length || 1) }, worker));
}

// ---------- inventory ----------

function loadInventory(file, what) {
  let inv;
  try { inv = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Fatal(what + ': cannot read ' + file + ' (' + e.message + ')'); }
  if (inv.kind !== INVENTORY_KIND || inv.version !== INVENTORY_VERSION || !Array.isArray(inv.objects) || !Array.isArray(inv.buckets)) {
    throw new Fatal(what + ': ' + file + ' is not a v' + INVENTORY_VERSION + ' storage inventory.');
  }
  return inv;
}

function cacheFrom(file) {
  const m = new Map();
  if (!file) return m;
  const inv = loadInventory(file, 'PREVIOUS cache');
  for (const o of inv.objects) if (o.md5) m.set([o.bucket, o.name, o.size, o.lastModified].join('\u0000'), o.md5);
  return m;
}

async function takeInventory(ep, label, cache) {
  const allBuckets = await listBuckets(ep);
  const buckets = BUCKET_FILTER.length ? allBuckets.filter((b) => BUCKET_FILTER.includes(b.id)) : allBuckets;
  const objects = [];
  for (const b of buckets) objects.push(...(await listObjects(ep, b.id)));
  objects.sort((a, b) => a.bucket.localeCompare(b.bucket) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const errors = [];
  let downloaded = 0, cached = 0, done = 0;
  await pool(objects, async (o) => {
    const hit = cache.get([o.bucket, o.name, o.size, o.lastModified].join('\u0000'));
    if (hit) { o.md5 = hit; cached++; }
    else {
      const d = await downloadMd5(ep, o.bucket, o.name);
      if (d.error) { o.md5 = null; errors.push({ bucket: o.bucket, name: o.name, reason: d.error }); }
      else {
        o.md5 = d.md5; downloaded++;
        if (d.bytes !== o.size) errors.push({ bucket: o.bucket, name: o.name, reason: 'SIZE_MISMATCH listed=' + o.size + ' downloaded=' + d.bytes });
      }
    }
    if (++done % 500 === 0) console.log(ep.label + ': md5 ' + done + '/' + objects.length);
  });
  return {
    kind: INVENTORY_KIND,
    version: INVENTORY_VERSION,
    label,
    host: ep.host,
    generated: new Date().toISOString(),
    complete: errors.length === 0,
    bucketFilter: BUCKET_FILTER,
    buckets,
    objects,
    errors,
    stats: { objects: objects.length, bytes: objects.reduce((a, o) => a + o.size, 0), md5Downloaded: downloaded, md5Cached: cached },
  };
}

function writeJson(prefix, data) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const p = path.join(BACKUP_DIR, prefix + '-' + stamp() + '.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 1), { mode: 0o600 });
  return p;
}

const safeLabel = (s) => String(s || 'inventory').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 40);

function saveInventory(inv) {
  return writeJson('storage-inventory-' + safeLabel(inv.label), inv);
}

async function cmdInventory() {
  const ep = endpoint('endpoint', env.SUPABASE_URL, env.SERVICE_KEY, 'SUPABASE_URL', 'SERVICE_KEY');
  const inv = await takeInventory(ep, env.LABEL || 'inventory', cacheFrom(env.PREVIOUS));
  const p = saveInventory(inv);
  console.log('inventory ' + ep.host + ': buckets=' + inv.buckets.length + ' objects=' + inv.stats.objects +
    ' bytes=' + inv.stats.bytes + ' md5 downloaded=' + inv.stats.md5Downloaded + ' cached=' + inv.stats.md5Cached);
  console.log('saved ' + p);
  if (!inv.complete) throw new Fatal(inv.errors.length + ' object(s) could not be hashed — inventory marked incomplete (names inside the file).', 3);
}

// ---------- plan ----------

function diffFields(a, b) {
  const d = [];
  if (a.md5 !== b.md5) d.push('md5');
  if (baseType(a.mimetype) !== baseType(b.mimetype)) d.push('mimetype');
  if (normCc(a.cacheControl) !== normCc(b.cacheControl)) d.push('cacheControl');
  return d;
}
const same = (a, b) => diffFields(a, b).length === 0;

function index(inv) {
  const m = new Map();
  for (const o of inv.objects) m.set(objKey(o.bucket, o.name), o);
  return m;
}

function computePlan(src, tgt, base, buckets, force) {
  const S = index(src), T = index(tgt), B = index(base);
  const baselineBuckets = new Set(base.buckets.map((b) => b.id));
  const counts = {};
  const actions = [], conflicts = [], leftAlone = [];
  for (const bucket of buckets) {
    const c = (counts[bucket] = { copy: 0, delete: 0, conflict: 0, leftAlone: 0, unchanged: 0 });
    const names = new Set();
    for (const o of src.objects) if (o.bucket === bucket) names.add(o.name);
    for (const o of tgt.objects) if (o.bucket === bucket) names.add(o.name);
    for (const name of [...names].sort()) {
      const k = objKey(bucket, name);
      const s = S.get(k), t = T.get(k), b = baselineBuckets.has(bucket) ? B.get(k) : undefined;
      if (s && t && same(s, t)) { c.unchanged++; continue; }
      if (s && !t && b) {
        // Gone from the frozen target after cutover: a leaked delete, not ours to undo silently.
        c.conflict++;
        const reason = 'deleted on target after cutover (was in baseline)';
        conflicts.push({ bucket, name, reason, forcedAction: 'copy' });
        if (force) actions.push({ action: 'copy', bucket, name, size: s.size, reason: 'FORCED conflict: ' + reason });
      } else if (s && !t) {
        c.copy++;
        actions.push({ action: 'copy', bucket, name, size: s.size, reason: 'new on source' });
      } else if (s && t) {
        if (b && same(t, b)) {
          c.copy++;
          actions.push({ action: 'copy', bucket, name, size: s.size, reason: 'differs: ' + diffFields(s, t).join(',') });
        } else {
          c.conflict++;
          const reason = b ? 'target changed after cutover (' + diffFields(t, b).join(',') + ') and differs from source'
            : 'target object not in baseline (written after cutover) and differs from source';
          conflicts.push({ bucket, name, reason, forcedAction: 'copy' });
          if (force) actions.push({ action: 'copy', bucket, name, size: s.size, reason: 'FORCED conflict: ' + reason });
        }
      } else if (!b) {
        c.leftAlone++;
        leftAlone.push({ bucket, name, reason: 'target-only, not in baseline — left alone' });
      } else if (same(t, b)) {
        c.delete++;
        actions.push({ action: 'delete', bucket, name, size: t.size, reason: 'deleted on source after cutover' });
      } else {
        c.conflict++;
        const reason = 'deleted on source but target changed after cutover (' + diffFields(t, b).join(',') + ')';
        conflicts.push({ bucket, name, reason, forcedAction: 'delete' });
        if (force) actions.push({ action: 'delete', bucket, name, size: t.size, reason: 'FORCED conflict: ' + reason });
      }
    }
  }
  actions.sort((x, y) => (x.action === y.action ? 0 : x.action === 'copy' ? -1 : 1));
  return { counts, actions, conflicts, leftAlone };
}

function printCounts(title, counts) {
  console.log(title);
  const tot = { copy: 0, delete: 0, conflict: 0, leftAlone: 0, unchanged: 0 };
  for (const [bucket, c] of Object.entries(counts)) {
    for (const k of Object.keys(tot)) tot[k] += c[k];
    console.log('  ' + bucket.padEnd(28) + ' copy=' + c.copy + ' delete=' + c.delete + ' conflict=' + c.conflict +
      ' left-alone=' + c.leftAlone + ' unchanged=' + c.unchanged);
  }
  console.log('  ' + 'TOTAL'.padEnd(28) + ' copy=' + tot.copy + ' delete=' + tot.delete + ' conflict=' + tot.conflict +
    ' left-alone=' + tot.leftAlone + ' unchanged=' + tot.unchanged);
  return tot;
}

// ---------- guards ----------

function readTtyLine(prompt) {
  let fd;
  try { fd = fs.openSync('/dev/tty', 'r+'); } catch { throw new Fatal('no /dev/tty to confirm a hosted write; run interactively.'); }
  try {
    fs.writeSync(fd, prompt);
    const buf = Buffer.alloc(1);
    let line = '';
    while (fs.readSync(fd, buf, 0, 1, null) === 1 && buf[0] !== 0x0a) line += String.fromCharCode(buf[0]);
    return line.replace(/\r$/, '');
  } finally { fs.closeSync(fd); }
}

// Order matters: the hosted check runs first (before any other confirmation, file read or
// network call); the typed phrase comes last so nothing refuses after the operator typed it.
function guardHosted(tgt) {
  const hosted = HOSTED_HOST.test(tgt.hostname);
  if (hosted && env.TARGET_IS_HOSTED !== '1') throw new Fatal('target looks like hosted Supabase (' + tgt.hostname + '); writing it needs TARGET_IS_HOSTED=1 + CONFIRM_TARGET_HOST + the typed phrase.');
  if (!hosted && env.TARGET_IS_HOSTED === '1') throw new Fatal('TARGET_IS_HOSTED=1 but the target does not look hosted; refusing (check the URL).');
  return hosted;
}

function guardConfirm(tgt, hosted) {
  const confirm = (env.CONFIRM_TARGET_HOST || '').toLowerCase();
  if (confirm !== tgt.hostname) throw new Fatal('set CONFIRM_TARGET_HOST=' + tgt.hostname + ' to confirm the write target.');
  if (!hosted) return;
  let typed;
  if (env.CONFIRM_PHRASE !== undefined) {
    if (env.STORAGE_SYNC_TEST_MODE !== '1') throw new Fatal('CONFIRM_PHRASE is accepted only for drills (STORAGE_SYNC_TEST_MODE=1); type the phrase interactively.');
    console.warn('WARNING: hosted confirmation taken from CONFIRM_PHRASE (test mode).');
    typed = env.CONFIRM_PHRASE;
  } else {
    typed = readTtyLine('Writing storage on HOSTED ' + tgt.hostname + '. Type "' + HOSTED_PHRASE + '" to continue: ');
  }
  if (typed.trim() !== HOSTED_PHRASE) throw new Fatal('confirmation phrase mismatch; nothing written.');
}

// ---------- apply ----------

async function applyCopy(src, tgt, a, s) {
  const r = await request(src, 'GET', '/storage/v1/object/authenticated/' + encodeURIComponent(a.bucket) + '/' + enc(a.name));
  if (!r.ok) { await errText(r); return 'SOURCE_GET' + r.status; }
  const buf = Buffer.from(await r.arrayBuffer());
  const sum = crypto.createHash('md5').update(buf).digest('hex');
  if (sum !== s.md5) return 'SOURCE_CHANGED_SINCE_INVENTORY';
  const ct = s.mimetype || r.headers.get('content-type') || 'application/octet-stream';
  const cc = s.cacheControl;
  const up = await request(tgt, 'POST', '/storage/v1/object/' + encodeURIComponent(a.bucket) + '/' + enc(a.name), {
    headers: { 'Content-Type': ct, 'x-upsert': 'true', ...(cc ? { 'cache-control': cc } : {}) },
    body: buf,
  });
  if (!up.ok) { await errText(up); return 'UPLOAD' + up.status; }
  await up.arrayBuffer().catch(() => {});
  const v = await request(tgt, 'GET', '/storage/v1/object/authenticated/' + encodeURIComponent(a.bucket) + '/' + enc(a.name));
  if (!v.ok) { await errText(v); return 'VERIFY_GET' + v.status; }
  const vbuf = Buffer.from(await v.arrayBuffer());
  if (crypto.createHash('md5').update(vbuf).digest('hex') !== sum) return 'VERIFY_MD5';
  if (baseType(v.headers.get('content-type')) !== baseType(ct)) return 'VERIFY_CONTENT_TYPE';
  if (cc && normCc(v.headers.get('cache-control')) !== normCc(cc)) return 'VERIFY_CACHE_CONTROL';
  return null;
}

async function applyDeletes(tgt, bucket, items, results) {
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const r = await request(tgt, 'DELETE', '/storage/v1/object/' + encodeURIComponent(bucket), {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: chunk.map((a) => a.name) }),
    });
    const status = r.ok ? null : 'DELETE' + r.status;
    if (r.ok) await r.arrayBuffer().catch(() => {}); else await errText(r);
    for (const a of chunk) results.push({ ...a, ok: !status, error: status });
    if (SLOW_MS) await sleep(SLOW_MS);
  }
}

async function cmdSync() {
  const APPLY = env.APPLY === '1';
  const FORCE = env.FORCE_CONFLICTS === '1';
  // All guards run before any network call; the hosted check is the very first one.
  const tgt = endpoint('target', env.TARGET_SUPABASE_URL, env.TARGET_SERVICE_KEY, 'TARGET_SUPABASE_URL', 'TARGET_SERVICE_KEY');
  const hosted = APPLY ? guardHosted(tgt) : false;
  const src = endpoint('source', env.SOURCE_SUPABASE_URL, env.SOURCE_SERVICE_KEY, 'SOURCE_SUPABASE_URL', 'SOURCE_SERVICE_KEY');
  if (src.host === tgt.host) throw new Fatal('source and target are the same host (' + tgt.host + '); refusing.');
  if (!env.BASELINE) throw new Fatal('set BASELINE=<storage inventory of the target taken at cutover>.');
  const base = loadInventory(env.BASELINE, 'BASELINE');
  if (!base.complete) throw new Fatal('BASELINE inventory is marked incomplete; refusing to derive deletes from it.', 3);
  if (base.host !== tgt.host && env.BASELINE_HOST_MISMATCH_OK !== '1') {
    throw new Fatal('BASELINE was taken on ' + base.host + ' but the target is ' + tgt.host + ' (set BASELINE_HOST_MISMATCH_OK=1 only if the target moved address).');
  }
  if (APPLY) guardConfirm(tgt, hosted);

  const srcCache = cacheFrom(env.SOURCE_PREVIOUS);
  const tgtCache = cacheFrom(env.TARGET_PREVIOUS);
  const srcInv = await takeInventory(src, 'sync-source', srcCache);
  const tgtInv = await takeInventory(tgt, 'sync-target', tgtCache);
  const srcInvPath = saveInventory(srcInv), tgtInvPath = saveInventory(tgtInv);
  if (!srcInv.complete || !tgtInv.complete) throw new Fatal('source/target inventory incomplete (see ' + srcInvPath + ' / ' + tgtInvPath + ').', 3);

  const tgtBuckets = new Map(tgtInv.buckets.map((b) => [b.id, b]));
  const buckets = srcInv.buckets.map((b) => b.id);
  const missing = buckets.filter((b) => !tgtBuckets.has(b));
  if (missing.length) {
    throw new Fatal('bucket(s) missing on target: ' + missing.join(', ') + '. Bucket creation is out of scope — create them (matching the source public flag) and rerun.', 2);
  }
  const warnings = [];
  for (const b of srcInv.buckets) {
    if (tgtBuckets.get(b.id).public !== b.public) warnings.push('bucket ' + b.id + ': public flag differs (source=' + b.public + ' target=' + tgtBuckets.get(b.id).public + ') — not changed by this tool');
    if (!base.buckets.some((x) => x.id === b.id)) warnings.push('bucket ' + b.id + ': not in BASELINE — nothing there will be deleted');
  }
  for (const b of tgtInv.buckets) if (!buckets.includes(b.id)) warnings.push('bucket ' + b.id + ': target-only, not in scope');

  const plan = computePlan(srcInv, tgtInv, base, buckets, FORCE);
  const header = { source: src.host, target: tgt.host, baseline: path.resolve(env.BASELINE), baselineGenerated: base.generated,
    sourceInventory: srcInvPath, targetInventory: tgtInvPath, forceConflicts: FORCE, limit: LIMIT || null, warnings };
  printCounts('plan ' + src.host + ' -> ' + tgt.host + (FORCE ? ' (FORCE_CONFLICTS)' : ''), plan.counts);
  for (const w of warnings) console.log('WARN ' + w);

  if (!APPLY) {
    const p = writeJson('storage-sync-plan-dryrun', { generated: new Date().toISOString(), dryRun: true, ...header, ...plan });
    console.log('saved ' + p + ' (object names inside) — dry run, rerun with APPLY=1 to write');
    return 0;
  }

  const todo = LIMIT > 0 ? plan.actions.slice(0, LIMIT) : plan.actions;
  if (LIMIT > 0) console.log('LIMIT smoke: executing ' + todo.length + ' of ' + plan.actions.length + ' action(s).');
  const S = index(srcInv);
  const results = [];
  await pool(todo.filter((a) => a.action === 'copy'), async (a) => {
    let err;
    try { err = await applyCopy(src, tgt, a, S.get(objKey(a.bucket, a.name))); } catch (e) { err = 'ERR ' + redact(e.message); }
    results.push({ ...a, ok: !err, error: err || null });
  });
  const delByBucket = new Map();
  for (const a of todo) if (a.action === 'delete') delByBucket.set(a.bucket, [...(delByBucket.get(a.bucket) || []), a]);
  for (const [bucket, items] of delByBucket) await applyDeletes(tgt, bucket, items, results);
  const failed = results.filter((r) => !r.ok);
  console.log('applied: copied=' + results.filter((r) => r.ok && r.action === 'copy').length +
    ' deleted=' + results.filter((r) => r.ok && r.action === 'delete').length + ' failed=' + failed.length);

  // Proof: fresh inventories (md5 cache only for objects whose size+lastModified did not move).
  const cacheOf = (inv) => new Map(inv.objects.map((o) => [[o.bucket, o.name, o.size, o.lastModified].join('\u0000'), o.md5]));
  const srcAfter = await takeInventory(src, 'sync-source-after', cacheOf(srcInv));
  const tgtAfter = await takeInventory(tgt, 'sync-target-after', new Map());
  const tgtAfterPath = saveInventory(tgtAfter);
  const after = computePlan(srcAfter, tgtAfter, base, buckets, FORCE);
  const tot = printCounts('post-apply diff', after.counts);
  const attempted = new Set(todo.map((a) => a.action + objKey(a.bucket, a.name)));
  const remainingAttempted = after.actions.filter((a) => attempted.has(a.action + objKey(a.bucket, a.name)));
  let code = 0;
  if (!srcAfter.complete || !tgtAfter.complete || failed.length || remainingAttempted.length) code = 3;
  else if (after.actions.length) code = LIMIT > 0 ? 4 : 3;
  const p = writeJson('storage-sync-apply', { generated: new Date().toISOString(), dryRun: false, ...header, ...plan,
    results, targetInventoryAfter: tgtAfterPath, remaining: after.actions, conflictsAfter: after.conflicts, leftAloneAfter: after.leftAlone, exitCode: code });
  console.log('saved ' + p);
  if (code === 0) console.log('CONVERGED: remaining diff empty (conflict=' + tot.conflict + ' left-alone=' + tot.leftAlone + ' reported, not touched).');
  else if (code === 4) console.log('LIMIT smoke verified; ' + after.actions.length + ' action(s) remain — rerun without LIMIT.');
  else console.error('NOT CONVERGED: failed=' + failed.length + ' remaining=' + after.actions.length + ' — see ' + p);
  return code;
}

const USAGE = 'usage: node scripts/ops/storage-sync.mjs inventory|sync   (see header comment for env inputs)';

(async () => {
  const cmd = process.argv[2];
  let code = 0;
  try {
    if (cmd === 'inventory') await cmdInventory();
    else if (cmd === 'sync') code = await cmdSync();
    else { console.error(USAGE); code = 1; }
  } catch (e) {
    console.error('ERROR: ' + redact(e instanceof Fatal ? e.message : (e && e.stack) || e));
    code = e instanceof Fatal ? e.code : 1;
  }
  process.exit(code);
})();
