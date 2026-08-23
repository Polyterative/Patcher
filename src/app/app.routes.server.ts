import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '404', renderMode: RenderMode.Server, status: 404 },
  // Password recovery links carry a single-use token that only the browser
  // may verify; skip SSR so the server never consumes it (see reset page).
  { path: 'auth/reset-password', renderMode: RenderMode.Client },
  { path: 'reset-password', renderMode: RenderMode.Client },
  // All routes rendered on-demand (on the server per request, never prerendered)
  // This gives crawlers real HTML without a build-time database snapshot
  { path: '**', renderMode: RenderMode.Server },
];
