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
export const ACTIVE_EVENT_BANNER: EventBannerConfig | null = {
  id:          'superbooth-2026',
  title:       '🎛 Heading to Superbooth 2026',
  description: 'Hey there, it\'s Vlady, the author of Patcher. I\'ll be at Superbooth in Berlin (7–10 May) as a personal attendee — no booth, just roaming the show floor. I\'ll have a tablet with a live Patcher demo if you\'d like to see it in action and share some feedback. Reach out on Instagram and let\'s meet up!',
  startDate:   '2026-05-03',
  endDate:     '2026-05-10',
  ctaLabel:    'Say hi on Instagram',
  ctaUrl:      'https://www.instagram.com/patcher.xyz/',
  theme:       'accent',
  marquee: {
    text:      '🎛 Superbooth 2026 · Berlin · 7–10 May · Come say hi! · @patcher.xyz on Instagram · ',
    startDate: '2026-05-07',
    endDate:   '2026-05-10',
  },
};

export const EVENT_BANNER_CONFIG = new InjectionToken<EventBannerConfig | null>(
  'EVENT_BANNER_CONFIG',
  { factory: () => ACTIVE_EVENT_BANNER },
);
