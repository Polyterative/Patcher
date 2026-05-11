import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  of,
  startWith
} from 'rxjs';
import { RouteClickableLink } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';
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
  public readonly of = of;
  private readonly homeLinks = getToolbarHomeLinks();
  private readonly adminLinks = getToolbarAdminLinks();

  public readonly homeLinks$ = new BehaviorSubject<RouteClickableLink[]>([...this.homeLinks]);
  public readonly mainLinks$ = new BehaviorSubject<RouteClickableLink[]>([]);
  public readonly adminLinks$ = new BehaviorSubject<RouteClickableLink[]>([]);
  public readonly linksUser$ = new BehaviorSubject<RouteClickableLink[]>(buildToolbarUserLinks('Account'));
  public readonly linksA$ = new BehaviorSubject<RouteClickableLink[]>(buildToolbarGuestLinks());
  public readonly isLoggedIn$ = new BehaviorSubject(false);
  public readonly mobileSections$ = new BehaviorSubject<ToolbarMobileSection[]>(
    []
  );

  constructor(
    public readonly appState: AppStateService,
    public readonly userService: UserManagementService,
    public readonly service: ToolbarService
  ) {
    super();
    this.mainLinks$.next(getToolbarMainLinks(this.appState.isDev));
    this.mobileSections$.next(buildToolbarSections(false, 'Account', false, this.appState.isDev));

    this.manageSub(
      combineLatest([
        this.userService.loggedUser$.pipe(startWith(undefined)),
        this.userService.loggedUserFullProfile$.pipe(startWith(undefined)),
        this.userService.isAdmin$.pipe(startWith(false))
      ]).subscribe(([loggedUser, profile, isAdmin]) => {
        const isLoggedIn = !!loggedUser;
        const username = profile?.username?.trim() || 'Account';

        this.isLoggedIn$.next(isLoggedIn);
        this.linksUser$.next(buildToolbarUserLinks(username));
        this.adminLinks$.next(isAdmin ? this.adminLinks : []);
        this.mobileSections$.next(buildToolbarSections(isLoggedIn, username, isAdmin, this.appState.isDev));
      })
    );
  }

  public trackByLink(index: number, item: RouteClickableLink): string {
    return `${ index }:${ item.route ?? item.href ?? item.label }:${ item.icon ?? '' }`;
  }
}
