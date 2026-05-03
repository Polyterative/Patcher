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
}
