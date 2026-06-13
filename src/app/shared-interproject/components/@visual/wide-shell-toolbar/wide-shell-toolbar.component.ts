import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterModule
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
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  buildWideShellAccountLinks,
  getWideShellQuickTargets
} from 'src/app/features/backbone/toolbar/toolbar-link-data';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import {
  getRouteClickableLinkKey,
  RouteClickableLink
} from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';


@Component({
  selector: 'app-wide-shell-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './wide-shell-toolbar.component.html',
  styleUrls: ['./wide-shell-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WideShellToolbarComponent {
  @Input() floating = false;
  @Input() showBrand = true;

  readonly wideShellTargets: RouteClickableLink[];
  readonly currentShellUrl$: Observable<string>;
  readonly accountLinks$: Observable<RouteClickableLink[]>;
  readonly shellVm$: Observable<{
    currentUrl: string;
    accountLinks: RouteClickableLink[];
  }>;
  readonly siteTitle = 'patcher.xyz';

  constructor(
    private readonly appState: AppStateService,
    private readonly userManagementService: UserManagementService,
    private readonly router: Router
  ) {
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
      this.userManagementService.loggedUserFullProfile$.pipe(startWith(undefined)),
      this.userManagementService.isAdmin$.pipe(startWith(false))
    ]).pipe(
      map(([loggedUser, profile, isAdmin]) => buildWideShellAccountLinks(
        Boolean(loggedUser),
        profile?.username?.trim() || 'Account',
        isAdmin
      )),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.shellVm$ = combineLatest([
      this.currentShellUrl$,
      this.accountLinks$
    ]).pipe(
      map(([currentUrl, accountLinks]) => ({
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
      case '/info/insights':
        return normalizedUrl.startsWith('/info/insights');
      default:
        return false;
    }
  }

  trackByNavLink(index: number, item: RouteClickableLink): string {
    return getRouteClickableLinkKey(item);
  }
}
