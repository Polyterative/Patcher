import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  buildWideShellAccountLinks,
  getWideShellQuickTargets
} from 'src/app/features/backbone/toolbar/toolbar-link-data';
import {
  NavigationEnd,
  Router
} from '@angular/router';
import {
  combineLatest,
  fromEvent,
  merge,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  auditTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  takeUntil
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
export class HeroContentCardComponent implements AfterViewInit, OnDestroy {
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
  @Input() compactTitleSub = false;
  @ViewChild('wideShellNavOrigin')
  set wideShellNavOriginRef(value: ElementRef<HTMLElement> | undefined) {
    this.wideShellNavOrigin = value;
    this.syncCompactWideShellNav();
  }

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
  public showCompactWideShellNav = false;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroy$ = new Subject<void>();
  private wideShellNavOrigin?: ElementRef<HTMLElement>;
  private isWideShellActive = false;

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

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.wideShell$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((wideShell) => {
      this.isWideShellActive = wideShell;
      this.syncCompactWideShellNav();
    });

    merge(
      of(null),
      fromEvent(window, 'scroll', {passive: true}),
      fromEvent(window, 'resize')
    ).pipe(
      auditTime(16),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.syncCompactWideShellNav();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  private syncCompactWideShellNav(): void {
    if (!this.isBrowser) {
      return;
    }

    const nextCompactVisibility = this.shouldShowCompactWideShellNav();
    const hasVisibilityChanged = this.showCompactWideShellNav !== nextCompactVisibility;

    if (!hasVisibilityChanged) {
      return;
    }

    this.showCompactWideShellNav = nextCompactVisibility;
    this.changeDetectorRef.markForCheck();
  }

  private shouldShowCompactWideShellNav(): boolean {
    if (!this.showWideShellNav || !this.isWideShellActive || !this.wideShellNavOrigin?.nativeElement) {
      return false;
    }

    const navRect = this.wideShellNavOrigin.nativeElement.getBoundingClientRect();
    const revealThresholdPx = Math.min(Math.max(navRect.height * 0.1, 8), 20);
    return navRect.bottom <= revealThresholdPx;
  }
}
