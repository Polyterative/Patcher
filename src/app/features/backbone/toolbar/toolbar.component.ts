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
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ToolbarService } from './toolbar.service';


interface ToolbarMobileSection {
  label: string;
  links: RouteClickableLink[];
}

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ToolbarComponent extends SubManager {
  private readonly homeLinks: RouteClickableLink[] = [
    {
      label: 'Home',
      route: '/home',
      icon:     'home',
      disabled: false
    },
    {
      label: 'Docs',
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
      label: 'Racks',
      route: '/racks/browser',
      icon: 'view_stream',
      disabled: false
    },
    {
      label: 'Patches',
      route: '/patches/browser',
      icon: 'settings_input_composite',
      disabled: false
    },
    {
      label: 'Manufacturers',
      route: '/manufacturers/browser',
      icon: 'handyman',
      disabled: false
    }
  ];
  
  public readonly homeLinks$ = new BehaviorSubject<RouteClickableLink[]>([...this.homeLinks]);
  public readonly mainLinks$ = new BehaviorSubject<RouteClickableLink[]>([...this.mainLinks]);
  public readonly linksUser$ = new BehaviorSubject<RouteClickableLink[]>(this.buildUserLinks('Account'));
  public readonly linksA$ = new BehaviorSubject<RouteClickableLink[]>(this.buildGuestLinks());
  public readonly isLoggedIn$ = new BehaviorSubject(false);
  public readonly mobileSections$ = new BehaviorSubject<ToolbarMobileSection[]>(
    this.buildMobileSections(false, 'Account')
  );
  
  constructor(
    public readonly userService: UserManagementService,
    public readonly service: ToolbarService
  ) {
    super();
    
    this.manageSub(
      combineLatest([
        this.userService.loggedUser$.pipe(startWith(undefined)),
        this.userService.loggedUserFullProfile$.pipe(startWith(undefined))
      ]).subscribe(([loggedUser, profile]) => {
        const isLoggedIn = !!loggedUser;
        const username = profile?.username?.trim() || 'Account';
        
        this.isLoggedIn$.next(isLoggedIn);
        this.linksUser$.next(this.buildUserLinks(username));
        this.mobileSections$.next(this.buildMobileSections(isLoggedIn, username));
      })
    );
  }
  
  public trackByLink(index: number, item: RouteClickableLink): string {
    return `${ index }:${ item.route ?? item.href ?? item.label }:${ item.icon ?? '' }`;
  }
  
  private buildUserLinks(username: string): RouteClickableLink[] {
    return [
      {
        label: 'My profile',
        route: '/user/area',
        icon: 'dashboard',
        disabled: false
      },
      {
        label: username,
        route: '/user/account',
        icon: 'manage_accounts',
        disabled: false
      }
    ];
  }
  
  private buildGuestLinks(): RouteClickableLink[] {
    return [
      {
        label: 'Log in',
        route: '/auth/login',
        icon: 'login',
        disabled: false
      },
      {
        label: 'Sign up',
        route: '/auth/signup',
        icon: 'account_circle',
        style: {border: '1px solid rgba(210, 210, 210, 0.7)'},
        disabled: false
      }
    ];
  }
  
  private buildMobileSections(isLoggedIn: boolean, username: string): ToolbarMobileSection[] {
    const accountLinks = isLoggedIn ? this.buildUserLinks(username) : this.buildGuestLinks();
    
    return [
      {label: 'Quick links', links: this.homeLinks},
      {label: 'Browse', links: this.mainLinks},
      {label: isLoggedIn ? 'Your account' : 'Account', links: accountLinks}
    ];
  }
}