/**
 * Vercel serverless shim — re-exports the Angular SSR request handler.
 *
 * src/server.ts (compiled → dist/Patcher/server/server.mjs) sets up Express
 * with AngularNodeAppEngine and exports `reqHandler`.  This file simply
 * forwards every request to that handler so Vercel can invoke it as a
 * serverless function.
 */

export { reqHandler as default } from '../dist/Patcher/server/server.mjs';
