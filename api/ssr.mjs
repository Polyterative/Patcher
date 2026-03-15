/**
 * Vercel serverless function — Angular SSR shim.
 *
 * Vercel does not natively wire up Angular 17+ server bundles.
 * This function imports the built server.mjs, creates an AngularNodeAppEngine,
 * and delegates every HTML request to it so crawlers get real rendered HTML.
 */

import { AngularNodeAppEngine, createNodeRequestHandler, writeResponseToNodeResponse } from '@angular/ssr/node';

// Load the Angular server bundle; this registers the app + server manifests
// that AngularNodeAppEngine needs before it can render anything.
await import('../dist/Patcher/server/server.mjs');

const engine = new AngularNodeAppEngine();

export default createNodeRequestHandler(async (req, res, next) => {
  const response = await engine.handle(req);
  if (response) {
    await writeResponseToNodeResponse(response, res);
  } else {
    next();
  }
});
