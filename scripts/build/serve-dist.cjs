#!/usr/bin/env node
/**
 * Minimal static server for the production bundle at dist/Patcher/browser.
 *
 * Used by `pnpm test:e2e:prod` to expose the real prod artefact to Playwright,
 * exactly as a user would receive it from the CDN. Unknown paths fall back to
 * index.html so SPA routes resolve client-side.
 *
 * Env:
 *   PORT  — defaults to 5557
 *   ROOT  — defaults to dist/Patcher/browser
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5557);
const ROOT = path.resolve(process.env.ROOT || 'dist/Patcher/browser');
const INDEX = path.join(ROOT, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json; charset=utf-8'
};

if (!fs.existsSync(INDEX)) {
  console.error(`[serve-dist] ${INDEX} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

function send(res, status, body, headers) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.normalize(path.join(ROOT, url));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (e, data) => {
      if (e) {
        // SPA fallback — unknown route serves index.html, client router takes over
        return fs.readFile(INDEX, (e2, idx) => {
          if (e2) return send(res, 500, 'Internal Error');
          send(res, 200, idx, { 'Content-Type': MIME['.html'] });
        });
      }
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    });
  });
});

server.listen(PORT, () => {
  console.log(`[serve-dist] http://localhost:${PORT} → ${ROOT}`);
});
