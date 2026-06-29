import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
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
import { ScreenWrapperComponent } from './shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { AppFaqComponent } from './components/shared-atoms/app-faq/app-faq.component';
import { SelectionPanelOutletComponent } from './components/patch-parts/selection-panel-outlet/selection-panel-outlet.component';
import { DiscoveryTipSurfaceComponent } from './shared-interproject/discovery-tips/discovery-tip-surface/discovery-tip-surface.component';
import { ModuleDetailDataService } from './components/module-parts/module-detail-data.service';
import { PatchDetailDataService } from './components/patch-parts/patch-detail-data.service';
import { RackDetailDataService } from './components/rack-parts/rack-detail-data.service';
import { WideShellToolbarComponent } from './shared-interproject/components/@visual/wide-shell-toolbar/wide-shell-toolbar.component';
import { AnalyticsService } from './features/backbone/analytics-integration/analytics.service';
import { normalizeUrlPath } from './shared-interproject/url-path.util';

type AppShellArea = 'home' | 'modules' | 'racks' | 'patches' | 'manufacturers' | 'user' | 'manuals' | 'comments' | 'info';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[@.disabled]': 'animationsDisabled'
  },
  standalone: true,
  // Provide the data services that the floating SelectionPanelOutletComponent
  // tree depends on (module-cvitem injects PatchDetailDataService; module-minimal
  // injects ModuleDetailDataService + RackDetailDataService). The outlet lives
  // at app root, outside any lazy feature module, so without these providers
  // its inner render aborts with NG0201 and the panel body silently collapses
  // to just the header. PatchModule/RackModule still declare their own
  // component-level providers so the patch/rack editors keep their isolated,
  // navigation-scoped instances — the AppComponent instances are only ever
  // touched by the always-present floating outlet.
  providers: [
    PatchDetailDataService,
    RackDetailDataService,
    ModuleDetailDataService,
  ],
  imports: [
    BackboneModule,
    RouterOutlet,
    ScreenWrapperComponent,
    AppFaqComponent,
    AsyncPipe,
    SelectionPanelOutletComponent,
    DiscoveryTipSurfaceComponent,
    WideShellToolbarComponent,
  ]
})
export class AppComponent implements OnDestroy {
  readonly modernShell$;
  readonly embeddedShell$;
  readonly showSupportingContent$;
  readonly shellArea$;
  readonly animationsDisabled: boolean;
  wideShellToolbarStuck = false;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private removeWideShellToolbarScrollListeners?: () => void;

  @ViewChild('wideToolbarSentinel')
  set wideToolbarSentinelRef(value: ElementRef<HTMLElement> | undefined) {
    this.observeWideShellToolbar(value?.nativeElement);
  }

  constructor(
    private router: Router,
    private readonly appViewportService: AppViewportService,
    private readonly appShellLayoutService: AppShellLayoutService,
    // Eagerly instantiate so its constructor's initial bridge.selectionState$
    // push (EMPTY) happens at boot — before any patch editor instance can
    // push real selection state. Otherwise the lazy creation triggered by
    // the panel's first render would clobber the user's selection mid-click.
    _patchDataServiceEagerBoot: PatchDetailDataService,
    // Eagerly instantiate global analytics so router pageviews are wired at
    // app boot, before feature-specific lazy chunks load.
    _analyticsEagerBoot: AnalyticsService,
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
    this.modernShell$ = currentUrl$.pipe(
      map((currentUrl) => this.supportsEmbeddedShell(currentUrl)),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.embeddedShell$ = combineLatest({
      wideShell: this.appShellLayoutService.wideShell$,
      modernShell: this.modernShell$
    }).pipe(
      map(({wideShell, modernShell}) => wideShell && modernShell),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.showSupportingContent$ = currentUrl$.pipe(
      map((currentUrl) => this.supportsSupportingContent(currentUrl)),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.shellArea$ = currentUrl$.pipe(
      map((currentUrl) => this.getShellArea(currentUrl)),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  ngOnDestroy(): void {
    this.removeWideShellToolbarScrollListeners?.();
  }

  private observeWideShellToolbar(sentinel: HTMLElement | undefined): void {
    this.removeWideShellToolbarScrollListeners?.();
    this.removeWideShellToolbarScrollListeners = undefined;

    if (!sentinel || !isPlatformBrowser(this.platformId)) {
      this.updateWideShellToolbarStuck(false);
      return;
    }

    const syncStuckState = () => this.syncWideShellToolbarStuck();
    window.addEventListener('scroll', syncStuckState, {passive: true});
    window.addEventListener('resize', syncStuckState, {passive: true});
    window.visualViewport?.addEventListener('resize', syncStuckState, {passive: true});
    window.visualViewport?.addEventListener('scroll', syncStuckState, {passive: true});
    this.removeWideShellToolbarScrollListeners = () => {
      window.removeEventListener('scroll', syncStuckState);
      window.removeEventListener('resize', syncStuckState);
      window.visualViewport?.removeEventListener('resize', syncStuckState);
      window.visualViewport?.removeEventListener('scroll', syncStuckState);
    };

    this.syncWideShellToolbarStuck();
  }

  private syncWideShellToolbarStuck(): void {
    const scrollTop = Math.max(
      window.scrollY,
      document.documentElement.scrollTop,
      document.body?.scrollTop ?? 0
    );
    this.updateWideShellToolbarStuck(scrollTop > 0);
  }

  private updateWideShellToolbarStuck(stuck: boolean): void {
    if (this.wideShellToolbarStuck === stuck) {
      return;
    }

    this.wideShellToolbarStuck = stuck;
    this.changeDetectorRef.markForCheck();
  }

  private supportsEmbeddedShell(url: string): boolean {
    const normalizedUrl = normalizeUrlPath(url);
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
      || normalizedUrl.startsWith('/collection/')
      || normalizedUrl.startsWith('/collections')
      || normalizedUrl.startsWith('/manufacturers')
      || normalizedUrl.startsWith('/info/')
      || isAuthShellRoute
      || normalizedUrl.startsWith('/user/area')
      || normalizedUrl.startsWith('/user/account')
      || normalizedUrl.startsWith('/u/')
      || normalizedUrl === '/admin'
      || normalizedUrl.startsWith('/admin/');
 }

 private supportsSupportingContent(url: string): boolean {
   const normalizedUrl = normalizeUrlPath(url);
   return !/^\/collection\/\d+(?:[/?#]|$)/.test(normalizedUrl)
     && !/^\/collections\/manage\/\d+(?:[/?#]|$)/.test(normalizedUrl);
 }

 private getShellArea(url: string): AppShellArea {
   const path = normalizeUrlPath(url);
   const userAreaSection = /^\/user\/area\/([^/]+)/.exec(path)?.[1];
   const section = userAreaSection ?? path.split('/')[1] ?? '';

   if (section === 'modules'
     || section === 'collections'
     || section === 'collection') {
     return 'modules';
   }

   if (section === 'racks') {
     return 'racks';
   }

   if (section === 'patches') {
     return 'patches';
   }

   if (section === 'manuals') {
     return 'manuals';
   }

   if (section === 'comments') {
     return 'comments';
   }

   if (path.startsWith('/manufacturers')) {
     return 'manufacturers';
   }

   if (path.startsWith('/user/')
     || path.startsWith('/u/')
     || path.startsWith('/auth')
     || path.startsWith('/login')
     || path.startsWith('/signup')
     || path.startsWith('/reset-password')
     || path.startsWith('/complete-profile')
     || path.startsWith('/callback')
     || path.startsWith('/admin')) {
     return 'user';
   }

   if (path.startsWith('/info/')) {
     return 'info';
   }

   return 'home';
 }
}
