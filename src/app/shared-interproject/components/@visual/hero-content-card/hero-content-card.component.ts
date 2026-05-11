import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  buildWideShellAccountLinks,
  getWideShellQuickTargets
} from 'src/app/features/backbone/toolbar/toolbar-link-data';
import {
  NavigationEnd,
  Router,
  RouterLink
} from '@angular/router';
import {
  combineLatest,
  Observable
} from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith
} from 'rxjs/operators';
import {
  getRouteClickableLinkKey,
  RouteClickableLink
} from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';


/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector: 'lib-hero-content-card',
  templateUrl: './hero-content-card.component.html',
  styleUrls: ['./hero-content-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'title',
      duration: 500,
      delay: 100
    }),
    fadeInOnEnterAnimation({
      anchor: 'description',
      duration: 1000,
      delay: 500
    })
  ],
  standalone: false
})
export class HeroContentCardComponent {
  @Input() titleBig: string;
  @Input() titleNormal: string;
  @Input() titleSub: string;
  @Input() top = false;
  @Input() bottom = false;
  @Input() sidesPadding = true;
  @Input() vertPadding = true;
  @Input() description: string;
  @Input() descriptionAlign: 'alignTextStart' | 'alignTextEnd' = 'alignTextEnd';
  @Input() showHelpButton = false;
  @Input() icon: string;
  @Input() showWideShellNav = false;

  public readonly wideShell$: Observable<boolean>;
  public readonly wideShellTargets: RouteClickableLink[];
  public readonly currentShellUrl$: Observable<string>;
  public readonly accountLinks$: Observable<RouteClickableLink[]>;
  public readonly shellVm$: Observable<{
    wideShell: boolean;
    currentUrl: string;
    accountLinks: RouteClickableLink[];
  }>;
  public readonly siteTitle = 'patcher.xyz';

  constructor(
    private readonly appShellLayoutService: AppShellLayoutService,
    private readonly appState: AppStateService,
    private readonly userManagementService: UserManagementService,
    private readonly router: Router
  ) {
    this.wideShell$ = this.appShellLayoutService.wideShell$;
    this.wideShellTargets = getWideShellQuickTargets(this.appState.isDev);
    this.currentShellUrl$ = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.accountLinks$ = combineLatest([
      this.userManagementService.loggedUser$.pipe(startWith(undefined)),
      this.userManagementService.loggedUserFullProfile$.pipe(startWith(undefined))
    ]).pipe(
      map(([loggedUser, profile]) => buildWideShellAccountLinks(
        Boolean(loggedUser),
        profile?.username?.trim() || 'Account'
      )),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.shellVm$ = combineLatest([
      this.wideShell$,
      this.currentShellUrl$,
      this.accountLinks$
    ]).pipe(
      map(([wideShell, currentUrl, accountLinks]) => ({
        wideShell,
        currentUrl,
        accountLinks
      })),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  isWideShellTargetActive(item: RouteClickableLink, currentUrl: string): boolean {
    const normalizedUrl = currentUrl.toLowerCase();
    const normalizedRoute = item.route?.toLowerCase();

    if (!normalizedRoute) {
      return false;
    }

    if (normalizedRoute === normalizedUrl) {
      return true;
    }

    switch (normalizedRoute) {
      case '/home':
        return normalizedUrl === '/' || normalizedUrl === '/home';
      case '/modules/browser':
        return normalizedUrl.startsWith('/modules/');
      case '/racks/browser':
        return normalizedUrl.startsWith('/racks/');
      case '/patches/browser':
        return normalizedUrl.startsWith('/patches/');
      case '/manufacturers/browser':
        return normalizedUrl.startsWith('/manufacturers/');
      case '/insights':
        return normalizedUrl.startsWith('/insights');
      default:
        return false;
    }
  }

  trackByNavLink(index: number, item: RouteClickableLink): string {
    return getRouteClickableLinkKey(item);
  }
}
