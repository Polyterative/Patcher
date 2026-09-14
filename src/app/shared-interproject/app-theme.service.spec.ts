import {
  AppThemeService
} from './app-theme.service';

describe('AppThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
  });

  function makeService(): AppThemeService {
    // 'browser' matches Angular's PLATFORM_BROWSER_ID so isPlatformBrowser passes.
    return new AppThemeService('browser' as unknown as object);
  }

  it('creates with system default when nothing is stored', () => {
    expect(makeService().preference()).toBe('system');
  });

  it('persists an explicit preference and toggles html.dark', () => {
    const service = makeService();
    service.setPreference('dark');
    expect(service.preference()).toBe('dark');
    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(localStorage.getItem('patcher.theme-preference')).toBe('dark');

    service.setPreference('light');
    expect(service.isDark()).toBeFalse();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });

  it('cycles system -> dark -> light -> system', () => {
    const service = makeService();
    expect(service.preference()).toBe('system');
    expect(service.cyclePreference()).toBe('dark');
    expect(service.cyclePreference()).toBe('light');
    expect(service.cyclePreference()).toBe('system');
  });

  it('ignores invalid stored values and falls back to system', () => {
    localStorage.setItem('patcher.theme-preference', 'neon');
    expect(makeService().preference()).toBe('system');
  });
});
