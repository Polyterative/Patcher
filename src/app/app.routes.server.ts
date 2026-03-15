import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // All routes rendered on-demand (on the server per request, never prerendered)
  // This gives crawlers real HTML without a build-time database snapshot
  { path: '**', renderMode: RenderMode.Server },
];
