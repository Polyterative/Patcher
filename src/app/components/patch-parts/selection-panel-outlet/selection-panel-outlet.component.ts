import {
  AsyncPipe,
  CommonModule
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PatchConnectionModule } from 'src/app/components/patch-connection/patch-connection.module';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
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
export class SelectionPanelOutletComponent extends SubManager {
  constructor(public bridge: SelectionPanelBridgeService) {
    super();
  }
}
