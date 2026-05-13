import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject
} from '@angular/core';
import {
  isPlatformBrowser
} from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router
} from '@angular/router';
import {
  combineLatest
} from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith
} from 'rxjs/operators';
import { AppShellLayoutService } from './shared-interproject/app-shell-layout.service';
import { AppViewportService } from './shared-interproject/app-viewport.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[@.disabled]': 'animationsDisabled'
  },
  standalone: false
})
export class AppComponent {
  readonly routeLoading$;
  readonly embeddedShell$;
  readonly animationsDisabled: boolean;
  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private router: Router,
    private readonly appViewportService: AppViewportService,
    private readonly appShellLayoutService: AppShellLayoutService
  ) {
    this.animationsDisabled = isPlatformBrowser(this.platformId)
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.appViewportService.initialize();
    const navigationState$ = this.router.events.pipe(
      filter((event) =>
        event instanceof NavigationStart
        || event instanceof NavigationEnd
        || event instanceof NavigationCancel
        || event instanceof NavigationError
      ),
      startWith(null),
      map((event) => ({
        currentUrl: this.router.url ?? '/',
        routeLoading: event instanceof NavigationStart
      })),
      shareReplay({bufferSize: 1, refCount: true})
    );
    const currentUrl$ = navigationState$.pipe(
      map((state) => state.currentUrl),
      distinctUntilChanged()
    );
    this.embeddedShell$ = combineLatest([
      this.appShellLayoutService.wideShell$,
      currentUrl$
    ]).pipe(
      map(([wideShell, currentUrl]) => wideShell && this.supportsEmbeddedShell(currentUrl)),
      distinctUntilChanged()
    );
    this.routeLoading$ = navigationState$.pipe(
      map((state) => state.routeLoading),
      distinctUntilChanged()
    );
  }

  private supportsEmbeddedShell(url: string): boolean {
    const normalizedUrl = url.toLowerCase();
    const isAuthShellRoute = normalizedUrl === '/auth'
      || normalizedUrl.startsWith('/auth/')
      || normalizedUrl.startsWith('/login')
      || normalizedUrl.startsWith('/signup')
      || normalizedUrl.startsWith('/reset-password')
      || normalizedUrl.startsWith('/complete-profile')
      || normalizedUrl.startsWith('/callback');

    return normalizedUrl === '/'
      || normalizedUrl.startsWith('/home')
      || normalizedUrl.startsWith('/modules')
      || normalizedUrl.startsWith('/racks')
      || normalizedUrl.startsWith('/patches')
      || normalizedUrl.startsWith('/manufacturers')
      || normalizedUrl.startsWith('/insights')
      || isAuthShellRoute
      || normalizedUrl.startsWith('/user/area')
      || normalizedUrl.startsWith('/user/account')
      || normalizedUrl.startsWith('/u/');
}
}
