import {
  ChangeDetectionStrategy,
  Component
}                             from '@angular/core';
import { Router }             from '@angular/router';
import { BehaviorSubject }    from 'rxjs';
import { RouteClickableLink } from '../../../shared-interproject/components/@smart/route-clickable-link/route-clickable-link/route-clickable-link.component';
import { ToolbarService }     from './toolbar.service';

@Component({
  selector:        'app-toolbar',
  templateUrl:     './toolbar.component.html',
  styleUrls:       ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
  
})
export class ToolbarComponent {
  public readonly data$ = new BehaviorSubject<RouteClickableLink[]>([
    {
      label:    'home',
      route:    'home',
      icon:     'home',
      disabled: false
    },
    {
      label:    'Browser',
      route:    '/modules/browser',
      icon:     'list',
      disabled: false
    },
    {
      label:    'Patch builder',
      route:    'builder/new',
      icon:     'build',
      disabled: false
    },
    {
      label:    'My profile',
      route:    'user/area',
      icon:     'person',
      disabled: false
    }
  ]);
  
  constructor(public service: ToolbarService, public router: Router) {
  }
  
}
