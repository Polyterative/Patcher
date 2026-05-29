import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject
} from '@angular/core';
import {
  AsyncPipe,
  isPlatformBrowser
} from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterOutlet
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
import { BackboneModule } from './features/backbone/backbone.module';
import { ToolbarModule } from './features/backbone/toolbar/toolbar.module';
import { ScreenWrapperComponent } from './shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { AppFaqComponent } from './components/shared-atoms/app-faq/app-faq.component';
import { SelectionPanelOutletComponent } from './components/patch-parts/selection-panel-outlet/selection-panel-outlet.component';
import { DiscoveryTipSurfaceComponent } from './shared-interproject/discovery-tips/discovery-tip-surface/discovery-tip-surface.component';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[@.disabled]': 'animationsDisabled'
  },
  standalone: true,
  imports: [
    BackboneModule,
    ToolbarModule,
    RouterOutlet,
    ScreenWrapperComponent,
    AppFaqComponent,
    AsyncPipe,
    SelectionPanelOutletComponent,
    DiscoveryTipSurfaceComponent,
  ]
})
export class AppComponent {
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
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(null),
      map((url) => url ?? this.router.url ?? '/'),
      distinctUntilChanged()
    );
    this.embeddedShell$ = combineLatest([
      this.appShellLayoutService.wideShell$,
      currentUrl$
    ]).pipe(
      map(([wideShell, currentUrl]) => wideShell && this.supportsEmbeddedShell(currentUrl)),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
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
      || normalizedUrl.startsWith('/info/')
      || isAuthShellRoute
      || normalizedUrl.startsWith('/user/area')
      || normalizedUrl.startsWith('/user/account')
      || normalizedUrl.startsWith('/u/')
      || normalizedUrl === '/admin'
      || normalizedUrl.startsWith('/admin/');
}
}
