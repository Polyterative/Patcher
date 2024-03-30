import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { SubManager } from '../../../directives/subscription-manager';
import { GeneralContextMenuDataService } from './general-context-menu-data.service';
import { MatMenuTrigger } from "@angular/material/menu";


@Component({
  selector:        'app-general-context-menu',
  templateUrl:     './general-context-menu.component.html',
  styleUrls:       ['./general-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
        
        this.dataService.positionData$.next({
          x: event.clientX + 'px',
          y: event.clientY + 'px'
        });
        
        
        this.contextMenu.openMenu();
        
      })
    );
  }
  
}