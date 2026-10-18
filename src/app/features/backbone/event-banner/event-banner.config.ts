import { InjectionToken } from '@angular/core';

export interface EventBannerConfig {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 date: 'YYYY-MM-DD' — banner first appears on this day */
  startDate: string;
  /** ISO 8601 date: 'YYYY-MM-DD' — banner hides after end of this day (inclusive) */
  endDate: string;
  /** Full message shown in an inline panel behind the "show full communication" button. One entry per paragraph. */
  paragraphs?: string[];
  /** Label of the expand button (default: 'Show full communication'). */
  expandLabel?: string;
  /** Default true. Set false for a permanent banner with no dismiss button. */
  dismissible?: boolean;
  /** Show only to logged-in users. */
  authOnly?: boolean;
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
const MAINTENANCE_NOTICE: EventBannerConfig = {
  id:          'maintenance-catalogue-reset-2026-10',
  title:       'Patcher is going into maintenance on 23 October',
  description: 'The module catalogue will be deleted and rebuilt. Racks, patches and collections will be deleted with it. Your account stays.',
  startDate:   '2026-10-18',
  endDate:     '2026-10-23',
  dismissible: false,
  authOnly:    true,
  paragraphs:  [
    'Dear Patcher user,',
    "I'm writing this with a heavy heart, because it affects something many of you have spent hours building.",
    "Patcher's module catalogue grew quickly, built by many hands, but it was never set up to record where each module's information comes from. For a tool so many of you rely on, that's a real problem. It's something I should have thought about from the start, and I didn't. That's on me.",
    'So from 23 October, Patcher will be in maintenance mode, and the site will be mostly unavailable. During that time the module catalogue will be deleted completely and rebuilt from scratch.',
    "Racks, patches and collections are built entirely on top of the catalogue, and I couldn't find a way to keep them in a meaningful state once it's gone. So they'll be deleted along with it. Your account, profile and settings will stay.",
    'If there is a rack you care about, please take a note of it before 23 October, so you have a reference when you rebuild it.',
    'The new catalogue will start smaller and grow back over time. It will be one you can trust: every module will show where its information comes from, and how it has changed over time. You\'ll also be able to help bring back the modules you know.',
    "I'm truly sorry for the disruption. I know it's a real step back for the project, and it's not a message I ever wanted to send. But I believe in Patcher more than ever, and I'm committed to rebuilding it better and stronger. Thank you for sticking with it.",
    'Vlady\nFounder, Patcher',
  ],
};

const MAINTENANCE_IN_PROGRESS: EventBannerConfig = {
  id:          'maintenance-in-progress-2026-10',
  title:       'Patcher is in maintenance mode',
  description: 'We are rebuilding the database and will be back online soon.',
  startDate:   '2026-10-24',
  endDate:     '2026-11-23',
  dismissible: false,
};

/** Banners in chronological order; the first one whose date window contains today is shown. */
export const EVENT_BANNERS: readonly EventBannerConfig[] = [
  MAINTENANCE_NOTICE,
  MAINTENANCE_IN_PROGRESS,
];

export function pickActiveBanner(
  banners: readonly EventBannerConfig[],
  now: number = Date.now(),
): EventBannerConfig | null {
  return banners.find(b =>
    now >= new Date(`${b.startDate}T00:00:00`).getTime()
    && now <= new Date(`${b.endDate}T23:59:59`).getTime(),
  ) ?? null;
}

// Kept for specs/consumers that want a single config: the banner active right now (or null).
export const ACTIVE_EVENT_BANNER: EventBannerConfig | null = pickActiveBanner(EVENT_BANNERS);

export const EVENT_BANNER_CONFIG = new InjectionToken<EventBannerConfig | null>(
  'EVENT_BANNER_CONFIG',
  { factory: () => pickActiveBanner(EVENT_BANNERS) },
);
