import {
  enableProdMode,
  provideZoneChangeDetection
} from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/browser';

import { AppModule } from './app/app.module';
import build from './build';
import { environment } from './environments/environment';


if (environment.production) {
  enableProdMode();
  
  try {
    Sentry.init({
      dsn: 'https://57dc8f0b1ad240f3afa61628b8351aae@o718439.ingest.us.sentry.io/5780783',
      
      environment: environment.production ? 'production' : 'development',
      release: `patcher@${ build.version }`,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
        Sentry.breadcrumbsIntegration(),
        Sentry.browserApiErrorsIntegration(),
        Sentry.dedupeIntegration(),
        Sentry.httpContextIntegration()
      ],
      tracesSampleRate: 1.0,
      tracePropagationTargets: ['localhost', /^https:\/\/patcher\.xyz/], // Updated to include only patcher.xyz
    });
  } catch (sentryErr) {
    console.warn('Sentry init failed:', sentryErr);
  }
  
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, {applicationProviders: [provideZoneChangeDetection()],})
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