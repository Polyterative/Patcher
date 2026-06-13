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
import { MobileShellToolbarModule } from './features/backbone/toolbar/toolbar.module';
import { ScreenWrapperComponent } from './shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { AppFaqComponent } from './components/shared-atoms/app-faq/app-faq.component';
import { SelectionPanelOutletComponent } from './components/patch-parts/selection-panel-outlet/selection-panel-outlet.component';
import { DiscoveryTipSurfaceComponent } from './shared-interproject/discovery-tips/discovery-tip-surface/discovery-tip-surface.component';
import { ModuleDetailDataService } from './components/module-parts/module-detail-data.service';
import { PatchDetailDataService } from './components/patch-parts/patch-detail-data.service';
import { RackDetailDataService } from './components/rack-parts/rack-detail-data.service';
import { WideShellToolbarComponent } from './shared-interproject/components/@visual/wide-shell-toolbar/wide-shell-toolbar.component';

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
    MobileShellToolbarModule,
    RouterOutlet,
    ScreenWrapperComponent,
    AppFaqComponent,
    AsyncPipe,
    SelectionPanelOutletComponent,
    DiscoveryTipSurfaceComponent,
    WideShellToolbarComponent,
  ]
})
export class AppComponent {
  readonly embeddedShell$;
  readonly showSupportingContent$;
  readonly shellArea$;
  readonly animationsDisabled: boolean;
  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private router: Router,
    private readonly appViewportService: AppViewportService,
    private readonly appShellLayoutService: AppShellLayoutService,
    // Eagerly instantiate so its constructor's initial bridge.selectionState$
    // push (EMPTY) happens at boot — before any patch editor instance can
    // push real selection state. Otherwise the lazy creation triggered by
    // the panel's first render would clobber the user's selection mid-click.
    _patchDataServiceEagerBoot: PatchDetailDataService,
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
   const normalizedUrl = url.toLowerCase();
   return !/^\/collection\/\d+(?:[/?#]|$)/.test(normalizedUrl)
     && !/^\/collections\/manage\/\d+(?:[/?#]|$)/.test(normalizedUrl);
 }

 private getShellArea(url: string): AppShellArea {
   const normalizedUrl = url.toLowerCase();
   const path = normalizedUrl.split(/[?#]/, 1)[0];
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

   if (normalizedUrl.startsWith('/manufacturers')) {
     return 'manufacturers';
   }

   if (normalizedUrl.startsWith('/user/')
     || normalizedUrl.startsWith('/u/')
     || normalizedUrl.startsWith('/auth')
     || normalizedUrl.startsWith('/login')
     || normalizedUrl.startsWith('/signup')
     || normalizedUrl.startsWith('/reset-password')
     || normalizedUrl.startsWith('/complete-profile')
     || normalizedUrl.startsWith('/callback')
     || normalizedUrl.startsWith('/admin')) {
     return 'user';
   }

   if (normalizedUrl.startsWith('/info/')) {
     return 'info';
   }

   return 'home';
 }
}
