﻿import {
  ChangeDetectionStrategy,
  Component
}                             from '@angular/core';
import { Router }             from '@angular/router';
import { BehaviorSubject }    from 'rxjs';
import { RouteClickableLink } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link/route-clickable-link.component';
import { ToolbarService }     from './toolbar.service';

@Component({
  selector:        'app-toolbar',
  templateUrl:     './toolbar.component.html',
  styleUrls:       ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
  
})
export class ToolbarComponent {
  public readonly links$ = new BehaviorSubject<RouteClickableLink[]>([
    {
      label:    '',
      route:    'home',
      icon:     'home',
      disabled: false
    },
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
      icon:     'account_box',
      disabled: false
    },
    {
      label:    '',
      route:    'user/account',
      icon:     'manage_accounts',
      disabled: true
    }
  ]);
  
  constructor(public service: ToolbarService, public router: Router) {
  }
  
}
