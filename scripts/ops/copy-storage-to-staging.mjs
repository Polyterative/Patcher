// API-only storage copy: hosted -> self-hosted (staging or the new home).
//
// Dry run by default: HEAD requests only (no object bodies downloaded, no writes).
// Smoke first:  LIMIT=10 APPLY=1 TARGET_SUPABASE_URL=... TARGET_SERVICE_KEY=... \
//                 CONFIRM_TARGET_HOST=<target hostname> node scripts/ops/copy-storage-to-staging.mjs
// Full copy:    same without LIMIT. Resume: add MANIFEST=backups/storage-copy_<stamp>.json
//
// Inputs (shell only, never committed; keys are never printed):
//   TARGET_SUPABASE_URL, TARGET_SERVICE_KEY  self-host gateway + service key (APPLY only)
//   CONFIRM_TARGET_HOST                      must equal the target hostname (APPLY only)
//   SOURCE_SUPABASE_URL                      default: hosted project URL below
//   SOURCE_SERVICE_KEY                       optional, read-only use: enables private
//                                            buckets (e.g. marketplace-listings) via the
//                                            authenticated download route
//   BUCKETS=a,b                              optional bucket filter
//   LIMIT, CONCURRENCY, SLOW                 smoke size / parallelism / politeness delay
//
// Safety: refuses a target that looks like hosted Supabase or equals the source
// (upserting onto prod would rewrite object metadata). Target buckets must
// already exist (runbook §7 step 2); missing buckets are skipped, auth errors
// abort. Content-Type and Cache-Control are carried from the source and checked
// after upload, together with an md5 of the re-downloaded bytes.
//
// Known limits (documented in the master checklist): storage.objects owner /
// owner_id and user_metadata are not carried (service-key uploads leave owner
// empty — fix with a SQL pass after the auth import if owner-based storage
// policies need it); deletes are not propagated (copy-only).
//
// Exit code: 0 only when every in-scope object copied+verified (or, in dry
// run, every object answered 200). Manifests land in gitignored backups/.
import crypto from 'crypto';
import fs from 'fs';

const DEFAULT_SOURCE = 'https://sozmatmywjpstwidzlss.supabase.co';
const SOURCE_BASE = (process.env.SOURCE_SUPABASE_URL || DEFAULT_SOURCE).replace(/\/$/, '');
const SOURCE_KEY = process.env.SOURCE_SERVICE_KEY || '';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '6', 10);
const APPLY = process.env.APPLY === '1';
const MANIFEST_FILE = process.env.MANIFEST || '';
const TARGET_URL = (process.env.TARGET_SUPABASE_URL || '').replace(/\/$/, '');
const TARGET_KEY = process.env.TARGET_SERVICE_KEY || '';
const LIMIT = parseInt(process.env.LIMIT || '0', 10);
const BUCKET_FILTER = (process.env.BUCKETS || '').split(',').map((s) => s.trim()).filter(Boolean);

const HOSTED_HOST = /(^|\.)supabase\.(co|com|in)$/i;

function fail(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

if (APPLY) {
  if (!TARGET_URL || !TARGET_KEY) fail('APPLY=1 needs TARGET_SUPABASE_URL and TARGET_SERVICE_KEY in the shell (never commit them).');
  let targetHost;
  try { targetHost = new URL(TARGET_URL).hostname.toLowerCase(); } catch { fail('TARGET_SUPABASE_URL is not a valid URL.'); }
  const sourceHost = new URL(SOURCE_BASE).hostname.toLowerCase();
  if (HOSTED_HOST.test(targetHost)) fail('target looks like hosted Supabase (' + targetHost + '); refusing to write.');
  if (targetHost === sourceHost) fail('target host equals source host; refusing to write.');
  if ((process.env.CONFIRM_TARGET_HOST || '').toLowerCase() !== targetHost) {
    fail('set CONFIRM_TARGET_HOST=' + targetHost + ' to confirm the write target.');
  }
}

const enc = (n) => n.split('/').map(encodeURIComponent).join('/');
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');
const sourceHeaders = SOURCE_KEY ? { apikey: SOURCE_KEY, Authorization: 'Bearer ' + SOURCE_KEY } : {};
const targetHeaders = { apikey: TARGET_KEY, Authorization: 'Bearer ' + TARGET_KEY };
const sourceObjectUrl = (bucket, n) =>
  SOURCE_BASE + '/storage/v1/object/' + (SOURCE_KEY ? 'authenticated/' : 'public/') + bucket + '/' + enc(n);
// Strip parameters (e.g. "; charset=") for comparison only.
const baseType = (ct) => (ct || '').split(';')[0].trim().toLowerCase();

(async () => {
  const files = fs.readdirSync('backups/').filter((f) => f.startsWith('storage-inventory_')).sort();
  if (!files.length) fail('no backups/storage-inventory_*.json found.');
  const invData = JSON.parse(fs.readFileSync('backups/' + files[files.length - 1], 'utf8'));

  let done = {};
  if (MANIFEST_FILE) done = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')).buckets || {};
  const out = { generated: new Date().toISOString(), dryRun: !APPLY, sourceAuth: Boolean(SOURCE_KEY), buckets: {} };
  let problems = 0;

  for (const [bucket, names] of Object.entries(invData)) {
    if (BUCKET_FILTER.length && !BUCKET_FILTER.includes(bucket)) continue;
    const verified = new Set((done[bucket] && done[bucket].verifiedNames) || []);
    const rec = { objects: names.length, alreadyVerified: verified.size, copied: 0, failed: {}, skippedNeedsFate: [], missingBucket: false };

    if (APPLY) {
      const b = await fetch(TARGET_URL + '/storage/v1/bucket/' + encodeURIComponent(bucket), { headers: targetHeaders });
      if (b.status === 404 || b.status === 400) {
        rec.missingBucket = true;
        out.buckets[bucket] = rec;
        problems++;
        console.log(bucket + ': bucket missing on target — skipped (create it per runbook §7 step 2).');
        continue;
      }
      if (!b.ok) fail(bucket + ': bucket check returned ' + b.status + ' (bad TARGET_SERVICE_KEY?) — aborting.');
    }

    const pending = names.filter((n) => !verified.has(n));
    const scoped = LIMIT > 0 ? pending.slice(0, LIMIT) : pending;
    if (LIMIT > 0) console.log(bucket + ': LIMIT smoke — first ' + scoped.length + ' of ' + pending.length + ' pending.');
    const verifiedNames = [...verified];
    const queue = [...scoped];
    const noteFail = (reason, n) => { (rec.failed[reason] = rec.failed[reason] || []).push(n); };

    async function worker() {
      while (queue.length) {
        const n = queue.pop();
        try {
          if (!APPLY) {
            const h = await fetch(sourceObjectUrl(bucket, n), { method: 'HEAD', headers: sourceHeaders });
            if (h.ok) rec.copied++;
            else rec.skippedNeedsFate.push(n + ' (source ' + h.status + ')');
            continue;
          }
          const r = await fetch(sourceObjectUrl(bucket, n), { headers: sourceHeaders });
          if (!r.ok) { rec.skippedNeedsFate.push(n + ' (source ' + r.status + ')'); continue; }
          const buf = Buffer.from(await r.arrayBuffer());
          if (!buf.length) { rec.skippedNeedsFate.push(n + ' (source empty)'); continue; }
          const ct = r.headers.get('content-type') || 'application/octet-stream';
          const cc = r.headers.get('cache-control');
          const up = await fetch(TARGET_URL + '/storage/v1/object/' + bucket + '/' + enc(n), {
            method: 'POST',
            headers: { ...targetHeaders, 'Content-Type': ct, 'x-upsert': 'true', ...(cc ? { 'cache-control': cc } : {}) },
            body: buf,
          });
          if (!up.ok) { noteFail('UP' + up.status, n); continue; }
          const v = await fetch(TARGET_URL + '/storage/v1/object/authenticated/' + bucket + '/' + enc(n), { headers: targetHeaders });
          const vbuf = Buffer.from(await v.arrayBuffer());
          if (!v.ok || vbuf.length !== buf.length || md5(vbuf) !== md5(buf)) { noteFail('VERIFY_BYTES', n); continue; }
          if (baseType(v.headers.get('content-type')) !== baseType(ct)) { noteFail('VERIFY_CONTENT_TYPE', n); continue; }
          rec.copied++;
          verifiedNames.push(n);
        } catch (e) {
          noteFail('ERR', n);
        } finally {
          const processed = rec.copied + Object.values(rec.failed).reduce((a, l) => a + l.length, 0) + rec.skippedNeedsFate.length;
          if (processed % 500 === 0) console.log(bucket + ' progress ' + processed + '/' + scoped.length);
          if (process.env.SLOW) await new Promise((res) => setTimeout(res, 150));
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    rec.verifiedNames = verifiedNames;
    out.buckets[bucket] = rec;
    const failedCount = Object.values(rec.failed).reduce((a, l) => a + l.length, 0);
    problems += failedCount + rec.skippedNeedsFate.length;
    console.log(bucket + ': ' + (APPLY ? 'copied+verified=' + rec.copied : 'reachable=' + rec.copied) +
      ' failed=' + failedCount + ' ' + JSON.stringify(Object.fromEntries(Object.entries(rec.failed).map(([k, l]) => [k, l.length]))) +
      ' needs-fate=' + rec.skippedNeedsFate.length);
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '_');
  const p = 'backups/storage-copy_' + (APPLY ? 'apply_' : 'dryrun_') + stamp + '.json';
  fs.writeFileSync(p, JSON.stringify(out, null, 1), { mode: 0o600 });
  console.log('saved ' + p + ' (failed + needs-fate object names listed inside)' + (APPLY ? '' : ' — dry run, rerun with APPLY=1 to write'));
  if (problems) {
    console.error(problems + ' object(s) failed, skipped or need a fate decision — see manifest.');
    process.exit(1);
  }
})();
