import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  inject
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterModule
} from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  combineLatest,
  Observable
} from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  tap
} from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  buildToolbarSections,
  buildWideShellAccountLinks,
  getWideShellQuickTargets,
  ToolbarMobileSection
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
    MatIconModule,
    MatTooltipModule,
    RouterModule
  ],
  templateUrl: './wide-shell-toolbar.component.html',
  styleUrls: ['./wide-shell-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WideShellToolbarComponent {
  @Input() showBrand = true;
  @ViewChild('mobileMenuTrigger') private mobileMenuTrigger?: ElementRef<HTMLButtonElement>;

  readonly wideShellTargets: RouteClickableLink[];
  readonly currentShellUrl$: Observable<string>;
  readonly accountLinks$: Observable<RouteClickableLink[]>;
  readonly mobileSections$: Observable<ToolbarMobileSection[]>;
  readonly shellVm$: Observable<{
    currentUrl: string;
    accountLinks: RouteClickableLink[];
    mobileSections: ToolbarMobileSection[];
  }>;
  readonly siteTitle = 'patcher.xyz';
  mobileMenuOpen = false;
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  constructor(
    private readonly appState: AppStateService,
    private readonly userManagementService: UserManagementService,
    private readonly router: Router
  ) {
    this.wideShellTargets = getWideShellQuickTargets(this.appState.isDev);
    this.currentShellUrl$ = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      tap(() => this.closeMobileMenu()),
      map(() => this.router.url),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    const accountState$ = combineLatest([
      this.userManagementService.loggedUser$.pipe(startWith(undefined)),
      this.userManagementService.loggedUserFullProfile$.pipe(startWith(undefined)),
      this.userManagementService.isAdmin$.pipe(startWith(false))
    ]).pipe(
      map(([loggedUser, profile, isAdmin]) => ({
        isLoggedIn: Boolean(loggedUser),
        username: profile?.username?.trim() || 'Account',
        isAdmin
      })),
      distinctUntilChanged((previous, current) => previous.isLoggedIn === current.isLoggedIn
        && previous.username === current.username
        && previous.isAdmin === current.isAdmin),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.accountLinks$ = accountState$.pipe(
      map(({isLoggedIn, username, isAdmin}) => buildWideShellAccountLinks(
        isLoggedIn,
        username,
        isAdmin
      )),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.mobileSections$ = accountState$.pipe(
      map(({isLoggedIn, username, isAdmin}) => buildToolbarSections(
        isLoggedIn,
        username,
        isAdmin,
        this.appState.isDev
      )),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.shellVm$ = combineLatest([
      this.currentShellUrl$,
      this.accountLinks$,
      this.mobileSections$
    ]).pipe(
      map(([currentUrl, accountLinks, mobileSections]) => ({
        currentUrl,
        accountLinks,
        mobileSections
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

  isMobileTargetActive(item: RouteClickableLink, currentUrl: string): boolean {
    if (this.isWideShellTargetActive(item, currentUrl)) {
      return true;
    }

    const normalizedUrl = currentUrl.toLowerCase();
    const normalizedRoute = item.route?.toLowerCase();
    return !!normalizedRoute && (normalizedRoute === normalizedUrl || normalizedUrl.startsWith(`${ normalizedRoute }/`));
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.changeDetectorRef.markForCheck();

    if (!this.mobileMenuOpen) {
      this.mobileMenuTrigger?.nativeElement.focus();
    }
  }

  closeMobileMenu(): void {
    if (!this.mobileMenuOpen) {
      return;
    }

    this.mobileMenuOpen = false;
    this.changeDetectorRef.markForCheck();
  }

  closeMobileMenuAndFocusTrigger(): void {
    const wasOpen = this.mobileMenuOpen;
    this.closeMobileMenu();

    if (wasOpen) {
      this.mobileMenuTrigger?.nativeElement.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.mobileMenuOpen || this.elementRef.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.closeMobileMenu();
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.closeMobileMenuAndFocusTrigger();
  }
}
