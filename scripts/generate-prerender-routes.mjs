/**
 * Generates prerender-routes.txt for the Angular build.
 *
 * Only static shell routes are prerendered at build time.
 * Detail pages (/modules/details/:id, /patches/details/:id, /racks/details/:id)
 * are rendered on-demand by the Angular SSR server bundle (Vercel serverless function),
 * so they always reflect live Supabase data without requiring a rebuild.
 */

import { writeFileSync } from 'fs';

const STATIC_ROUTES = [
  '/',
  '/home',
  '/modules/browser',
  '/patches/browser',
  '/racks/browser',
  '/info/changelog',
];

writeFileSync('prerender-routes.txt', STATIC_ROUTES.join('\n') + '\n', 'utf8');

console.log(`✔  prerender-routes.txt written — ${STATIC_ROUTES.length} static routes`);
