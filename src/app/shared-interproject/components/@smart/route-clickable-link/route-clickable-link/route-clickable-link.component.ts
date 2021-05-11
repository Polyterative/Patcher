import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                          from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';

@Component({
  selector:        'app-route-clickable-link-list',
  templateUrl:     './route-clickable-link.component.html',
  styleUrls:       ['./route-clickable-link.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteClickableLinkComponent implements OnInit {
  @Input()
  public readonly data$ = new BehaviorSubject<RouteClickableLink[]>([]);
  
  
  constructor(
    public appState: AppStateService
  ) {
    
  }
  
  ngOnInit(): void {
  }
  
  doNothing(): any {
    
  }
}

interface RouteClickableLinkMenuItem {
  label: string,
}

interface RouteClickableLinkMenu {
  label: string,
  items: RouteClickableLinkMenuItem[]
}

export interface RouteClickableLink {
  label: string,
  route: string,
  disabled: boolean;
  // menu?: RouteClickableLinkMenu;
  icon?: string;
  style?: { [param: string]: any };
}
