import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  Observable,
  of
} from 'rxjs';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';


@Component({
  selector: 'app-route-clickable-link-list',
  templateUrl: './route-clickable-link.component.html',
  styleUrls: ['./route-clickable-link.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RouteClickableLinkComponent {
  @Input()
  public data$: Observable<RouteClickableLink[]> = of([]);

  @Input()
  public direction: 'row' | 'column' = 'row';
  
  constructor(public readonly appState: AppStateService) {
  }
  
  public trackByLink(index: number, item: RouteClickableLink): string {
    return getRouteClickableLinkKey(item);
  }

  public onLinkInteraction(event: Event, item: RouteClickableLink): void {
    if (item.disabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

export interface RouteClickableLink {
  label: string;
  disabled: boolean;
  route?: string;
  icon?: string;
  href?: string;
  hrefNewTab?: boolean;
  style?: { [param: string]: any };
}

export function getRouteClickableLinkKey(item: RouteClickableLink): string {
  return `${ item.route ?? '' }:${ item.href ?? '' }:${ item.label ?? '' }:${ item.icon ?? '' }`;
}
