import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { EntityStatGroup } from 'src/app/components/shared-atoms/entity-stat-card/entity-stat-card.component';
import { PatchConnectionStats } from 'src/app/components/patch-parts/patch-connection-stats.pipe';
import { Patch } from 'src/app/models/patch';


@Component({
  selector: 'app-patch-composite',
  templateUrl: './patch-composite.component.html',
  styleUrls: ['./patch-composite.component.scss'],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('200ms {{ delay }}ms ease', style({opacity: 1}))
      ], { params: { delay: 0 } })
    ]),
    trigger('exit', [
      transition(':leave', [
        animate('150ms ease', style({opacity: 0}))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchCompositeComponent {
  @Input() data: Patch;
  @Input() isEditing = false;
  @Input() readonly viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  @Input() showCoolAction = false;

  constructor(
    public dataService: PatchDetailDataService
  ) {}

  buildStatRows(stats: PatchConnectionStats): EntityStatGroup[][] {
    // Memoized by input reference: the template invokes this on every change-detection
    // cycle (the patch graph tick drives CD constantly), and entity-stat-card tracks
    // groups by identity — a fresh array per cycle destroys/recreates the stat DOM
    // (NG0956). The patchConnectionStats pipe emits a stable object until connections
    // change, so the cache holds across tick-driven cycles.
    if (this.lastStatRows !== null && this.lastStatRowsStats === stats) {
      return this.lastStatRows;
    }

    const rows: EntityStatGroup[][] = [[{
      title: 'Patch statistics',
      items: [
        { label: 'Cables', value: `${stats.totalCables}`, icon: 'cable' },
        { label: 'Modules', value: `${stats.uniqueModules}`, icon: 'view_module' },
        { label: 'Multiples', value: `${stats.multiplesCount}`, icon: 'call_split', hidden: stats.multiplesCount === 0 },
        { label: 'Cables / module', value: `${stats.avgCablesPerModule}`, icon: 'insights' },
        { label: 'Annotated', value: `${stats.annotatedConnections}`, icon: 'edit_note', hidden: stats.annotatedConnections === 0 }
      ]
    }]];
    this.lastStatRowsStats = stats;
    this.lastStatRows = rows;
    return rows;
  }

  private lastStatRowsStats: PatchConnectionStats | null = null;
  private lastStatRows: EntityStatGroup[][] | null = null;
}
