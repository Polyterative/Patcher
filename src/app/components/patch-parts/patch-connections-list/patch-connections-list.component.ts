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
import { Subject } from 'rxjs';
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
  
  /**
   * Returns the note-sync subject only when in editing mode.
   * In read-only mode this returns `undefined` so the child component never
   * emits a backend write — even if the template binding is present.
   */
  get effectiveNoteSync$(): Subject<PatchConnection> | undefined {
    return this.isEditing ? this.dataService.requestNoteSync$ : undefined;
  }
  
  constructor(
    public dataService: PatchDetailDataService
  ) { }
  
  ngOnInit(): void {
  }
  
}