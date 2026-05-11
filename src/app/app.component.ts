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
    const currentUrl$ = this.router.events.pipe(
      filter((event) =>
        event instanceof NavigationStart
        || event instanceof NavigationEnd
        || event instanceof NavigationCancel
        || event instanceof NavigationError
      ),
      startWith(null),
      map(() => this.router.url ?? '/'),
      distinctUntilChanged()
    );
    this.embeddedShell$ = combineLatest([
      this.appShellLayoutService.wideShell$,
      currentUrl$
    ]).pipe(
      map(([wideShell, currentUrl]) => wideShell && this.supportsEmbeddedShell(currentUrl)),
      distinctUntilChanged()
    );
    this.routeLoading$ = this.router.events.pipe(
      filter((event) =>
        event instanceof NavigationStart
        || event instanceof NavigationEnd
        || event instanceof NavigationCancel
        || event instanceof NavigationError
      ),
      map((event) => event instanceof NavigationStart),
      startWith(false),
      distinctUntilChanged()
    );
  }

  private supportsEmbeddedShell(url: string): boolean {
    const normalizedUrl = url.toLowerCase();

    return normalizedUrl === '/'
      || normalizedUrl.startsWith('/home')
      || normalizedUrl.startsWith('/modules')
      || normalizedUrl.startsWith('/racks')
      || normalizedUrl.startsWith('/patches')
      || normalizedUrl.startsWith('/manufacturers')
      || normalizedUrl.startsWith('/insights')
      || normalizedUrl.startsWith('/user/area')
      || normalizedUrl.startsWith('/user/account')
      || normalizedUrl.startsWith('/u/');
}
}
