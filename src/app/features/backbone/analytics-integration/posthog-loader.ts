import { InjectionToken } from '@angular/core';
import build from 'src/build';
import { environment } from 'src/environments/environment';

type PostHogModule = typeof import('posthog-js');
type PostHog = PostHogModule['default'];

export interface PostHogClient {
  capture(event: string, properties?: Record<string, unknown>): void;
  identify(distinctId: string, properties?: Record<string, unknown>): void;
  register(properties: Record<string, unknown>): void;
  reset(): void;
}

export type PostHogLoader = () => Promise<PostHogClient | null>;

let posthogPromise: Promise<PostHogClient | null> | undefined;

export const POSTHOG_CLIENT_LOADER = new InjectionToken<PostHogLoader>('PostHog client loader', {
  providedIn: 'root',
  factory:    () => getPostHog
});

export function initializePostHog(): Promise<PostHogClient | null> {
  return getPostHog();
}

export function getPostHog(): Promise<PostHogClient | null> {
  if (!environment.production) {
    return Promise.resolve(null);
  }

  posthogPromise ??= import('posthog-js')
    .then(({ default: posthog }: PostHogModule) => {
      posthog.init('phc_nbtdGkoZAjg62Gzo5icdapLoPxWe546zvWyJD6MmqjXu', {
        api_host:           'https://eu.i.posthog.com',
        // Capture pageviews manually via Angular Router (see AnalyticsService)
        // because SPA route changes don't fire window.load.
        capture_pageview:   false,
        capture_pageleave:  true,
        autocapture:        true,
        persistence:        'localStorage+cookie',
        respect_dnt:        true,
        // Don't sample replays by default; flip on per-user later if needed.
        disable_session_recording: true
      });

      posthog.register({
        release: build.version,
        commit:  build.git?.hash ?? 'unknown'
      });

      return posthog;
    })
    .catch(loadError => {
      console.warn('PostHog init failed:', loadError);
      return null;
    });

  return posthogPromise;
}
