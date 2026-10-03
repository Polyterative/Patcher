// Storage byte measurement via public HEAD per object (no keys, read-only).
// Full pass:  node scripts/ops/measure-storage-bytes.mjs
// Retry pass: RETRY_FILE=backups/storage-bytes_<stamp>.json node scripts/ops/measure-storage-bytes.mjs
// Writes a gitignored results file under backups/ (never commit).
import fs from 'fs';

const CONCURRENCY = parseInt(process.env.CONCURRENCY || '12', 10);
const RETRY_FILE = process.env.RETRY_FILE || '';

(async () => {
  const lines = fs.readFileSync('.env', 'utf8').split('\n');
  const get = (k) => {
    const l = lines.find((x) => x.startsWith(k + '='));
    return l ? l.slice(k.length + 1).trim() : '';
  };
  const url = get('SUPABASE_URL').replace(/\/$/, '');
  const files = fs.readdirSync('backups/').filter((f) => f.startsWith('storage-inventory_'));
  const invData = JSON.parse(fs.readFileSync('backups/' + files[files.length - 1], 'utf8'));

  let plan = invData;
  let prior = null;
  if (RETRY_FILE) {
    prior = JSON.parse(fs.readFileSync(RETRY_FILE, 'utf8'));
    plan = {};
    for (const [bucket, names] of Object.entries(invData)) {
      const failedNames = (prior.buckets[bucket] && prior.buckets[bucket].failedNames) || [];
      if (failedNames.length) plan[bucket] = failedNames;
    }
  }

  const out = prior
    ? { generated: prior.generated, retried: new Date().toISOString(), buckets: prior.buckets }
    : { generated: new Date().toISOString(), buckets: {} };

  for (const [bucket, names] of Object.entries(plan)) {
    let bytes = (prior && out.buckets[bucket] ? out.buckets[bucket].bytes : 0);
    let ok = (prior && out.buckets[bucket] ? out.buckets[bucket].measured : 0);
    const fails = {};
    const failedNames = [];
    const queue = [...names];
    async function worker() {
      while (queue.length) {
        const n = queue.pop();
        const u = url + '/storage/v1/object/public/' + bucket + '/' + n.split('/').map(encodeURIComponent).join('/');
        try {
          const r = await fetch(u, { method: 'HEAD' });
          const len = parseInt(r.headers.get('content-length') || '0', 10);
          if (r.ok && len) { bytes += len; ok++; }
          else if (r.ok && !len) {
            // No content-length on HEAD (chunked?) — size via GET body.
            try {
              const g = await fetch(u);
              const buf = Buffer.from(await g.arrayBuffer());
              if (g.ok && buf.length) { bytes += buf.length; ok++; }
              else { fails['GET' + g.status] = (fails['GET' + g.status] || 0) + 1; failedNames.push(n); }
            } catch (e) { fails['GETERR'] = (fails['GETERR'] || 0) + 1; failedNames.push(n); }
          }
          else {
            fails[r.status] = (fails[r.status] || 0) + 1;
            if (r.status === 429) failedNames.push(n);
          }
        } catch (e) {
          fails['ERR'] = (fails['ERR'] || 0) + 1;
          failedNames.push(n);
        }
        const done = ok + Object.values(fails).reduce((a, b) => a + b, 0);
        if (done % 1000 === 0) console.log(bucket + ' progress ' + done + '/' + names.length);
        if (process.env.SLOW) await new Promise((res) => setTimeout(res, 150));
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    out.buckets[bucket] = { objects: invData[bucket].length, measured: ok, failed: fails, failedNames, bytes };
    console.log(bucket + ': objects=' + invData[bucket].length + ' measured=' + ok + ' failed=' + JSON.stringify(fails) + ' bytes=' + bytes);
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '_');
  const p = 'backups/storage-bytes_' + stamp + '.json';
  fs.writeFileSync(p, JSON.stringify(out, null, 1));
  console.log('saved ' + p);
})();
