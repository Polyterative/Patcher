import { InjectionToken } from '@angular/core';

export interface EventBannerConfig {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 date: 'YYYY-MM-DD' — banner first appears on this day */
  startDate: string;
  /** ISO 8601 date: 'YYYY-MM-DD' — banner hides after end of this day (inclusive) */
  endDate: string;
  ctaLabel?: string;
  ctaUrl?: string;
  theme?: 'info' | 'accent';
  /**
   * Optional festive marquee strip shown below the banner.
   * Tied to its own date window (must be within startDate..endDate).
   * Set to undefined/omit to suppress the marquee.
   */
  marquee?: {
    text: string;
    /** ISO date — default: same as config startDate */
    startDate?: string;
    /** ISO date — default: same as config endDate */
    endDate?: string;
  };
}

// Set to null to disable the banner entirely (no component renders).
// To add a future event: replace this constant — one file edit, no DB migration.
// Superbooth 2026 banner ran 2026-05-03..2026-05-10; cleared after event ended.
export const ACTIVE_EVENT_BANNER: EventBannerConfig | null = null;

export const EVENT_BANNER_CONFIG = new InjectionToken<EventBannerConfig | null>(
  'EVENT_BANNER_CONFIG',
  { factory: () => ACTIVE_EVENT_BANNER },
);
