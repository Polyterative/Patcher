import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  fadeOutOnLeaveAnimation,
  zoomInOnEnterAnimation
} from 'angular-animations';
import { PatchConnection } from 'src/app/models/connection';
import { PatchDetailDataService } from '../patch-detail-data.service';


@Component({
  selector: 'app-patch-connections-list',
  templateUrl: './patch-connections-list.component.html',
  styleUrls: ['./patch-connections-list.component.scss'],
  animations: [
    zoomInOnEnterAnimation({
      duration: 0,
      anchor: 'enter'
    }),
    fadeOutOnLeaveAnimation({
      duration: 500,
      anchor: 'exit'
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchConnectionsListComponent implements OnInit {
  
  @Input() editorConnections: PatchConnection[];
  
  @Input() isEditing: boolean = false;
  
  @Input() reverseOrder: boolean = false;
  
  /** Map from instance ID → display label. Passed through to each connection row. */
  @Input() instanceLabelMap: Map<number, string> = new Map();
  
  constructor(
    public dataService: PatchDetailDataService
  ) { }
  
  ngOnInit(): void {
  }
  
}