import { ErrorHandler, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({providedIn: 'root'})
export class LazySentryErrorHandler implements ErrorHandler {
  private delegatePromise?: Promise<ErrorHandler | null>;

  handleError(error: unknown): void {
    if (!environment.production) {
      console.error(error);
      return;
    }

    void this.getDelegate()
      .then(delegate => {
        if (delegate) {
          delegate.handleError(error);
          return;
        }

        console.error(error);
      })
      .catch(loadError => {
        console.warn('Sentry error handler load failed:', loadError);
        console.error(error);
      });
  }

  private getDelegate(): Promise<ErrorHandler | null> {
    if (!environment.production) {
      return Promise.resolve(null);
    }

    this.delegatePromise ??= import('@sentry/angular')
      .then(({createErrorHandler}) => createErrorHandler())
      .catch(loadError => {
        console.warn('Sentry error handler preload failed:', loadError);
        return null;
      });

    return this.delegatePromise;
  }
}
