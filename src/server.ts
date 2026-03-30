/**
 * Angular SSR server entry point for Vercel.
 * Uses CommonEngine — the NgModule-compatible SSR API.
 *
 * `ssr.entry` in angular.json points HERE.
 * `main.server.ts` exports AppServerModule (the NgModule bootstrap).
 */

import { APP_BASE_HREF } from '@angular/common';
import {
  CommonEngine,
  createNodeRequestHandler,
  isMainModule
} from '@angular/ssr/node';
import express from 'express';
import { existsSync } from 'node:fs';
import {
  dirname,
  join,
  resolve
} from 'node:path';
import { fileURLToPath } from 'node:url';

// AppServerModule is exported as default from main.server.ts
import AppServerModule from './main.server';
import {
  resolveRequestOrigin,
  resolveSsrAllowedHosts
} from './ssr-host-config';


const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const csrHtml = join(browserDistFolder, 'index.csr.html');

// In production the builder emits index.csr.html; in dev (ng serve) Vite serves
// HTML in memory so the file never lands on disk.
const isProd = existsSync(csrHtml);

export function app(): express.Express {
  const server = express();
  const engine = new CommonEngine({allowedHosts: resolveSsrAllowedHosts()});
  
  server.set('trust proxy', true);

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
    const requestOrigin = resolveRequestOrigin({
      protocol,
      host: headers.host,
      forwardedHost: headers['x-forwarded-host'],
      forwardedProto: headers['x-forwarded-proto'],
    });

    engine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: csrHtml,
        url: `${ requestOrigin }${ originalUrl }`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch(next);
  });
  
  server.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('SSR render failed', {
      error,
      host: req.headers.host,
      path: req.originalUrl,
      forwardedHost: req.headers['x-forwarded-host'],
      forwardedProto: req.headers['x-forwarded-proto'],
    });
    
    if (res.headersSent) {
      next(error);
      return;
    }
    
    res.status(500).send('Internal Server Error');
  });

  return server;
}

// When run directly (local dev: `node dist/Patcher/server/server.mjs`)
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app().listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Exported for the Vercel serverless shim (api/ssr.mjs).
// In dev mode (ng serve), export an UNTAGGED handler — the Angular CLI will see it
// is not an SsrNodeRequestHandler and fall back to its internal Vite SSR middleware,
// which reads HTML from in-memory outputFiles (no disk file needed) and injects CSS/scripts.
// In production, export the full Express app tagged via createNodeRequestHandler.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reqHandler = isProd
  ? createNodeRequestHandler(app())
  : ((_req: any, _res: any, next: any) => next?.());