// Self-host load probe — staging readiness only (DRAFT).
// Dry-run by default: prints the plan, performs ZERO requests.
// APPLY performs bounded anon catalogue GETs only (no writes, no service key,
// no functions.invoke, no storage uploads). Refuses hosted-looking targets
// without --allow-hosted so production can never be load-tested by accident.
//
// Usage:
//   node scripts/ops/load-test-selfhost.mjs --help
//   node scripts/ops/load-test-selfhost.mjs --dry-run \
//     --base-url "http://SERVER-LAN-IP:8000" --anon-key "..."
//   Owner window only:
//   node scripts/ops/load-test-selfhost.mjs --apply \
//     --base-url "http://SERVER-LAN-IP:8000" --anon-key "..." \
//     --rps 5 --seconds 20
//
// Thresholds are owner-set (peak RPS x payload vs home upload). The script
// reports p50/p95 latency, bytes, and failures; the owner judges pass/fail.
// Keys are never printed and never committed.

const raw = process.argv.slice(2);
const args = {};
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  const m = a.match(/^--([^=]+)(=(.*))?$/);
  if (!m) continue;
  const key = m[1];
  if (m[3] !== undefined) {
    args[key] = m[3];
  } else if (i + 1 < raw.length && !raw[i + 1].startsWith('--')) {
    args[key] = raw[++i];
  } else {
    args[key] = true;
  }
}

if (args.help || args.h) {
  console.log(`Usage: node scripts/ops/load-test-selfhost.mjs [options]

Options:
  --base-url <url>   self-host gateway (required for apply; e.g. http://SERVER-LAN-IP:8000)
  --anon-key <key>   low-priv anon key (required for apply; never printed)
  --rps <n>          target requests/sec (default 5, max 20)
  --seconds <n>      duration seconds (default 20, max 60)
  --concurrency <n>  in-flight cap (default 4, max 8)
  --apply            perform the bounded probe (default is dry-run plan only)
  --dry-run          print the plan (default, zero requests)
  --allow-hosted     permit a hosted-looking target (never for production load)
  --help             show this help

Safety: dry-run/help perform zero requests. Apply is GET-only anon catalogue
reads (/rest/v1/modules, /rest/v1/manufacturers). Refuses *.supabase.co without
--allow-hosted.`);
  process.exit(0);
}

const APPLY = args.apply === true || args.apply === '1';
const BASE = String(args['base-url'] || '');
const KEY = String(args['anon-key'] || '');
const RPS = Math.min(parseInt(args.rps || '5', 10), 20);
const SECONDS = Math.min(parseInt(args.seconds || '20', 10), 60);
const CONC = Math.min(parseInt(args.concurrency || '4', 10), 8);

if (!APPLY) {
  console.log('=== load-test-selfhost DRY-RUN — zero requests ===');
  console.log(`plan: ${RPS} rps x ${SECONDS}s, concurrency cap ${CONC}`);
  console.log('targets (GET-only, anon): /rest/v1/modules?select=id&limit=20, /rest/v1/manufacturers?select=id&limit=20');
  console.log('thresholds: owner-set (peak RPS x payload vs home upload); script reports p50/p95 + bytes + failures.');
  console.log('guard: refuses hosted-looking base-url without --allow-hosted.');
  console.log('Dry run complete. No requests were made.');
  process.exit(0);
}

if (!BASE || !KEY) {
  console.error('ERROR: --apply needs --base-url and --anon-key (never commit them).');
  process.exit(1);
}

if (/supabase\.co|pooler\.supabase\.com/i.test(BASE) && !(args['allow-hosted'] === true || args['allow-hosted'] === '1')) {
  console.error('ERROR: target looks hosted; refusing without --allow-hosted. Load-testing production is never the default.');
  process.exit(1);
}

const paths = ['/rest/v1/modules?select=id&limit=20', '/rest/v1/manufacturers?select=id&limit=20'];
const lat = [];
let bytes = 0;
let ok = 0;
let fail = 0;
const deadline = Date.now() + SECONDS * 1000;
const interval = 1000 / Math.max(RPS, 1);

async function one(path) {
  const t0 = Date.now();
  try {
    const r = await fetch(BASE.replace(/\/$/, '') + path, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
    });
    const buf = Buffer.from(await r.arrayBuffer());
    if (!r.ok) { fail++; return; }
    ok++;
    bytes += buf.length;
    lat.push(Date.now() - t0);
  } catch {
    fail++;
  }
}

(async () => {
  const workers = [];
  let i = 0;
  while (Date.now() < deadline) {
    const batch = [];
    for (let c = 0; c < CONC && Date.now() < deadline; c++) {
      batch.push(one(paths[i++ % paths.length]));
    }
    await Promise.all(batch);
    await new Promise((r) => setTimeout(r, interval));
    workers.push(0);
    if (workers.length > RPS * SECONDS + 8) break;
  }
  lat.sort((a, b) => a - b);
  const pct = (p) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))] : 0);
  console.log(`done: ok=${ok} fail=${fail} bytes=${bytes} p50=${pct(50)}ms p95=${pct(95)}ms`);
  console.log('owner verdict: compare against peak RPS x payload vs home upload thresholds (runbook §6/§9).');
})();
