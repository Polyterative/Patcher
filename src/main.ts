import {
  enableProdMode,
  provideZoneChangeDetection
} from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { initializePostHog } from './app/features/backbone/analytics-integration/posthog-loader';
import build from './build';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

function initializeSentry(): void {
  if (!environment.production) {
    return;
  }

  window.setTimeout(() => {
    void import('@sentry/angular')
      .then(Sentry => {
        Sentry.init({
          dsn: 'https://57dc8f0b1ad240f3afa61628b8351aae@o718439.ingest.us.sentry.io/5780783',
          environment: 'production',
          release: `patcher@${ build.version }`,
          // Pin events to the exact commit so uploaded sourcemaps resolve
          // even when two builds share the same semver `version`.
          dist: build.git?.fullHash || build.git?.hash || undefined,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
            Sentry.breadcrumbsIntegration(),
            Sentry.browserApiErrorsIntegration(),
            Sentry.dedupeIntegration(),
            Sentry.httpContextIntegration()
          ],
          // Full transaction sampling while the user base is small — revisit
          // if quota becomes a constraint.
          tracesSampleRate: 1.0,
          tracePropagationTargets: ['localhost', /^https:\/\/patcher\.xyz/],
          // Don't record replays for normal sessions; only spin up a replay
          // buffer when an error fires. Cheap, high-signal.
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 1.0,
          beforeSend: (event, hint) => {
            // Cross-link: stamp the PostHog distinct_id so you can jump
            // from a Sentry issue straight to that user's PostHog timeline.
            try {
              const ph = (window as unknown as Record<string, { get_distinct_id?: () => string }>)['posthog'];
              if (ph?.get_distinct_id) {
                event.tags = { ...event.tags, posthog_distinct_id: ph.get_distinct_id() };
              }
            } catch { /* swallow */ }

            const error: unknown = hint?.originalException;
            const message =
              (error as { message?: string } | undefined)?.message
              ?? event.message
              ?? '';

            // Drop chunk-load failures: almost always stale clients during a
            // deploy window. The retry/reload path handles them already.
            if (
              /ChunkLoadError|Loading chunk \d+ failed|Loading CSS chunk/i.test(message)
              || (error as { name?: string } | undefined)?.name === 'ChunkLoadError'
            ) {
              return null;
            }

            // Browser-internal noise that isn't actionable.
            if (/ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i.test(message)) {
              return null;
            }

            // Network requests cancelled by navigation / offline. Status 0
            // and AbortError float up from fetch / Supabase realtime.
            if (
              (error as { name?: string } | undefined)?.name === 'AbortError'
              || /NetworkError when attempting to fetch|Failed to fetch|The operation was aborted/i.test(message)
            ) {
              return null;
            }

            return event;
          }
        });
      })
      .catch(sentryErr => {
        console.warn('Sentry init failed:', sentryErr);
      });
  }, 1000);
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, {applicationProviders: [provideZoneChangeDetection()],})
  .then(appRef => {
    initializeSentry();
    void initializePostHog();
    return appRef;
  })
  .catch(err => {
    console.error('Angular bootstrap failed:', err);
    const root = document.querySelector('app-root');
    if (root) {
      (root as HTMLElement).innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;gap:1rem;background:#121212;color:#aaa;">
          <p style="font-size:0.875rem;margin:0;">Something went wrong. Please reload the page.</p>
          <button onclick="location.reload()" style="padding:0.5rem 1.25rem;background:#7c4dff;color:white;border:none;border-radius:0.375rem;cursor:pointer;font-size:0.875rem;">Reload</button>
        </div>
      `;
    }
  });
