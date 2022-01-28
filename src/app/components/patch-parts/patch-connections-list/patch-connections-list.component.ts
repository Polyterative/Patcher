import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                 from '@angular/core';
import {
  fadeOutOnLeaveAnimation,
  zoomInOnEnterAnimation
}                                 from 'angular-animations';
import { PatchConnection }        from '../../../models/connection';
import { PatchDetailDataService } from '../patch-detail-data.service';

@Component({
  selector:        'app-patch-connections-list',
  templateUrl:     './patch-connections-list.component.html',
  styleUrls:       ['./patch-connections-list.component.scss'],
  animations:      [
    zoomInOnEnterAnimation(
      {
        duration: 0,
        anchor:   'enter'
      }
    ),
    fadeOutOnLeaveAnimation(
      {
        duration: 500,
        anchor:   'exit'
      }
    )
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchConnectionsListComponent implements OnInit {
  
  @Input() editorConnections: PatchConnection[];
  
  @Input() isEditing: boolean = false;
  
  constructor(
    public dataService: PatchDetailDataService
  ) { }
  
  ngOnInit(): void {
  }
  
}
