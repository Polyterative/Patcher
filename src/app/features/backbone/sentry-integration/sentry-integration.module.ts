import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';

@NgModule({
  declarations: [],
  providers:    [
    {
      provide:  ErrorHandler,
      useValue: Sentry.createErrorHandler({
        showDialog: true
      })
    },
    {
      provide: Sentry.TraceService,
      deps:    [Router]
    },
    {
      provide:    APP_INITIALIZER,
      useFactory: () => () => {},
      deps:       [Sentry.TraceService],
      multi:      true
    }
  ],
  imports:      [
    CommonModule
  ]
})
export class SentryIntegrationModule {
  
}
