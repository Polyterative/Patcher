/**
 * Angular SSR server entry point for Vercel.
 *
 * `ssr.entry` in angular.json must point HERE (not to main.server.ts).
 * `main.server.ts` is the Angular app bootstrap; this file is the Node.js HTTP layer.
 *
 * Exports `reqHandler` which the Vercel serverless shim (api/index.js) re-exports.
 */

import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');

  const angularApp = new AngularNodeAppEngine();

  // Serve static assets with long-lived cache; never serve index.html from here
  // (Angular SSR handles it via angularApp.handle below).
  server.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );

  // All other requests → Angular SSR
  server.use((req, res, next) => {
    angularApp
      .handle(req)
      .then((response) =>
        response ? writeResponseToNodeResponse(response, res) : next(),
      )
      .catch(next);
  });

  return server;
}

const server = app();

// When run directly (local dev: `node dist/Patcher/server/server.mjs`)
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Exported for the Vercel serverless shim (api/index.js)
export const reqHandler = createNodeRequestHandler(server);
