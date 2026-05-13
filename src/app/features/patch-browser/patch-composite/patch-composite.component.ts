import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from 'angular-animations';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { EntityStatGroup } from 'src/app/components/shared-atoms/entity-stat-card/entity-stat-card.component';
import { Patch } from 'src/app/models/patch';


@Component({
  selector: 'app-patch-composite',
  templateUrl: './patch-composite.component.html',
  styleUrls: ['./patch-composite.component.scss'],
  animations: [
    fadeInOnEnterAnimation({duration: 200, anchor: 'enter'}),
    fadeOutOnLeaveAnimation({duration: 150, anchor: 'exit'})
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchCompositeComponent {
  @Input() data: Patch;
  @Input() isEditing = false;
  @Input() readonly viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;

  constructor(
    public dataService: PatchDetailDataService
  ) {}

  buildStatRows(stats: { totalCables: number; uniqueModules: number; multiplesCount: number; avgCablesPerModule: number; annotatedConnections: number }): EntityStatGroup[][] {
    return [[{
      title: 'Patch statistics',
      items: [
        { label: 'Cables', value: `${stats.totalCables}`, icon: 'cable' },
        { label: 'Modules', value: `${stats.uniqueModules}`, icon: 'view_module' },
        { label: 'Multiples', value: `${stats.multiplesCount}`, icon: 'call_split', hidden: stats.multiplesCount === 0 },
        { label: 'Cables / module', value: `${stats.avgCablesPerModule}`, icon: 'insights' },
        { label: 'Annotated', value: `${stats.annotatedConnections}`, icon: 'edit_note', hidden: stats.annotatedConnections === 0 }
      ]
    }]];
  }
}
