// Self-host load probe — staging readiness only.
// Dry-run by default: prints the plan, performs ZERO requests.
// APPLY performs bounded anon GETs only (no writes, no service key, no functions,
// no uploads): app-shaped catalogue reads + public panel-image downloads.
// Refuses hosted-looking targets (incl. the production image Worker) without
// --allow-hosted so production can never be load-tested by accident.
//
// Scheduling is open-loop: request k is due at start + k / rps whatever the
// latency, so the offered rate is exactly --rps. When --concurrency requests are
// already in flight a due request is SKIPPED and counted (a skip means the target
// cannot keep up at that rate — it is reported, never silently absorbed).
//
// Usage:
//   node scripts/ops/load-test-selfhost.mjs --help
//   node scripts/ops/load-test-selfhost.mjs --base-url http://SERVER-LAN-IP:8000
//   ANON_KEY=... node scripts/ops/load-test-selfhost.mjs --apply \
//     --base-url https://supabase.patcher.xyz --rps 10 --seconds 60 \
//     --max-p95-ms 800 --max-fail-pct 1
//
// Thresholds are owner-set (peak RPS x payload vs home upload). Without them the
// script only reports; with them it exits 2 on a breach. Keys are never printed.

const raw = process.argv.slice(2);
const args = {};
for (let i = 0; i < raw.length; i++) {
  const m = raw[i].match(/^--([^=]+)(=(.*))?$/);
  if (!m) continue;
  if (m[3] !== undefined) args[m[1]] = m[3];
  else if (i + 1 < raw.length && !raw[i + 1].startsWith('--')) args[m[1]] = raw[++i];
  else args[m[1]] = true;
}

if (args.help || args.h) {
  console.log(`Usage: node scripts/ops/load-test-selfhost.mjs [options]

Options:
  --base-url <url>      self-host gateway (http://SERVER-LAN-IP:8000 or https://supabase.patcher.xyz)
  --anon-key <key>      anon key; prefer ANON_KEY env (never printed)
  --rps <n>             offered requests/sec, open loop (default 5, max 100)
  --seconds <n>         duration (default 20, max 600)
  --concurrency <n>     in-flight cap; due requests over the cap are skipped (default 16, max 64)
  --image-share <0..1>  fraction of requests that download a panel image (default 0.3)
  --image-base <url>    image origin (default <base-url>/storage/v1/object/public)
  --image-names <a,b>   module-panels object names (default: discovered, see below)
  --max-p95-ms <n>      threshold: fail if any kind's p95 exceeds it
  --max-fail-pct <n>    threshold: fail if overall failures + skips exceed n %
  --apply               perform the probe (default: dry-run plan, zero requests)
  --allow-hosted        permit a hosted-looking target (never for production load)

Image discovery (apply only, before the timed run): reads up to 200 panel
filenames from /rest/v1/module_panels and HEADs them until 20 exist on the
target (staging holds only part of the bucket). Exit: 0 ok, 1 usage/guard/setup,
2 threshold breached.`);
  process.exit(0);
}

const num = (name, dflt, min, max) => {
  if (args[name] === undefined) return dflt;
  const n = Number(args[name]);
  if (!Number.isFinite(n) || n < min || n > max) {
    console.error(`ERROR: --${name} must be a number in [${min}, ${max}]`);
    process.exit(1);
  }
  return n;
};

const APPLY = args.apply === true || args.apply === '1';
const ALLOW_HOSTED = args['allow-hosted'] === true || args['allow-hosted'] === '1';
const BASE = String(args['base-url'] || '').replace(/\/$/, '');
const KEY = String(args['anon-key'] || process.env.ANON_KEY || '');
const RPS = num('rps', 5, 0.1, 100);
const SECONDS = num('seconds', 20, 1, 600);
const CONC = Math.floor(num('concurrency', 16, 1, 64));
const IMAGE_SHARE = num('image-share', 0.3, 0, 1);
const IMAGE_BASE = String(args['image-base'] || (BASE ? BASE + '/storage/v1/object/public' : '')).replace(/\/$/, '');
const MAX_P95 = args['max-p95-ms'] === undefined ? null : num('max-p95-ms', 0, 1, 600000);
const MAX_FAIL_PCT = args['max-fail-pct'] === undefined ? null : num('max-fail-pct', 0, 0, 100);
const TIMEOUT_MS = 30000;

// Mirrors the app's catalogue queries (DatabaseStrings module + panel joins).
const REST_PATHS = {
  modules:
    '/rest/v1/modules?select=id,name,hp,manufacturer:manufacturerId(id,name),' +
    'panels:module_panels!module_panels_moduleid_fkey(id,color,filename)&order=id&limit=50',
  manufacturers: '/rest/v1/manufacturers?select=id,name&order=name&limit=50',
};

const total = Math.round(RPS * SECONDS);
console.log(`=== load-test-selfhost ${APPLY ? 'APPLY' : 'DRY-RUN — zero requests'} ===`);
console.log(`plan: ${RPS} rps offered (open loop) x ${SECONDS}s = ${total} requests, in-flight cap ${CONC}`);
console.log(`mix: ${Math.round((1 - IMAGE_SHARE) * 100)}% REST (${Object.keys(REST_PATHS).join(', ')}), ` +
  `${Math.round(IMAGE_SHARE * 100)}% panel images from ${IMAGE_BASE || '<base-url>/storage/v1/object/public'}`);
console.log(`thresholds: p95 <= ${MAX_P95 ?? 'report only'} ms, failures+skips <= ${MAX_FAIL_PCT ?? 'report only'} %`);
if (!APPLY) {
  console.log('Dry run complete. No requests were made. Add --apply (owner window).');
  process.exit(0);
}

if (!BASE || !KEY) {
  console.error('ERROR: --apply needs --base-url and ANON_KEY (env) or --anon-key.');
  process.exit(1);
}
const HOSTED = /supabase\.(co|com|in)(\/|:|$)|(^|\/\/)images\.patcher\.xyz(\/|:|$)/i;
if ((HOSTED.test(BASE) || HOSTED.test(IMAGE_BASE)) && !ALLOW_HOSTED) {
  console.error('ERROR: target looks hosted/production; refusing without --allow-hosted.');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const redact = (s) => String(s).split(KEY).join('***');

async function request(url, method = 'GET', withKey = true) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = performance.now();
  try {
    const r = await fetch(url, { method, headers: withKey ? headers : {}, signal: ctrl.signal });
    const bytes = method === 'HEAD' ? 0 : (await r.arrayBuffer()).byteLength;
    return { status: r.status, ok: r.ok, bytes, ms: performance.now() - t0, cache: r.headers.get('cf-cache-status') };
  } catch (e) {
    return { status: e.name === 'AbortError' ? 'timeout' : 'network', ok: false, bytes: 0, ms: performance.now() - t0, err: redact(e.message) };
  } finally {
    clearTimeout(timer);
  }
}

async function discoverImages() {
  if (args['image-names']) return String(args['image-names']).split(',').map((s) => s.trim()).filter(Boolean);
  const r = await fetch(BASE + '/rest/v1/module_panels?select=filename&order=id&limit=200', { headers });
  if (!r.ok) throw new Error(`panel filename query failed: HTTP ${r.status}`);
  const names = [...new Set((await r.json()).map((row) => row.filename).filter(Boolean))];
  const found = [];
  for (let i = 0; i < names.length && found.length < 20; i += 4) {
    const res = await Promise.all(names.slice(i, i + 4).map((n) =>
      request(`${IMAGE_BASE}/module-panels/${n.split('/').map(encodeURIComponent).join('/')}`, 'HEAD', false)));
    res.forEach((x, j) => { if (x.ok) found.push(names[i + j]); });
  }
  return found;
}

const stats = {};
const stat = (kind) => (stats[kind] ??= { n: 0, fail: 0, bytes: 0, lat: [], codes: {}, cache: {} });

function record(kind, res) {
  const s = stat(kind);
  s.n++;
  s.codes[res.status] = (s.codes[res.status] || 0) + 1;
  if (res.cache) s.cache[res.cache] = (s.cache[res.cache] || 0) + 1;
  if (!res.ok) { s.fail++; return; }
  s.bytes += res.bytes;
  s.lat.push(res.ms);
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0);

(async () => {
  let images = [];
  if (IMAGE_SHARE > 0) {
    try {
      images = await discoverImages();
    } catch (e) {
      console.error('ERROR: image discovery: ' + redact(e.message));
      process.exit(1);
    }
    if (!images.length) {
      console.error('ERROR: no panel image found on the target; pass --image-names or --image-share 0.');
      process.exit(1);
    }
    console.log(`images: ${images.length} panel objects in rotation`);
  }

  const restKinds = Object.keys(REST_PATHS);
  let inFlight = 0;
  let skipped = 0;
  let maxLateMs = 0;
  const pending = [];
  const start = performance.now();

  for (let k = 0; k < total; k++) {
    const due = start + (k * 1000) / RPS;
    const wait = due - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    maxLateMs = Math.max(maxLateMs, performance.now() - due);
    if (inFlight >= CONC) { skipped++; continue; }

    // Deterministic interleave so the image share holds exactly over the run.
    const isImage = images.length && Math.floor((k + 1) * IMAGE_SHARE) > Math.floor(k * IMAGE_SHARE);
    const kind = isImage ? 'image' : restKinds[k % restKinds.length];
    const url = isImage
      ? `${IMAGE_BASE}/module-panels/${images[k % images.length].split('/').map(encodeURIComponent).join('/')}`
      : BASE + REST_PATHS[kind];
    inFlight++;
    pending.push(request(url, 'GET', !isImage).then((res) => { inFlight--; record(kind, res); }));
  }
  await Promise.all(pending);
  const elapsed = (performance.now() - start) / 1000;

  let worstP95 = 0;
  let sent = 0;
  let failed = 0;
  let bytes = 0;
  for (const [kind, s] of Object.entries(stats)) {
    s.lat.sort((a, b) => a - b);
    const p95 = pct(s.lat, 95);
    worstP95 = Math.max(worstP95, p95);
    sent += s.n;
    failed += s.fail;
    bytes += s.bytes;
    const cache = Object.keys(s.cache).length ? ' cf-cache=' + JSON.stringify(s.cache) : '';
    console.log(`${kind.padEnd(13)} n=${s.n} fail=${s.fail} p50=${pct(s.lat, 50).toFixed(0)}ms ` +
      `p95=${p95.toFixed(0)}ms p99=${pct(s.lat, 99).toFixed(0)}ms bytes=${s.bytes} codes=${JSON.stringify(s.codes)}${cache}`);
  }
  const badPct = total ? ((failed + skipped) / total) * 100 : 0;
  console.log(`total: offered=${total} sent=${sent} skipped(cap)=${skipped} fail=${failed} (${badPct.toFixed(2)}% bad) ` +
    `achieved=${(sent / elapsed).toFixed(2)} rps over ${elapsed.toFixed(1)}s, ` +
    `${((bytes * 8) / elapsed / 1e6).toFixed(2)} Mbit/s down, scheduler max late ${maxLateMs.toFixed(0)}ms`);

  const breaches = [];
  if (MAX_P95 !== null && worstP95 > MAX_P95) breaches.push(`p95 ${worstP95.toFixed(0)}ms > ${MAX_P95}ms`);
  if (MAX_FAIL_PCT !== null && badPct > MAX_FAIL_PCT) breaches.push(`bad ${badPct.toFixed(2)}% > ${MAX_FAIL_PCT}%`);
  if (breaches.length) {
    console.log('VERDICT: FAIL — ' + breaches.join('; '));
    process.exit(2);
  }
  console.log(MAX_P95 === null && MAX_FAIL_PCT === null ? 'VERDICT: report only (no thresholds set)' : 'VERDICT: PASS');
})();
