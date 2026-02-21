import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
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
import { AppStateService } from 'src/app/shared-interproject/app-state.service';


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
export class PatchCompositeComponent implements OnInit {
  @Input() data: Patch;
  @Input() isEditing: boolean = false;
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  
  constructor(
    public appState: AppStateService,
    public dataService: PatchDetailDataService
  ) {}
  
  ngOnInit(): void {
  }
  
}