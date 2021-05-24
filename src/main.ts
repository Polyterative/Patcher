import { enableProdMode }         from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry                from '@sentry/angular';
import { Integrations }           from '@sentry/tracing';

import { AppModule }   from './app/app.module';
import { environment } from './environments/environment';

let sentry;

if (environment.production) {
  enableProdMode();
  
  sentry = {
    environment:      'production',
    dsn:              'https://57dc8f0b1ad240f3afa61628b8351aae@o718439.ingest.sentry.io/5780783',
    integrations:     [
      new Integrations.BrowserTracing({
        tracingOrigins:         [
          'localhost',
          'https://patcher.xyz'
        ],
        routingInstrumentation: Sentry.routingInstrumentation
      })
    ],
    tracesSampleRate: 1
  };
} else {
  sentry = {
    environment:      'development',
    dsn:              'https://57dc8f0b1ad240f3afa61628b8351aae@o718439.ingest.sentry.io/5780783',
    integrations:     [
      new Integrations.BrowserTracing({
        tracingOrigins:         [
          'localhost',
          'https://patcher.xyz'
        ],
        routingInstrumentation: Sentry.routingInstrumentation
      })
    ],
    tracesSampleRate: 1
  };
  
}


Sentry.init(sentry);

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
