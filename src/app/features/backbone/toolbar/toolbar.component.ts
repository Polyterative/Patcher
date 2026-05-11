import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of,
  startWith
} from 'rxjs';
import { RouteClickableLink } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';
import { getRouteClickableLinkKey } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { ToolbarService } from './toolbar.service';
import {
  buildToolbarGuestLinks,
  buildToolbarSections,
  buildToolbarUserLinks,
  getToolbarAdminLinks,
  getToolbarHomeLinks,
  getToolbarMainLinks,
  ToolbarMobileSection
} from './toolbar-link-data';

@Component({
  selector:        'app-toolbar',
  templateUrl:     './toolbar.component.html',
  styleUrls:       ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone:      false
})
export class ToolbarComponent extends SubManager {
  private readonly homeLinks = getToolbarHomeLinks();
  private readonly mainLinks: RouteClickableLink[];
  private readonly adminLinks = getToolbarAdminLinks();
  private currentUserLinks = buildToolbarUserLinks('Account');
  private currentAdminLinks: RouteClickableLink[] = [];
  private currentMobileSections: ToolbarMobileSection[];

  public readonly homeLinks$: Observable<RouteClickableLink[]>;
  public readonly mainLinks$: Observable<RouteClickableLink[]>;
  public readonly adminLinks$: BehaviorSubject<RouteClickableLink[]>;
  public readonly linksUser$: BehaviorSubject<RouteClickableLink[]>;
  public readonly linksA$: Observable<RouteClickableLink[]>;
  public readonly isLoggedIn$: BehaviorSubject<boolean>;
  public readonly mobileSections$: BehaviorSubject<ToolbarMobileSection[]>;

  constructor(
    public readonly appState: AppStateService,
    public readonly userService: UserManagementService,
    public readonly service: ToolbarService
  ) {
    super();
    this.mainLinks = getToolbarMainLinks(this.appState.isDev);
    this.currentMobileSections = buildToolbarSections(false, 'Account', false, this.appState.isDev);
    this.homeLinks$ = of(this.homeLinks);
    this.mainLinks$ = of(this.mainLinks);
    this.adminLinks$ = new BehaviorSubject<RouteClickableLink[]>(this.currentAdminLinks);
    this.linksUser$ = new BehaviorSubject<RouteClickableLink[]>(this.currentUserLinks);
    this.linksA$ = of(buildToolbarGuestLinks());
    this.isLoggedIn$ = new BehaviorSubject(false);
    this.mobileSections$ = new BehaviorSubject<ToolbarMobileSection[]>(this.currentMobileSections);
    this.manageSub(
      combineLatest([
        this.userService.loggedUser$.pipe(startWith(undefined)),
        this.userService.loggedUserFullProfile$.pipe(startWith(undefined)),
        this.userService.isAdmin$.pipe(startWith(false))
      ]).subscribe(([loggedUser, profile, isAdmin]) => {
        const isLoggedIn = !!loggedUser;
        const username = profile?.username?.trim() || 'Account';
        const nextUserLinks = buildToolbarUserLinks(username);
        const nextAdminLinks = isAdmin ? this.adminLinks : [];
        const nextMobileSections = buildToolbarSections(isLoggedIn, username, isAdmin, this.appState.isDev);

        if (this.isLoggedIn$.value !== isLoggedIn) {
          this.isLoggedIn$.next(isLoggedIn);
        }

        if (this.currentUserLinks !== nextUserLinks) {
          this.currentUserLinks = nextUserLinks;
          this.linksUser$.next(nextUserLinks);
        }

        if (this.currentAdminLinks !== nextAdminLinks) {
          this.currentAdminLinks = nextAdminLinks;
          this.adminLinks$.next(nextAdminLinks);
        }

        if (this.currentMobileSections !== nextMobileSections) {
          this.currentMobileSections = nextMobileSections;
          this.mobileSections$.next(nextMobileSections);
        }
      })
    );
  }

  public trackByLink(index: number, item: RouteClickableLink): string {
    return getRouteClickableLinkKey(item);
  }
}
