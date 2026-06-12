import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { SubManager } from '../../../directives/subscription-manager';
import { GeneralContextMenuDataService } from './general-context-menu-data.service';
import { MatMenuTrigger, MatMenu, MatMenuContent, MatMenuItem } from "@angular/material/menu";
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';


@Component({
    selector: 'app-general-context-menu',
    templateUrl: './general-context-menu.component.html',
    styleUrls: ['./general-context-menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatMenuTrigger, MatMenu, MatMenuContent, MatMenuItem, MatIcon, AsyncPipe]
})
export class GeneralContextMenuComponent extends SubManager implements OnInit {
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;
  
  constructor(
    public dataService: GeneralContextMenuDataService
  ) {
    super();
  }
  
  ngOnInit(): void {
    this.manageSub(
      this.dataService.open$.subscribe((event) => {
        event.preventDefault();
        
        this.dataService.positionData$.next(this.dataService.clampPosition(event));
        
        
        this.contextMenu.openMenu();
        
      })
    );
  }
  
}
