import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '404', renderMode: RenderMode.Server, status: 404 },
  // All routes rendered on-demand (on the server per request, never prerendered)
  // This gives crawlers real HTML without a build-time database snapshot
  { path: '**', renderMode: RenderMode.Server },
];
