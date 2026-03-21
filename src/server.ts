/**
 * Angular SSR server entry point for Vercel.
 * Uses CommonEngine — the NgModule-compatible SSR API.
 *
 * `ssr.entry` in angular.json points HERE.
 * `main.server.ts` exports AppServerModule (the NgModule bootstrap).
 */

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, createNodeRequestHandler, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// AppServerModule is exported as default from main.server.ts
import AppServerModule from './main.server';

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  // Angular 21 application builder outputs index.csr.html (CSR fallback), not index.html
  const indexHtml = join(browserDistFolder, 'index.csr.html');

  const engine = new CommonEngine({ allowedHosts: ['*'] });

  // Serve static assets with long-lived cache; never serve index.html from here.
  server.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );

  // All other requests → Angular SSR via CommonEngine
  server.use((req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    engine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
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

// Exported for the Vercel serverless shim (api/ssr.mjs)
export const reqHandler = createNodeRequestHandler(server);
