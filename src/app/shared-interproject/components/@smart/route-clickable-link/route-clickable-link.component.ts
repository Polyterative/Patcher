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
  
  constructor(public readonly appState: AppStateService) {
  }
  
  public trackByLink(index: number, item: RouteClickableLink): string {
    return `${ index }:${ item.route ?? item.href ?? item.label }:${ item.icon ?? '' }`;
  }
  
  public getAriaLabel(item: RouteClickableLink): string {
    return item.label || item.icon || 'Navigation link';
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