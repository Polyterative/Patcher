import {
  Inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  BehaviorSubject,
  Observable
} from 'rxjs';
import {
  distinctUntilChanged,
  map
} from 'rxjs/operators';

export type AppThemePreference = 'system' | 'light' | 'dark';
export type AppThemeEffective = 'light' | 'dark';

const STORAGE_KEY = 'patcher.theme-preference';
const DARK_CLASS = 'dark';
const LIGHT_THEME_COLOR = '#eef6fa';
const DARK_THEME_COLOR = '#0d1117';

function normalizePreference(raw: string | null): AppThemePreference {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

function readStoredPreference(): AppThemePreference {
  try {
    return normalizePreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'system';
  }
}

/**
 * System-first theme controller.
 *
 * Default is `system` — the OS `prefers-color-scheme` wins until the user
 * picks an explicit override via the discrete theme toggle. The choice is
 * persisted in localStorage and applied as `html.dark` + `color-scheme`
 * so both Material and custom surfaces follow it without a flash.
 *
 * SSR-safe: all DOM access is guarded behind isPlatformBrowser.
 */
@Injectable({
  providedIn: 'root'
})
export class AppThemeService {
  private readonly isBrowser: boolean;
  private mediaQuery: MediaQueryList | null = null;
  private readonly preferenceSubject: BehaviorSubject<AppThemePreference>;
  private readonly effectiveDarkSubject: BehaviorSubject<boolean>;
  private readonly onSystemChange = (event: MediaQueryListEvent): void => {
    if (this.preferenceSubject.value === 'system') {
      this.applyEffective(event.matches, true);
    }
  };

  readonly preference$: Observable<AppThemePreference>;
  readonly effectiveDark$: Observable<boolean>;
  readonly effectiveTheme$: Observable<AppThemeEffective>;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const initialPreference = this.isBrowser ? readStoredPreference() : 'system';
    const initialDark = this.isBrowser ? this.resolveIsDark(initialPreference) : false;

    this.preferenceSubject = new BehaviorSubject<AppThemePreference>(initialPreference);
    this.effectiveDarkSubject = new BehaviorSubject<boolean>(initialDark);
    this.preference$ = this.preferenceSubject.asObservable().pipe(distinctUntilChanged());
    this.effectiveDark$ = this.effectiveDarkSubject.asObservable().pipe(distinctUntilChanged());
    this.effectiveTheme$ = this.effectiveDark$.pipe(map((dark) => (dark ? 'dark' : 'light')));

    if (this.isBrowser) {
      try {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQuery = mql;
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', this.onSystemChange);
        } else {
          mql.addListener(this.onSystemChange);
        }
      } catch {
        // matchMedia unavailable (old browser / test env) — stay on stored value.
      }
      this.applyEffective(initialDark);
    }
  }

  preference(): AppThemePreference {
    return this.preferenceSubject.value;
  }

  isDark(): boolean {
    return this.effectiveDarkSubject.value;
  }

  setPreference(preference: AppThemePreference): void {
    this.preferenceSubject.next(preference);
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, preference);
      } catch {
        // Private mode — theme still applies for this session.
      }
      this.applyEffective(this.resolveIsDark(preference), true);
    }
  }

  /** Single-button cycle for the discrete toggle: system → dark → light → system. */
  cyclePreference(): AppThemePreference {
    const next: AppThemePreference = this.preferenceSubject.value === 'system'
      ? 'dark'
      : this.preferenceSubject.value === 'dark'
        ? 'light'
        : 'system';
    this.setPreference(next);
    return next;
  }

  private resolveIsDark(preference: AppThemePreference): boolean {
    if (preference === 'dark') {
      return true;
    }
    if (preference === 'light') {
      return false;
    }
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }

  private applyEffective(isDark: boolean, animate = false): void {
    this.effectiveDarkSubject.next(isDark);
    if (!this.isBrowser) {
      return;
    }
    const root = document.documentElement;
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('theme-anim');
      window.setTimeout(() => root.classList.remove('theme-anim'), 220);
    }
    root.classList.toggle(DARK_CLASS, isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.setAttribute('data-theme-source', this.preferenceSubject.value);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    // Collapse the pre-boot media-specific theme-color metas into a single
    // source of truth reflecting the effective theme (explicit override wins
    // over OS media once the user has chosen).
    const color = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
    const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
    if (metas.length === 0) {
      const created = document.createElement('meta');
      created.setAttribute('name', 'theme-color');
      created.setAttribute('content', color);
      document.head.appendChild(created);
    } else {
      metas.forEach((meta, index) => {
        if (index === 0) {
          meta.setAttribute('content', color);
          meta.removeAttribute('media');
        } else {
          meta.parentNode?.removeChild(meta);
        }
      });
    }
  }
}
