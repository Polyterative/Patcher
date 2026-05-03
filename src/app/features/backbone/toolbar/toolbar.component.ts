import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  startWith
} from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { RouteClickableLink } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ToolbarService } from './toolbar.service';


interface ToolbarMobileSection {
  label: string;
  links: RouteClickableLink[];
}

@Component({
  selector:        'app-toolbar',
  templateUrl:     './toolbar.component.html',
  styleUrls:       ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone:      false
})
export class ToolbarComponent extends SubManager {
  private readonly homeLinks: RouteClickableLink[] = [
    {
      label:    'Home',
      route:    '/home',
      icon:     'home',
      disabled: false
    },
    {
      label:      'Docs',
      href:       'https://docs.patcher.xyz/quick-start/',
      hrefNewTab: true,
      icon:       'help_outline',
      disabled:   false
    }
  ];
  private readonly mainLinks: RouteClickableLink[] = [
    {
      label:    'Modules',
      route:    '/modules/browser',
      icon:     'view_module',
      disabled: false
    },
    {
      label:    'Racks',
      route:    '/racks/browser',
      icon:     'view_stream',
      disabled: false
    },
    {
      label:    'Patches',
      route:    '/patches/browser',
      icon:     'settings_input_composite',
      disabled: false
    },
    {
      label:    'Manufacturers',
      route:    '/manufacturers/browser',
      icon:     'handyman',
      disabled: false
    }
  ];
  private readonly insightsLink: RouteClickableLink = {
    label:    'Insights',
    route:    '/insights',
    icon:     'insights',
    disabled: false
  };
  private readonly adminLinks: RouteClickableLink[] = [
    {
      label:    'Admin',
      route:    '/admin',
      icon:     'admin_panel_settings',
      disabled: false
    }
  ];

  public readonly homeLinks$ = new BehaviorSubject<RouteClickableLink[]>([...this.homeLinks]);
  public readonly mainLinks$ = new BehaviorSubject<RouteClickableLink[]>([]);
  public readonly adminLinks$ = new BehaviorSubject<RouteClickableLink[]>([]);
  public readonly linksUser$ = new BehaviorSubject<RouteClickableLink[]>(this.buildUserLinks('Account'));
  public readonly linksA$ = new BehaviorSubject<RouteClickableLink[]>(this.buildGuestLinks());
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
    this.mainLinks$.next(this.buildMainLinks());
    this.mobileSections$.next(this.buildMobileSections(false, 'Account', false));

    this.manageSub(
      combineLatest([
        this.userService.loggedUser$.pipe(startWith(undefined)),
        this.userService.loggedUserFullProfile$.pipe(startWith(undefined)),
        this.userService.isAdmin$.pipe(startWith(false))
      ]).subscribe(([loggedUser, profile, isAdmin]) => {
        const isLoggedIn = !!loggedUser;
        const username = profile?.username?.trim() || 'Account';

        this.isLoggedIn$.next(isLoggedIn);
        this.linksUser$.next(this.buildUserLinks(username));
        this.adminLinks$.next(isAdmin ? this.adminLinks : []);
        this.mobileSections$.next(this.buildMobileSections(isLoggedIn, username, isAdmin));
      })
    );
  }

  public trackByLink(index: number, item: RouteClickableLink): string {
    return `${ index }:${ item.route ?? item.href ?? item.label }:${ item.icon ?? '' }`;
  }

  private buildUserLinks(username: string): RouteClickableLink[] {
    return [
      {
        label:    'My profile',
        route:    '/user/area',
        icon:     'dashboard',
        disabled: false
      },
      {
        label:    username,
        route:    '/user/account',
        icon:     'manage_accounts',
        disabled: false
      }
    ];
  }

  private buildGuestLinks(): RouteClickableLink[] {
    return [
      {
        label:    'Log in',
        route:    '/auth/login',
        icon:     'login',
        disabled: false
      },
      {
        label:    'Sign up',
        route:    '/auth/signup',
        icon:     'account_circle',
        style:    {border: '1px solid rgba(210, 210, 210, 0.7)'},
        disabled: false
      }
    ];
  }

  private buildMainLinks(): RouteClickableLink[] {
    if (!this.appState.isDev) {
      return [...this.mainLinks];
    }

    return [
      ...this.mainLinks.slice(0, 3),
      this.insightsLink,
      ...this.mainLinks.slice(3)
    ];
  }

  private buildMobileSections(isLoggedIn: boolean, username: string, isAdmin: boolean): ToolbarMobileSection[] {
    const accountLinks = isLoggedIn ? this.buildUserLinks(username) : this.buildGuestLinks();
    const browseLinks = this.buildMainLinks();
    const sections: ToolbarMobileSection[] = [
      {label: 'Quick links', links: this.homeLinks},
      {label: 'Browse', links: browseLinks},
      {label: isLoggedIn ? 'Your account' : 'Account', links: accountLinks}
    ];
    if (isAdmin) {
      sections.push({label: 'Admin', links: this.adminLinks});
    }
    return sections;
  }
}
