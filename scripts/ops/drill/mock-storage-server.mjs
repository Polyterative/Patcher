// In-memory mock of the Supabase Storage endpoints used by scripts/ops/storage-sync.mjs
// (drill/test use only — never point real tools at production with this around).
//
//   MOCK_INSTANCES="54301:keyA,54302:keyB" node scripts/ops/drill/mock-storage-server.mjs
//
// Each instance binds 127.0.0.1:<port>, has its own state and requires
// `Authorization: Bearer <key>`. Requests may arrive in proxy absolute-form
// (GET http://fake.supabase.co:54302/...), which lets a drill exercise a
// hosted-looking hostname through HTTP_PROXY without DNS.
//
// Endpoints (shapes modelled on storage-api; see report for assumptions):
//   GET    /storage/v1/bucket                         -> [{id,name,public,...}]
//   GET    /storage/v1/bucket/<id>                    -> {id,name,public,...}
//   POST   /storage/v1/bucket  {id,name?,public}      (seeding only)
//   POST   /storage/v1/object/list/<bucket> {prefix,limit,offset,sortBy}
//          -> one folder level; folders are {name,id:null,metadata:null,...}
//   GET    /storage/v1/object/authenticated/<bucket>/<path>   bytes + content-type/cache-control
//   POST   /storage/v1/object/<bucket>/<path>  body=bytes, Content-Type, cache-control, x-upsert
//   DELETE /storage/v1/object/<bucket>  {prefixes:[...]} -> [deleted rows]
//   GET    /__mock/stats                               request counters (no auth)
import crypto from 'node:crypto';
import http from 'node:http';

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const now = () => new Date().toISOString();

function err(res, http, statusCode, error, message) {
  res.writeHead(http, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ statusCode: String(statusCode), error, message }));
}
function json(res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});
const bucketRow = (b) => ({ id: b.id, name: b.name, owner: '', public: b.public, file_size_limit: null,
  allowed_mime_types: null, created_at: b.created_at, updated_at: b.created_at });

export function startMock(port, key) {
  const buckets = new Map();
  const stats = { requests: 0, downloads: 0, uploads: 0, deletes: 0, lists: 0 };
  let seq = 0;

  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://127.0.0.1');
      const p = decodeURIComponent(u.pathname);
      if (p === '/__mock/stats') return json(res, stats);
      stats.requests++;
      if (req.headers.authorization !== 'Bearer ' + key) return err(res, 400, 403, 'Unauthorized', 'invalid signature for ' + req.headers.authorization); // echoes the token on purpose: the tool must redact it
      const m = (re) => p.match(re);
      let r;

      if (req.method === 'GET' && p === '/storage/v1/bucket') return json(res, [...buckets.values()].map(bucketRow));
      if (req.method === 'POST' && p === '/storage/v1/bucket') {
        const b = JSON.parse((await readBody(req)).toString() || '{}');
        if (!b.id || buckets.has(b.id)) return err(res, 400, 409, 'Duplicate', 'The resource already exists');
        buckets.set(b.id, { id: b.id, name: b.name || b.id, public: Boolean(b.public), created_at: now(), objects: new Map() });
        return json(res, { name: b.id });
      }
      if (req.method === 'GET' && (r = m(/^\/storage\/v1\/bucket\/([^/]+)$/))) {
        const b = buckets.get(r[1]);
        return b ? json(res, bucketRow(b)) : err(res, 400, 404, 'Bucket not found', 'Bucket not found');
      }

      if (req.method === 'POST' && (r = m(/^\/storage\/v1\/object\/list\/([^/]+)$/))) {
        stats.lists++;
        const b = buckets.get(r[1]);
        if (!b) return err(res, 400, 404, 'Bucket not found', 'Bucket not found');
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        let prefix = body.prefix || '';
        if (prefix && !prefix.endsWith('/')) prefix += '/';
        const limit = Number(body.limit ?? 100), offset = Number(body.offset ?? 0);
        const entries = new Map();
        for (const [name, o] of b.objects) {
          if (!name.startsWith(prefix)) continue;
          const rest = name.slice(prefix.length);
          const slash = rest.indexOf('/');
          if (slash >= 0) {
            const f = rest.slice(0, slash);
            entries.set('d:' + f, { name: f, id: null, updated_at: null, created_at: null, last_accessed_at: null, metadata: null });
          } else {
            entries.set('f:' + rest, { name: rest, id: o.id, updated_at: o.updated_at, created_at: o.created_at, last_accessed_at: o.updated_at,
              metadata: { eTag: '"' + md5(o.bytes) + '"', size: o.bytes.length, mimetype: o.mimetype, cacheControl: o.cacheControl,
                lastModified: o.updated_at, contentLength: o.bytes.length, httpStatusCode: 200 } });
          }
        }
        const sorted = [...entries.values()].sort((a, c) => (a.name < c.name ? -1 : a.name > c.name ? 1 : 0));
        return json(res, sorted.slice(offset, offset + limit));
      }

      if (req.method === 'GET' && (r = m(/^\/storage\/v1\/object\/authenticated\/([^/]+)\/(.+)$/))) {
        const o = buckets.get(r[1])?.objects.get(r[2]);
        if (!o) return err(res, 400, 404, 'not_found', 'Object not found');
        stats.downloads++;
        res.writeHead(200, { 'content-type': o.mimetype, 'cache-control': o.cacheControl, 'content-length': o.bytes.length,
          etag: '"' + md5(o.bytes) + '"', 'last-modified': new Date(o.updated_at).toUTCString() });
        return res.end(o.bytes);
      }

      if (req.method === 'POST' && (r = m(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/))) {
        const b = buckets.get(r[1]);
        if (!b) return err(res, 400, 404, 'Bucket not found', 'Bucket not found');
        const bytes = await readBody(req);
        const prev = b.objects.get(r[2]);
        if (prev && req.headers['x-upsert'] !== 'true') return err(res, 400, 409, 'Duplicate', 'The resource already exists');
        stats.uploads++;
        // Monotonic, strictly increasing timestamps so lastModified always moves on write.
        const t = new Date(Date.now() + ++seq).toISOString();
        const o = { id: prev?.id || crypto.randomUUID(), bytes, created_at: prev?.created_at || t, updated_at: t,
          mimetype: req.headers['content-type'] || 'application/octet-stream',
          cacheControl: req.headers['cache-control'] || 'no-cache' };
        b.objects.set(r[2], o);
        return json(res, { Id: o.id, Key: r[1] + '/' + r[2] });
      }

      if (req.method === 'DELETE' && (r = m(/^\/storage\/v1\/object\/([^/]+)$/))) {
        const b = buckets.get(r[1]);
        if (!b) return err(res, 400, 404, 'Bucket not found', 'Bucket not found');
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        const out = [];
        for (const name of body.prefixes || []) {
          const o = b.objects.get(name);
          if (!o) continue;
          b.objects.delete(name);
          stats.deletes++;
          out.push({ bucket_id: b.id, name, id: o.id, updated_at: o.updated_at, created_at: o.created_at, metadata: { size: o.bytes.length, mimetype: o.mimetype } });
        }
        return json(res, out);
      }

      return err(res, 400, 404, 'not_found', 'route not mocked: ' + req.method + ' ' + p);
    } catch (e) {
      return err(res, 500, 500, 'internal', String(e && e.message));
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const spec = process.env.MOCK_INSTANCES || '54301:mock-key-a,54302:mock-key-b';
  for (const part of spec.split(',')) {
    const [port, key] = part.split(':');
    await startMock(Number(port), key);
    console.log('mock storage listening on 127.0.0.1:' + port);
  }
}
