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
  private confirmedTimer: any = null;

  constructor(public bridge: SelectionPanelBridgeService) {
  }
  
  ngOnInit(): void {
    this.bridge.confirmed$.subscribe(confirmed => {
      if (confirmed) {
        // auto-dismiss after brief delay to show recorded indicator
        this.clearConfirmedTimer();
        this.confirmedTimer = setTimeout(() => {
          this.bridge.reset$.next();
        }, 800);
      }
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