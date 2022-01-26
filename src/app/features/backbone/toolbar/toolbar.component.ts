import {
  ChangeDetectionStrategy,
  Component
}                                from '@angular/core';
import { Router }                from '@angular/router';
import { BehaviorSubject }       from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { RouteClickableLink }    from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';
import { SubManager }            from '../../../shared-interproject/directives/subscription-manager';
import { ToolbarService }        from './toolbar.service';

@Component({
  selector:        'app-toolbar',
  templateUrl:     './toolbar.component.html',
  styleUrls:       ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
  
})
export class ToolbarComponent extends SubManager {
  public readonly homeLinks$ = new BehaviorSubject<RouteClickableLink[]>([
    {
      label:    '',
      route:    'home',
      icon:     'home',
      disabled: false
    },
    {
      label:      '',
      href:       'https://docs.patcher.xyz/',
      hrefNewTab: true,
      icon:       'help_outline',
      disabled:   false
    }
  ]);
  public readonly mainLinks$ = new BehaviorSubject<RouteClickableLink[]>([
    {
      label:    'Modules',
      route:    '/modules/browser',
      icon:     'view_module',
      disabled: false
    },
    {
      label:    'Racks',
      route:    'racks/browser',
      icon:     'view_stream',
      disabled: false
    },
    {
      label:    'Patches',
      route:    'patches/browser',
      icon:     'settings_input_composite',
      disabled: false
    }
  ]);
  
  public readonly linksUser$ = new BehaviorSubject<RouteClickableLink[]>([
    {
      label:    'Collection',
      route:    'user/area',
      icon:     'dashboard',
      disabled: false
    },
    {
      label:    '',
      route:    'user/account',
      icon:     'manage_accounts',
      disabled: false
    }
  ]);
  
  
  public readonly linksA$ = new BehaviorSubject<RouteClickableLink[]>([
    {
      label:    'Collection',
      icon:     'dashboard',
      disabled: true
    },
    {
      label:    'Log in',
      route:    'auth/login',
      icon:     'login',
      disabled: false
    },
    {
      label:    'Sign up',
      route:    'auth/signup',
      icon:     'account_circle',
      style:    {border: '1px solid rgba(210,210,210, 70%)'},
      disabled: false
    }
  ]);
  
  constructor(
    public userService: UserManagementService,
    public service: ToolbarService,
    public router: Router
  ) {
    super();
  
    this.manageSub(
      this.userService.loggedUserProfile$
          .subscribe(x => {
  
            const element: RouteClickableLink = this.linksUser$.value[1];
            element.label = x ? x.username : '';
            const toNext = this.linksUser$.value;
            toNext[1] = element;
            this.linksUser$.next(toNext);
  
          })
    );
  
  }
  
}
