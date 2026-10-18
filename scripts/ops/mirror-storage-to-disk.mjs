// Read-only mirror of every Supabase Storage bucket to a local folder (API only).
//
//   SUPABASE_URL=https://<gateway> SERVICE_KEY=... OUT_DIR=<folder> \
//     node scripts/ops/mirror-storage-to-disk.mjs
//
// Layout: <OUT_DIR>/<bucket>/<object name>, plus <OUT_DIR>/manifest.json
// (per object: bucket, name, size, mimetype, md5). Resumable: an existing file whose
// size matches the listing is kept and not downloaded again. Never writes to the
// remote and never prints the key. Exit code 0 only when every object is on disk.
//
// Knobs: BUCKETS=a,b (filter), CONCURRENCY (default 6), LIST_PAGE_SIZE (default 100).
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SERVICE_KEY || '';
const OUT_DIR = process.env.OUT_DIR || '';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '6', 10);
const PAGE = parseInt(process.env.LIST_PAGE_SIZE || '100', 10);
const FILTER = (process.env.BUCKETS || '').split(',').map((s) => s.trim()).filter(Boolean);

if (!BASE || !KEY || !OUT_DIR) {
  console.error('Set SUPABASE_URL, SERVICE_KEY and OUT_DIR.');
  process.exit(2);
}

const headers = { Authorization: `Bearer ${KEY}`, apikey: KEY };

async function api(url, init = {}, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
      continue;
    }
    return res;
  }
  throw new Error(`gave up after ${tries} tries: ${url.replace(BASE, '')}`);
}

async function listBucket(bucket) {
  const out = [];
  const walk = async (prefix) => {
    for (let offset = 0; ; offset += PAGE) {
      const res = await api(`${BASE}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } }),
      });
      if (!res.ok) throw new Error(`list ${bucket}/${prefix}: HTTP ${res.status}`);
      const items = await res.json();
      for (const it of items) {
        const name = prefix ? `${prefix}/${it.name}` : it.name;
        if (it.id === null) await walk(name);
        else out.push({ bucket, name, size: it.metadata?.size ?? null, mimetype: it.metadata?.mimetype ?? null });
      }
      if (items.length < PAGE) break;
    }
  };
  await walk('');
  return out;
}

async function fetchOne(obj) {
  const dest = path.join(OUT_DIR, obj.bucket, ...obj.name.split('/'));
  if (fs.existsSync(dest) && (obj.size === null || fs.statSync(dest).size === obj.size)) {
    obj.md5 = crypto.createHash('md5').update(fs.readFileSync(dest)).digest('hex');
    return 'kept';
  }
  const url = `${BASE}/storage/v1/object/${encodeURIComponent(obj.bucket)}/${obj.name.split('/').map(encodeURIComponent).join('/')}`;
  const res = await api(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (obj.size !== null && buf.length !== obj.size) throw new Error(`size ${buf.length} != ${obj.size}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest + '.part', buf);
  fs.renameSync(dest + '.part', dest);
  obj.md5 = crypto.createHash('md5').update(buf).digest('hex');
  return 'downloaded';
}

const bres = await api(`${BASE}/storage/v1/bucket`);
if (!bres.ok) {
  console.error(`bucket list failed: HTTP ${bres.status}`);
  process.exit(1);
}
const buckets = (await bres.json()).map((b) => b.name).filter((n) => !FILTER.length || FILTER.includes(n));

fs.mkdirSync(OUT_DIR, { recursive: true });
const objects = [];
for (const b of buckets) {
  const list = await listBucket(b);
  console.log(`${b}: ${list.length} objects`);
  objects.push(...list);
}

const failed = [];
let done = 0;
let downloaded = 0;
const queue = [...objects];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let o; (o = queue.shift()); ) {
      try {
        if ((await fetchOne(o)) === 'downloaded') downloaded++;
      } catch (e) {
        failed.push({ bucket: o.bucket, name: o.name, error: String(e.message || e) });
      }
      if (++done % 250 === 0) console.log(`  ${done}/${objects.length}`);
    }
  }),
);

const ok = objects.filter((o) => o.md5);
fs.writeFileSync(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ generated: new Date().toISOString(), buckets, objects: ok, failed }, null, 1),
  { mode: 0o600 },
);
console.log(`listed ${objects.length}, downloaded ${downloaded}, kept ${ok.length - downloaded}, failed ${failed.length}`);
process.exit(failed.length ? 1 : 0);
