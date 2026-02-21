import {
  AsyncPipe,
  CommonModule
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PatchConnectionModule } from 'src/app/components/patch-connection/patch-connection.module';
import { SelectionPanelBridgeService } from '../selection-panel-bridge.service';


/**
 * Root-level floating panel outlet — renders at true viewport stacking context.
 *
 * Standalone component; imported directly into AppModule imports array.
 * Reads selection state from SelectionPanelBridgeService (provided in AppModule).
 * Emits reset$/confirm$ actions back into the bridge for PatchDetailDataService to handle.
 */
@Component({
  selector: 'app-selection-panel-outlet',
  templateUrl: './selection-panel-outlet.component.html',
  styleUrls: ['./selection-panel-outlet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    PatchConnectionModule,
  ]
})
export class SelectionPanelOutletComponent implements OnInit, OnDestroy {
  // no auto-dismiss timer — confirmed state is shown but selection is preserved so user can tweak
  private confirmedTimer: any = null;

  constructor(public bridge: SelectionPanelBridgeService) {
  }
  
  ngOnInit(): void {
    // Keep a subscription so change detection sees confirmed$ changes, but do not auto-dismiss.
    this.bridge.confirmed$.subscribe(() => {
      // Intentionally no auto-dismiss — outlet will show the Recorded indicator and allow
      // the user to change one side without losing the other.
    });
  }
  
  ngOnDestroy(): void {
    this.clearConfirmedTimer();
  }
  
  private clearConfirmedTimer() {
    if (this.confirmedTimer) {
      clearTimeout(this.confirmedTimer);
      this.confirmedTimer = null;
    }
  }
}