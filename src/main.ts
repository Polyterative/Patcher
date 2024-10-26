import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/browser';

import { AppModule } from './app/app.module';
import build from './build';
import { environment } from './environments/environment';


if (environment.production) {
  enableProdMode();
  
  Sentry.init({
    dsn: 'https://57dc8f0b1ad240f3afa61628b8351aae@o718439.ingest.us.sentry.io/5780783',
    environment: environment.production ? 'production' : 'development',
    release: `patcher@${ build.version }`,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^https:\/\/patcher\.xyz/], // Updated to include only patcher.xyz
  });
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));